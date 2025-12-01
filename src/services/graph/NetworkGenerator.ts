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

const shouldLogNetworkGenerator =
  typeof process !== 'undefined' &&
  typeof process.env !== 'undefined' &&
  process.env.DEBUG_NETWORK_GENERATOR === 'true';

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
        // Debug: Print rule dispatch info (reactant count and types)
        if (shouldLogNetworkGenerator) {
          try {
            const reactantInfo = (rule.reactants || [])
              .map((r: any, i: number) => {
                try {
                  return `${i}:${r?.toString?.() ?? String(r)}[${
                    r && typeof r === 'object' && r.constructor ? r.constructor.name : typeof r
                  }]`;
                } catch (e) {
                  return `${i}:<unserializable>`;
                }
              })
              .join(' | ');
            debugNetworkLog(
              `[NetworkGenerator] Dispatching rule: ${rule.name}, Reactants count: ${rule.reactants?.length ?? 0} -> ${reactantInfo}`
            );
          } catch (e) {
            debugNetworkLog('[NetworkGenerator] Dispatching rule: <error reading rule>');
          }
        }

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
          if (shouldLogNetworkGenerator) {
            debugNetworkLog(
              `[applyUnimolecularRule] Applying unimolecular rule with reactant pattern: ${rule.reactants[0].toString()}`
            );
          }
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
          if (shouldLogNetworkGenerator) {
            debugNetworkLog(
              `[applyBimolecularRule] Applying bimolecular rule with patterns: ${rule.reactants[0].toString()} + ${rule.reactants[1].toString()}`
            );
          }
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
            if (
              !allowIntramolecular &&
              reactant1Species === reactant2Species &&
              shareTargets(matchFirst, matchSecond)
            ) {
              if (shouldLogNetworkGenerator) {
                debugNetworkLog(
                  '[applyBimolecularRule] Skipping intramolecular mapping (rule forbids it)'
                );
              }
              continue;
            }

            const secondDegeneracy = getDegeneracy(
              secondDegeneracyCache,
              matchSecond,
              secondPattern,
              reactant2Species.graph
            );

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
   * FIX: Properly apply rule transformation
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

    if (rule.products.length === 0) {
      console.warn(`No products not supported`);
      return null;
    }

    const productGraphs: SpeciesGraph[] = [];

    for (const productPattern of rule.products) {
      const productGraph = this.buildProductGraph(
        productPattern,
        reactantPatterns,
        reactantGraphs,
        matches
      );

      if (!productGraph) {
        if (shouldLogNetworkGenerator) {
          debugNetworkLog('[applyTransformation] Failed to construct product graph; treating as no-op');
        }
        return null;
      }

      productGraphs.push(productGraph);
    }

    if (shouldLogNetworkGenerator) {
      debugNetworkLog(
        `[applyTransformation] Result: ${productGraphs
          .map((p) => p.toString().slice(0, 150))
          .join(' | ')}`
      );
    }

    return productGraphs;
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
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(`[buildProductGraph] Building from pattern ${pattern.toString()}`);
    }

    const productGraph = new SpeciesGraph();
    const patternToProductMol = new Map<number, number>();
    const componentIndexMap = new Map<string, number>(); // key `${pMolIdx}:${pCompIdx}`
    const usedReactantMolecules = new Set<string>();

    // Helper to attempt mapping a pattern molecule to an existing reactant molecule
  const assignFromReactants = (pMolIdx: number, pMol: Molecule): boolean => {
      for (let r = 0; r < reactantPatterns.length; r++) {
        const match = matches[r];
        if (!match) continue;

        const reactantPattern = reactantPatterns[r];

        for (const [patternMolIdx, targetMolIdx] of match.moleculeMap.entries()) {
          const templateMol = reactantPattern.molecules[patternMolIdx];
          if (templateMol.name !== pMol.name) {
            continue;
          }

          const key = `${r}:${targetMolIdx}`;
          if (usedReactantMolecules.has(key)) {
            continue;
          }

          const sourceMol = reactantGraphs[r].molecules[targetMolIdx];
          const clone = this.cloneMoleculeStructure(sourceMol);
          const newIdx = productGraph.molecules.length;
          productGraph.molecules.push(clone);
          patternToProductMol.set(pMolIdx, newIdx);
          usedReactantMolecules.add(key);

          if (shouldLogNetworkGenerator) {
            debugNetworkLog(
              `[buildProductGraph] Pattern mol ${pMolIdx} (${pMol.name}) mapped to reactant ${r} molecule ${targetMolIdx}`
            );
          }

          return true;
        }
      }

      return false;
    };

    // Step 1: instantiate molecules for the product graph
    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const pMol = pattern.molecules[pMolIdx];

      const found = assignFromReactants(pMolIdx, pMol);

      if (!found) {
        const clone = this.cloneMoleculeStructure(pMol);
        const newIdx = productGraph.molecules.length;
        productGraph.molecules.push(clone);
        patternToProductMol.set(pMolIdx, newIdx);

        if (shouldLogNetworkGenerator) {
          debugNetworkLog(
            `[buildProductGraph] Pattern mol ${pMolIdx} (${pMol.name}) created as new molecule at index ${newIdx}`
          );
        }
      }
    }

    if (patternToProductMol.size === 0) {
      console.warn('[buildProductGraph] Unable to map any product molecules');
      return null;
    }

    // Step 2: align components and apply state changes
    const usedComponentIndicesPerMol = new Map<number, Set<number>>();

    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const productMolIdx = patternToProductMol.get(pMolIdx);
      if (productMolIdx === undefined) {
        continue;
      }

      const patternMol = pattern.molecules[pMolIdx];
      const productMol = productGraph.molecules[productMolIdx];
      const usedSet = usedComponentIndicesPerMol.get(productMolIdx) ?? new Set<number>();

      for (let pCompIdx = 0; pCompIdx < patternMol.components.length; pCompIdx++) {
        const pComp = patternMol.components[pCompIdx];

        let candidateIdx = -1;
        for (let idx = 0; idx < productMol.components.length; idx++) {
          if (usedSet.has(idx)) continue;
          if (productMol.components[idx].name !== pComp.name) continue;
          candidateIdx = idx;
          break;
        }

        if (candidateIdx === -1) {
          candidateIdx = productMol.components.findIndex((comp) => comp.name === pComp.name);
        }

        if (candidateIdx === -1) {
          const newComponent = new Component(pComp.name, [...pComp.states]);
          newComponent.state = pComp.state;
          newComponent.wildcard = pComp.wildcard;
          candidateIdx = productMol.components.length;
          productMol.components.push(newComponent);
        }

        usedSet.add(candidateIdx);
        usedComponentIndicesPerMol.set(productMolIdx, usedSet);
        componentIndexMap.set(`${pMolIdx}:${pCompIdx}`, candidateIdx);

        if (pComp.state && pComp.state !== '?') {
          productMol.components[candidateIdx].state = pComp.state;
        }
      }
    }

    // Step 3: create bonds according to the pattern
    const bondEndpoints = new Map<number, Array<{ pMolIdx: number; pCompIdx: number }>>();

    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const patternMol = pattern.molecules[pMolIdx];
      for (let pCompIdx = 0; pCompIdx < patternMol.components.length; pCompIdx++) {
        const pComp = patternMol.components[pCompIdx];
        for (const [bondLabel] of pComp.edges.entries()) {
          if (!bondEndpoints.has(bondLabel)) {
            bondEndpoints.set(bondLabel, []);
          }
          bondEndpoints.get(bondLabel)!.push({ pMolIdx, pCompIdx });
        }
      }
    }

    for (const [bondLabel, endpoints] of bondEndpoints.entries()) {
      if (endpoints.length !== 2) {
        console.warn(
          `[buildProductGraph] Bond label ${bondLabel} has ${endpoints.length} endpoints, expected 2`
        );
        continue;
      }

      const [end1, end2] = endpoints;
      const molIdx1 = patternToProductMol.get(end1.pMolIdx);
      const molIdx2 = patternToProductMol.get(end2.pMolIdx);
      const compIdx1 = componentIndexMap.get(`${end1.pMolIdx}:${end1.pCompIdx}`);
      const compIdx2 = componentIndexMap.get(`${end2.pMolIdx}:${end2.pCompIdx}`);

      if (
        typeof molIdx1 !== 'number' ||
        typeof molIdx2 !== 'number' ||
        typeof compIdx1 !== 'number' ||
        typeof compIdx2 !== 'number'
      ) {
        console.warn(
          `[buildProductGraph] Incomplete bond mapping, skipping bond ${bondLabel} ` +
            `(molIdx1=${String(molIdx1)}, molIdx2=${String(molIdx2)}, compIdx1=${String(compIdx1)}, compIdx2=${String(compIdx2)})`
        );
        continue;
      }

      productGraph.addBond(molIdx1, compIdx1, molIdx2, compIdx2, bondLabel);
    }

    return productGraph;
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