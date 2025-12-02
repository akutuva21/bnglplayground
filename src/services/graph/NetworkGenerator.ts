// graph/NetworkGenerator.ts
import { SpeciesGraph } from './core/SpeciesGraph';
import { Species } from './core/Species';
import { RxnRule } from './core/RxnRule';
import { Rxn } from './core/Rxn';
import { GraphCanonicalizer } from './core/Canonical';
import { GraphMatcher, MatchMap } from './core/Matcher';
import { countEmbeddingDegeneracy } from './core/degeneracy';
import { Molecule } from './core/Molecule';
import { Component } from './core/Component';

// ENABLE LOGGING FOR DEBUGGING
const shouldLogNetworkGenerator = true;

const debugNetworkLog = (...args: unknown[]) => {
  if (shouldLogNetworkGenerator) {
    console.log(...args);
  }
};

export interface GeneratorOptions {
  maxSpecies: number;
  maxReactions: number;
  maxIterations: number;
  maxAgg: number;
  maxStoich: number;
  checkInterval: number;
  memoryLimit: number;
}

export interface GeneratorProgress {
  species: number;
  reactions: number;
  iteration: number;
  memoryUsed: number;
  timeElapsed: number;
}

export class NetworkGenerator {
  private options: GeneratorOptions;
    // NEW: map Molecule name -> set of species indices that contain that molecule
    private speciesByMoleculeIndex: Map<string, Set<number>> = new Map();
  private startTime: number = 0;
  private lastMemoryCheck: number = 0;
  private aggLimitWarnings = 0;
  private stoichLimitWarnings = 0;
  private speciesLimitWarnings = 0;
  private currentRuleName: string | null = null;

  constructor(options: Partial<GeneratorOptions> = {}) {
    this.options = {
      maxSpecies: 10000,
      maxReactions: 100000,
      maxIterations: 50,
      maxAgg: 500,
      maxStoich: 500,
      checkInterval: 500,
      memoryLimit: 1e9,
      ...options
    };
    this.currentRuleName = null;
  }

  async generate(
    seedSpecies: SpeciesGraph[],
    rules: RxnRule[],
    onProgress?: (progress: GeneratorProgress) => void,
    signal?: AbortSignal
  ): Promise<{ species: Species[]; reactions: Rxn[] }> {

    this.startTime = Date.now();
    this.lastMemoryCheck = this.startTime;
    this.aggLimitWarnings = 0;
    this.stoichLimitWarnings = 0;
    this.speciesLimitWarnings = 0;
    this.currentRuleName = null;

    // Reset inverted index
    this.speciesByMoleculeIndex.clear();

    const speciesMap = new Map<string, Species>();
    const speciesList: Species[] = [];
    const reactionsList: Rxn[] = [];
    const queue: SpeciesGraph[] = [];
    const processedPairs = new Set<string>();  // Track processed (species, rule) pairs
    const ruleProcessedSpecies = new Map<string, Set<string>>(); // Track species processed per rule to prevent runaway generation

    // Initialize rule processed sets
    for (const rule of rules) {
      ruleProcessedSpecies.set(rule.name, new Set<string>());
    }

    // Initialize with seed species
    for (const sg of seedSpecies) {
      const canonical = GraphCanonicalizer.canonicalize(sg);
      if (!speciesMap.has(canonical)) {
        const species = new Species(sg, speciesList.length);
        speciesMap.set(canonical, species);
        speciesList.push(species);
          // index seed species
          // indexSpecies will add entries to speciesByMoleculeIndex
          this.indexSpecies(species);
        queue.push(sg);
      }
    }
    


    let iteration = 0;

    while (queue.length > 0 && iteration < this.options.maxIterations) {
      if (signal?.aborted) {
        throw new DOMException('Network generation cancelled', 'AbortError');
      }
      await this.checkResourceLimits(signal);
      iteration++;

      const currentSpecies = queue.shift()!;
      const currentCanonical = GraphCanonicalizer.canonicalize(currentSpecies);
      const currentSpeciesObj = speciesMap.get(currentCanonical)!;

      if (shouldLogNetworkGenerator) {
        debugNetworkLog(
          `[NetworkGenerator] Iter ${iteration}, Species ${currentSpeciesObj.index}: ${currentSpecies
            .toString()
            .slice(0, 100)}`
        );
      }

      // Apply each rule to current species
      for (const rule of rules) {
        if (signal?.aborted) {
          throw new DOMException('Network generation cancelled', 'AbortError');
        }

        this.currentRuleName = rule.name;
        
        // Skip if already processed this (species, rule) pair
        const pairKey = `${currentCanonical}::${rule.name}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Skip if this species was already processed for this rule (prevents runaway generation)
        const ruleProcessed = ruleProcessedSpecies.get(rule.name)!;
        if (ruleProcessed.has(currentCanonical)) continue;
        ruleProcessed.add(currentCanonical);

        if (rule.reactants.length === 1) {
          // Unimolecular rule
          await this.applyUnimolecularRule(
            rule,
            currentSpeciesObj,
            speciesMap,
            speciesList,
            queue,
            reactionsList,
            signal
          );
        } else if (rule.reactants.length > 1) {
          // Bimolecular rule - only try with current species as FIRST reactant
          await this.applyBimolecularRule(
            rule,
            currentSpeciesObj,
            speciesList,
            speciesMap,
            speciesList,
            queue,
            reactionsList,
            processedPairs,
            signal
          );
        }

        if (reactionsList.length >= this.options.maxReactions) {
          throw this.buildLimitError(
            `Reached max reactions limit (${this.options.maxReactions}) while applying rule "${this.currentRuleName ?? 'unknown'}"`
          );
        }
    }

    this.currentRuleName = null;

    if (onProgress && iteration % 10 === 0) {
        onProgress({
          species: speciesList.length,
          reactions: reactionsList.length,
          iteration,
          memoryUsed: (performance as any).memory?.usedJSHeapSize || 0,
          timeElapsed: Date.now() - this.startTime
        });
      }
    }

    return { species: speciesList, reactions: reactionsList };
  }

  private checkConstraints(rule: RxnRule, matchedSpecies: Species[]): boolean {
    // Check exclude_reactants
    for (const constraint of rule.excludeReactants) {
      const species = matchedSpecies[constraint.reactantIndex];
      if (!species) continue;
      // If species matches the constraint pattern, reject
      if (GraphMatcher.matchesPattern(constraint.pattern, species.graph)) {
        if (shouldLogNetworkGenerator) {
             debugNetworkLog(`[checkConstraints] Rule ${rule.name} excluded by pattern ${constraint.pattern.toString()} on reactant ${constraint.reactantIndex}`);
        }
        return false;
      }
    }

    // Check include_reactants
    for (const constraint of rule.includeReactants) {
      const species = matchedSpecies[constraint.reactantIndex];
      if (!species) continue;
      // If species does NOT match the constraint pattern, reject
      if (!GraphMatcher.matchesPattern(constraint.pattern, species.graph)) {
         if (shouldLogNetworkGenerator) {
             debugNetworkLog(`[checkConstraints] Rule ${rule.name} failed inclusion pattern ${constraint.pattern.toString()} on reactant ${constraint.reactantIndex}`);
        }
        return false;
      }
    }

    return true;
  }

  /**
   * FIX: Apply unimolecular rule (A -> B + C)
   */
  private async applyUnimolecularRule(
    rule: RxnRule,
    reactantSpecies: Species,
    speciesMap: Map<string, Species>,
    speciesList: Species[],
    queue: SpeciesGraph[],
    reactionsList: Rxn[],
    signal?: AbortSignal
  ): Promise<void> {
    const pattern = rule.reactants[0];

    if (!reactantSpecies.graph.adjacencyBitset) {
      reactantSpecies.graph.buildAdjacencyBitset();
    }

    const matches = GraphMatcher.findAllMaps(pattern, reactantSpecies.graph);

    for (const match of matches) {
      if (signal?.aborted) {
        throw new DOMException('Network generation cancelled', 'AbortError');
      }

      const degeneracy = countEmbeddingDegeneracy(pattern, reactantSpecies.graph, match);

      // Check constraints
      if (!this.checkConstraints(rule, [reactantSpecies])) {
        continue;
      }

      // Apply transformation
      const products = this.applyRuleTransformation(
        rule,
        [rule.reactants[0]],
        [reactantSpecies.graph],
        [match]
      );
      if (!products || !this.validateProducts(products)) continue;

      // Add all products to network
      const productSpeciesIndices: number[] = [];
      for (const product of products) {
        const productSpecies = this.addOrGetSpecies(product, speciesMap, speciesList, queue, signal);
        productSpeciesIndices.push(productSpecies.index);
      }

      // Create reaction
      const effectiveRate = rule.rateConstant / Math.max(degeneracy, 1);
      const rxn = new Rxn(
        [reactantSpecies.index],
        productSpeciesIndices,
        effectiveRate,
        rule.name,
        { degeneracy }
      );

      if (!this.isDuplicateReaction(rxn, reactionsList)) {
        reactionsList.push(rxn);
      }
    }
  }

  /**
   * FIX: Apply bimolecular rule (A + B -> C)
   * Only apply when current species is the FIRST reactant to avoid double-counting
   */
  private async applyBimolecularRule(
    rule: RxnRule,
    reactant1Species: Species,
    allSpecies: Species[],
    speciesMap: Map<string, Species>,
    speciesList: Species[],
    queue: SpeciesGraph[],
    reactionsList: Rxn[],
    processedPairs: Set<string>,
    signal?: AbortSignal
  ): Promise<void> {
    const patternCount = rule.reactants.length;
    if (patternCount < 2) {
      return;
    }

    const pattern1 = rule.reactants[0];
    const pattern2 = rule.reactants[1];

    if (!reactant1Species.graph.adjacencyBitset) {
      reactant1Species.graph.buildAdjacencyBitset();
    }

    const allowIntramolecular = rule.allowsIntramolecular ?? false;

    const shareTargets = (a: MatchMap, b: MatchMap): boolean => {
      const mappedA = new Set(a.moleculeMap.values());
      for (const mol of b.moleculeMap.values()) {
        if (mappedA.has(mol)) {
          return true;
        }
      }
      return false;
    };

    const getDegeneracy = (
      cache: WeakMap<MatchMap, number>,
      match: MatchMap,
      patternGraph: SpeciesGraph,
      speciesGraph: SpeciesGraph
    ): number => {
      const cached = cache.get(match);
      if (cached !== undefined) {
        return cached;
      }
      const computed = countEmbeddingDegeneracy(patternGraph, speciesGraph, match);
      cache.set(match, computed);
      return computed;
    };

    for (const firstIdx of [0, 1]) {
      const firstPattern = firstIdx === 0 ? pattern1 : pattern2;
      const secondIdx = firstIdx === 0 ? 1 : 0;
      const secondPattern = secondIdx === 0 ? pattern1 : pattern2;

      const matchesFirst = GraphMatcher.findAllMaps(firstPattern, reactant1Species.graph);
      if (matchesFirst.length === 0) {
        continue;
      }
      const firstDegeneracyCache = new WeakMap<MatchMap, number>();

      // Candidate optimization: choose only species that contain the molecules required by secondPattern
      const requiredMols = secondPattern.molecules.map((m) => m.name);
      let candidateIndices: Set<number> | null = null;

      if (requiredMols.length === 0) {
        candidateIndices = new Set(allSpecies.map((s) => s.index));
      } else {
        for (const molName of requiredMols) {
          const set = this.speciesByMoleculeIndex.get(molName);
          if (!set) {
            candidateIndices = null;
            break;
          }
          if (!candidateIndices) {
            candidateIndices = new Set(set);
          } else {
            // intersect
            const next = new Set<number>();
            for (const id of candidateIndices) {
              if (set.has(id)) next.add(id);
            }
            candidateIndices = next;
          }
        }
      }

      if (!candidateIndices || candidateIndices.size === 0) continue;

      for (const idx of candidateIndices) {
        const reactant2Species = allSpecies[idx];
        if (signal?.aborted) {
          throw new DOMException('Network generation cancelled', 'AbortError');
        }

        if (!reactant2Species.graph.adjacencyBitset) {
          reactant2Species.graph.buildAdjacencyBitset();
        }

        const matchesSecond = GraphMatcher.findAllMaps(secondPattern, reactant2Species.graph);
        if (matchesSecond.length === 0) {
          continue;
        }
        const secondDegeneracyCache = new WeakMap<MatchMap, number>();

        const keyA = Math.min(reactant1Species.index, reactant2Species.index);
        const keyB = Math.max(reactant1Species.index, reactant2Species.index);
        const pairKey = `${keyA}::${keyB}::${rule.name}`;
        if (processedPairs.has(pairKey)) {
          continue;
        }

        const identicalSpecies = reactant1Species.index === reactant2Species.index;

        let producedReaction = false;

        for (const matchFirst of matchesFirst) {
          const firstDegeneracy = getDegeneracy(
            firstDegeneracyCache,
            matchFirst,
            firstPattern,
            reactant1Species.graph
          );

          for (const matchSecond of matchesSecond) {
            // FIX: Only check shareTargets if we are NOT reacting two copies of the same species
            if (
              !allowIntramolecular &&
              reactant1Species !== reactant2Species && 
              shareTargets(matchFirst, matchSecond)
            ) {
               // This block is actually unreachable if we assume S+S always means two instances.
            }

            const secondDegeneracy = getDegeneracy(
              secondDegeneracyCache,
              matchSecond,
              secondPattern,
              reactant2Species.graph
            );

            // Check constraints
            const matchedSpecies = firstIdx === 0 
                ? [reactant1Species, reactant2Species] 
                : [reactant2Species, reactant1Species];

            if (!this.checkConstraints(rule, matchedSpecies)) {
                continue;
            }

            const reactantPatternsOrdered = [firstPattern, secondPattern];
            const reactantGraphsOrdered = [reactant1Species.graph, reactant2Species.graph];
            const matchesOrdered = [matchFirst, matchSecond];

            const products = this.applyRuleTransformation(
              rule,
              reactantPatternsOrdered,
              reactantGraphsOrdered,
              matchesOrdered
            );
            if (!products || !this.validateProducts(products)) {
              continue;
            }

            const productSpeciesIndices: number[] = [];
            for (const product of products) {
              const productSpecies = this.addOrGetSpecies(product, speciesMap, speciesList, queue, signal);
              productSpeciesIndices.push(productSpecies.index);
            }

            const totalDegeneracy = Math.max(firstDegeneracy * secondDegeneracy, 1);
            const effectiveRate = rule.rateConstant / totalDegeneracy;
            const propensityFactor = identicalSpecies ? 0.5 : 1;

            const reactantIndices = [reactant1Species.index, reactant2Species.index];
            const rxn = new Rxn(
              reactantIndices,
              productSpeciesIndices,
              effectiveRate,
              rule.name,
              {
                degeneracy: totalDegeneracy,
                propensityFactor
              }
            );

            if (!this.isDuplicateReaction(rxn, reactionsList)) {
              reactionsList.push(rxn);
              producedReaction = true;
            }

            if (signal?.aborted) {
              throw new DOMException('Network generation cancelled', 'AbortError');
            }
          }
        }

        if (producedReaction) {
          processedPairs.add(pairKey);
        }
      }
    }
  }

  /**
   * Apply rule transformation by cloning reactants and modifying them
   */
  private applyRuleTransformation(
    rule: RxnRule,
    reactantPatterns: SpeciesGraph[],
    reactantGraphs: SpeciesGraph[],
    matches: MatchMap[]
  ): SpeciesGraph[] | null {
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(
        `[applyTransformation] Rule ${rule.name}, ${reactantGraphs.length} reactants -> ${rule.products.length} products`
      );
    }

    // 1. Clone and merge reactants into a single "reaction complex"
    const complex = new SpeciesGraph();
    const reactantOffsets: number[] = [];
    
    for (const rg of reactantGraphs) {
        reactantOffsets.push(complex.merge(rg));
    }

    // 2. Map Reactant Pattern Molecules to Complex Molecules
    const patternToComplexMap = new Map<string, number>(); // "patternIdx.molIdx" -> complexMolIdx

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const offset = reactantOffsets[i];
        for (const [patMolIdx, targetMolIdx] of match.moleculeMap.entries()) {
            patternToComplexMap.set(`${i}.${patMolIdx}`, targetMolIdx + offset);
        }
    }

    // 3. Map LHS Pattern Molecules to RHS Pattern Molecules
    const lhsMolsByType = new Map<string, number[]>();
    reactantPatterns.forEach((pat, patIdx) => {
        pat.molecules.forEach((mol, molIdx) => {
            if (!lhsMolsByType.has(mol.name)) lhsMolsByType.set(mol.name, []);
        });
    });

    const rhsToLhsMap = new Map<string, string>(); // "rhsPatIdx.molIdx" -> "lhsPatIdx.molIdx"
    const lhsUsed = new Set<string>();

    const lhsFlat: { key: string, name: string }[] = [];
    reactantPatterns.forEach((pat, patIdx) => {
        pat.molecules.forEach((mol, molIdx) => {
            lhsFlat.push({ key: `${patIdx}.${molIdx}`, name: mol.name });
        });
    });

    const rhsFlat: { key: string, name: string }[] = [];
    rule.products.forEach((pat, patIdx) => {
        pat.molecules.forEach((mol, molIdx) => {
            rhsFlat.push({ key: `${patIdx}.${molIdx}`, name: mol.name });
        });
    });

    for (const rhsMol of rhsFlat) {
        const match = lhsFlat.find(lhs => lhs.name === rhsMol.name && !lhsUsed.has(lhs.key));
        if (match) {
            rhsToLhsMap.set(rhsMol.key, match.key);
            lhsUsed.add(match.key);
        }
    }

    const deletedLhsKeys = lhsFlat.filter(lhs => !lhsUsed.has(lhs.key)).map(l => l.key);

    // 4. Disconnect Deleted Molecules (CRITICAL STEP)
    const complexMolsToRemove = new Set<number>();
    for (const delKey of deletedLhsKeys) {
        const complexIdx = patternToComplexMap.get(delKey);
        if (complexIdx !== undefined) {
            complexMolsToRemove.add(complexIdx);
            const mol = complex.molecules[complexIdx];
            for (let c = 0; c < mol.components.length; c++) {
                complex.deleteBond(complexIdx, c);
            }
        }
    }

    // 5. Apply Operations (Additions, State Changes, Wiring)
    const rhsToComplexMap = new Map<string, number>(); // "rhsPatIdx.molIdx" -> complexMolIdx

    // First pass: Ensure all RHS molecules exist in Complex
    for (const rhsMol of rhsFlat) {
        const lhsKey = rhsToLhsMap.get(rhsMol.key);
        let complexIdx: number;

        if (lhsKey) {
            complexIdx = patternToComplexMap.get(lhsKey)!;
        } else {
            const [patIdx, molIdx] = rhsMol.key.split('.').map(Number);
            const templateMol = rule.products[patIdx].molecules[molIdx];
            const newMol = templateMol.clone();
            newMol.components.forEach(c => c.edges.clear());
            complexIdx = complex.molecules.length;
            complex.molecules.push(newMol);
        }
        rhsToComplexMap.set(rhsMol.key, complexIdx);
    }

    // Second pass: Update States, Compartments, and Explicit Unbinding
    for (const rhsMol of rhsFlat) {
        const [patIdx, molIdx] = rhsMol.key.split('.').map(Number);
        const rhsPatternMol = rule.products[patIdx].molecules[molIdx];
        const complexIdx = rhsToComplexMap.get(rhsMol.key)!;
        const complexMol = complex.molecules[complexIdx];

        if (rhsPatternMol.compartment) {
            complexMol.compartment = rhsPatternMol.compartment;
        }

        for (const rhsComp of rhsPatternMol.components) {
            const complexComp = complexMol.components.find(c => c.name === rhsComp.name);
            if (!complexComp) {
                continue;
            }

            if (rhsComp.state) {
                complexComp.state = rhsComp.state;
            }

            if (rhsComp.edges.size === 0 && rhsComp.wildcard === undefined) {
                const compIdx = complexMol.components.indexOf(complexComp);
                complex.deleteBond(complexIdx, compIdx);
            }
        }
    }

    // Third pass: Wire bonds specified in RHS
    const bondRegistry = new Map<number, { complexIdx: number, compIdx: number }>();

    for (const rhsMol of rhsFlat) {
        const [patIdx, molIdx] = rhsMol.key.split('.').map(Number);
        const rhsPatternMol = rule.products[patIdx].molecules[molIdx];
        const complexIdx = rhsToComplexMap.get(rhsMol.key)!;
        const complexMol = complex.molecules[complexIdx];

        for (const rhsComp of rhsPatternMol.components) {
            for (const label of rhsComp.edges.keys()) {
                if (typeof label === 'number') {
                    const compIdx = complexMol.components.findIndex(c => c.name === rhsComp.name);
                    if (bondRegistry.has(label)) {
                        const partner = bondRegistry.get(label)!;
                        complex.addBond(partner.complexIdx, partner.compIdx, complexIdx, compIdx);
                    } else {
                        bondRegistry.set(label, { complexIdx, compIdx });
                    }
                }
            }
        }
    }

    // 6. Cleanup Deleted Molecules
    if (complexMolsToRemove.size > 0) {
        const newMols: Molecule[] = [];
        const oldToNewIdx = new Map<number, number>();
        
        for (let i = 0; i < complex.molecules.length; i++) {
            if (!complexMolsToRemove.has(i)) {
                oldToNewIdx.set(i, newMols.length);
                newMols.push(complex.molecules[i]);
            }
        }
        
        const newAdjacency = new Map<string, string>();
        for (const [k, v] of complex.adjacency.entries()) {
            const [m1, c1] = k.split('.').map(Number);
            const [m2, c2] = v.split('.').map(Number);
            
            if (oldToNewIdx.has(m1) && oldToNewIdx.has(m2)) {
                const nm1 = oldToNewIdx.get(m1)!;
                const nm2 = oldToNewIdx.get(m2)!;
                newAdjacency.set(`${nm1}.${c1}`, `${nm2}.${c2}`);
            }
        }
        
        complex.molecules = newMols;
        complex.adjacency = newAdjacency;
    }

    // 7. Split into connected components
    const products = complex.split();

    if (shouldLogNetworkGenerator) {
      debugNetworkLog(
        `[applyTransformation] Result: ${products
          .map((p) => p.toString().slice(0, 150))
          .join(' | ')}`
      );
    }

    return products;
  }

  /**
   *
   */
  private buildProductGraph(
    pattern: SpeciesGraph,
    reactantPatterns: SpeciesGraph[],
    reactantGraphs: SpeciesGraph[],
    matches: MatchMap[]
  ): SpeciesGraph | null {
      // Deprecated in favor of applyRuleTransformation
      return null;
  }

  private cloneMoleculeStructure(source: Molecule): Molecule {
    const clonedComponents = source.components.map((component) => {
      const cloned = new Component(component.name, [...component.states]);
      cloned.state = component.state;
      cloned.wildcard = component.wildcard;
      return cloned;
    });

    const clone = new Molecule(
      source.name,
      clonedComponents,
      source.compartment,
      source.hasExplicitEmptyComponentList
    );
    clone.label = source.label;
    return clone;
  }

  /**
   * Add species to network or retrieve existing
   */
  private addOrGetSpecies(
    graph: SpeciesGraph,
    speciesMap: Map<string, Species>,
    speciesList: Species[],
    queue: SpeciesGraph[],
    signal?: AbortSignal
  ): Species {
    const canonical = GraphCanonicalizer.canonicalize(graph);

    if (speciesMap.has(canonical)) {
      return speciesMap.get(canonical)!;
    }

    if (speciesList.length >= this.options.maxSpecies) {
      this.warnSpeciesLimit();
      throw this.buildLimitError(
        `Max species limit reached (${this.options.maxSpecies}) while applying rule "${this.currentRuleName ?? 'unknown'}"`
      );
    }

    const species = new Species(graph, speciesList.length);
    speciesMap.set(canonical, species);
    speciesList.push(species);
    queue.push(graph);

    if (signal?.aborted) {
      throw new DOMException('Network generation cancelled', 'AbortError');
    }

    // Index the newly created species by molecule type for faster candidate lookup
    this.indexSpecies(species);

    return species;
  }

  /**
   * Add a species' molecules to the inverted index for quick lookup when matching
   */
  private indexSpecies(species: Species): void {
    for (const m of species.graph.molecules) {
      const set = this.speciesByMoleculeIndex.get(m.name) ?? new Set<number>();
      set.add(species.index);
      this.speciesByMoleculeIndex.set(m.name, set);
    }
  }

  /**
   * Check if reaction already exists
   */
  private isDuplicateReaction(rxn: Rxn, reactionsList: Rxn[]): boolean {
    const key = JSON.stringify({
      reactants: rxn.reactants.slice().sort(),
      products: rxn.products.slice().sort()
    });

    return reactionsList.some(existing => {
      const existingKey = JSON.stringify({
        reactants: existing.reactants.slice().sort(),
        products: existing.products.slice().sort()
      });
      return key === existingKey;
    });
  }

  private async checkResourceLimits(signal?: AbortSignal): Promise<void> {
    const now = Date.now();

    if (signal?.aborted) {
      throw new Error('Network generation aborted by user');
    }

    if (now - this.lastMemoryCheck > this.options.checkInterval) {
      this.lastMemoryCheck = now;

      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > this.options.memoryLimit) {
        throw new Error(
          `Memory limit exceeded: ${(memory.usedJSHeapSize / 1e6).toFixed(0)}MB > ` +
          `${(this.options.memoryLimit / 1e6).toFixed(0)}MB`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  private validateProducts(products: SpeciesGraph[]): boolean {
    for (const product of products) {
      if (product.molecules.length > this.options.maxAgg) {
        this.warnAggLimit(product.molecules.length);
        throw this.buildLimitError(
          `Species exceeds max complex size (${this.options.maxAgg}); rule "${this.currentRuleName ?? 'unknown'}" likely produces runaway polymerization.`
        );
      }

      const typeCounts = new Map<string, number>();
      for (const mol of product.molecules) {
        typeCounts.set(mol.name, (typeCounts.get(mol.name) || 0) + 1);
      }
      for (const [typeName, count] of typeCounts.entries()) {
        if (count > this.options.maxStoich) {
          this.warnStoichLimit(count);
          throw this.buildLimitError(
            `Species exceeds max stoichiometry (${this.options.maxStoich}) for molecule type "${typeName}" under rule "${this.currentRuleName ?? 'unknown'}".`
          );
        }
      }

      for (const mol of product.molecules) {
        for (const comp of mol.components) {
          if (comp.wildcard === '+' && comp.edges.size === 0) {
            console.warn('[validateProducts] Component marked !+ but no bond present; rejecting product');
            return false;
          }
          if (comp.wildcard === '?' && comp.edges.size > 0) {
            console.warn('[validateProducts] Component marked !? but bond detected; rejecting product');
            return false;
          }
        }
      }
    }
    return true;
  }

  private warnAggLimit(count: number) {
    if (this.aggLimitWarnings < 5) {
      console.warn(`Species exceeds max_agg: ${count}`);
    } else if (this.aggLimitWarnings === 5) {
      console.warn('Species exceeds max_agg: additional occurrences suppressed');
    }
    this.aggLimitWarnings++;
  }

  private warnStoichLimit(count: number) {
    if (this.stoichLimitWarnings < 5) {
      console.warn(`Species exceeds max_stoich: ${count}`);
    } else if (this.stoichLimitWarnings === 5) {
      console.warn('Species exceeds max_stoich: additional occurrences suppressed');
    }
    this.stoichLimitWarnings++;
  }

  private warnSpeciesLimit() {
    if (this.speciesLimitWarnings < 5) {
      console.warn('Max species limit reached');
    } else if (this.speciesLimitWarnings === 5) {
      console.warn('Max species limit reached: additional occurrences suppressed');
    }
    this.speciesLimitWarnings++;
  }

  private buildLimitError(message: string): Error {
    const err = new Error(message);
    err.name = 'NetworkGenerationLimitError';
    return err;
  }
}