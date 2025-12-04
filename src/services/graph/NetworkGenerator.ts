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
    const ruleProcessedSpecies = new Map<number, Set<string>>(); // Track species processed per rule (by rule index) to prevent runaway generation

    // Initialize rule processed sets using rule index as key
    for (let i = 0; i < rules.length; i++) {
      ruleProcessedSpecies.set(i, new Set<string>());
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
    
    // Handle synthesis rules (0 -> X) - add products directly
    // These are zero-order reactions that produce species regardless of existing species
    for (const rule of rules) {
      if (rule.reactants.length === 0 && rule.products.length > 0) {
        debugNetworkLog(`[NetworkGenerator] Processing synthesis rule: ${rule.name}`);
        
        // Add each product species if not already present
        for (const productGraph of rule.products) {
          const productCanonical = GraphCanonicalizer.canonicalize(productGraph);
          if (!speciesMap.has(productCanonical)) {
            const productSpecies = new Species(productGraph, speciesList.length);
            speciesMap.set(productCanonical, productSpecies);
            speciesList.push(productSpecies);
            this.indexSpecies(productSpecies);
            queue.push(productGraph);
          }
        }
        
        // Create the synthesis reaction (no reactants -> products)
        const productIndices = rule.products.map(pg => {
          const canonical = GraphCanonicalizer.canonicalize(pg);
          return speciesMap.get(canonical)!.index;
        });
        
        const rxn = new Rxn([], productIndices, rule.rateConstant, rule.name);
        reactionsList.push(rxn);
        
        debugNetworkLog(`[NetworkGenerator] Added synthesis reaction: 0 -> [${productIndices.join(', ')}]`);
      }
    }

    let iteration = 0;

    try {
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
      for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
        const rule = rules[ruleIdx];
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
              `[NetworkGenerator] Dispatching rule ${ruleIdx}: ${rule.name}, Reactants count: ${rule.reactants?.length ?? 0} -> ${reactantInfo}`
            );
          } catch (e) {
            debugNetworkLog('[NetworkGenerator] Dispatching rule: <error reading rule>');
          }
        }

        // Skip if already processed this (species, rule) pair
        const pairKey = `${currentCanonical}::${ruleIdx}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Skip if this species was already processed for this rule (prevents runaway generation)
        const ruleProcessed = ruleProcessedSpecies.get(ruleIdx)!;
        if (ruleProcessed.has(currentCanonical)) continue;
        ruleProcessed.add(currentCanonical);

        if (rule.reactants.length === 0) {
          // Synthesis rule (0 -> X): Skip in network generation loop
          // Synthesis rules are zero-order and don't depend on existing species
          // They are handled separately by adding products directly
          continue;
        } else if (rule.reactants.length === 1) {
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
    } catch (e: any) {
      // Catch limit errors and return partial results
      if (e.name === 'NetworkGenerationLimitError') {
        console.warn(`Network generation limit reached: ${e.message}`);
        // Continue and return partial results
      } else {
        throw e;
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
      
      // products === null means transformation failed (e.g., no match)
      // products === [] (empty array) is valid for degradation rules
      if (products === null || !this.validateProducts(products)) continue;

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

    // Check if matched molecules from two matches are in the same connected component
    const inSameConnectedComponent = (a: MatchMap, b: MatchMap, graph: SpeciesGraph): boolean => {
      // Get any molecule from match a
      const molA = a.moleculeMap.values().next().value;
      // Get any molecule from match b
      const molB = b.moleculeMap.values().next().value;
      
      if (molA === undefined || molB === undefined) return false;
      
      // BFS to check connectivity
      const visited = new Set<number>();
      const queue = [molA];
      visited.add(molA);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === molB) return true;
        
        // Find connected molecules
        for (const [key, partnerKey] of graph.adjacency.entries()) {
          const [molStr] = key.split('.');
          const [partnerMolStr] = partnerKey.split('.');
          const keyMolIdx = Number(molStr);
          const partnerMolIdx = Number(partnerMolStr);
          
          if (keyMolIdx === current && !visited.has(partnerMolIdx)) {
            visited.add(partnerMolIdx);
            queue.push(partnerMolIdx);
          }
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
            // Check for intramolecular reactions (same species and molecules in same connected component)
            if (
              !allowIntramolecular &&
              reactant1Species === reactant2Species &&
              (shareTargets(matchFirst, matchSecond) || inSameConnectedComponent(matchFirst, matchSecond, reactant1Species.graph))
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
            // products === null means transformation failed (e.g., no match)
            // products === [] (empty array) is valid for degradation rules
            if (products === null || !this.validateProducts(products)) {
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
   * Handles degradation rules (X -> 0) by returning empty products array
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

    // Degradation rule: X -> 0 (empty products)
    if (rule.products.length === 0) {
      if (shouldLogNetworkGenerator) {
        debugNetworkLog(`[applyTransformation] Degradation rule - no products`);
      }
      return [];  // Return empty array for degradation
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
   * Build a product graph by applying a rule transformation.
   * 
   * BioNetGen semantics:
   * 1. For each reactant pattern, only the MATCHED molecules participate in the transformation
   * 2. Molecules connected via explicit bonds (!+) in the pattern are preserved
   * 3. State changes are applied as specified in the product pattern
   * 4. New bonds are created between matched molecules from different reactants
   */
  private buildProductGraph(
    pattern: SpeciesGraph,
    reactantPatterns: SpeciesGraph[],
    reactantGraphs: SpeciesGraph[],
    matches: MatchMap[]
  ): SpeciesGraph | null {
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(`[buildProductGraph] Building from pattern ${pattern.toString()}`);
      debugNetworkLog(`[buildProductGraph] Reactant patterns: ${reactantPatterns.map(p => p.toString()).join(' | ')}`);
      debugNetworkLog(`[buildProductGraph] Reactant graphs: ${reactantGraphs.map(g => g.toString()).join(' | ')}`);
    }

    const productGraph = new SpeciesGraph();
    
    // Track mapping: (reactantIdx, reactantMolIdx) -> productMolIdx  
    const reactantToProductMol = new Map<string, number>();
    // Track mapping: patternMolIdx -> productMolIdx
    const patternToProductMol = new Map<number, number>();
    // Track component mapping: "pMolIdx:pCompIdx" -> product component index
    const componentIndexMap = new Map<string, number>();

    // NEW APPROACH: Build product based on the PRODUCT PATTERN, not by expanding from reactant
    // 
    // For each molecule in the product pattern:
    //   1. Find which reactant pattern molecule it corresponds to
    //   2. Find which reactant graph molecule that maps to
    //   3. Clone that molecule (and any connected molecules if the pattern has !+ wildcards)
    
    // First, build mapping from product pattern molecules to reactant graph molecules
    // by matching product pattern molecule names to reactant pattern molecule names
    
    // Build a flat list of all reactant pattern molecules with their matches
    const allReactantPatternMols: Array<{
      reactantIdx: number, 
      patternMolIdx: number, 
      name: string, 
      targetMolIdx: number
    }> = [];
    
    for (let r = 0; r < reactantPatterns.length; r++) {
      const match = matches[r];
      if (!match) continue;
      
      const reactantPattern = reactantPatterns[r];
      for (let patternMolIdx = 0; patternMolIdx < reactantPattern.molecules.length; patternMolIdx++) {
        const targetMolIdx = match.moleculeMap.get(patternMolIdx);
        if (targetMolIdx !== undefined) {
          allReactantPatternMols.push({
            reactantIdx: r,
            patternMolIdx,
            name: reactantPattern.molecules[patternMolIdx].name,
            targetMolIdx
          });
        }
      }
    }
    
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(`[buildProductGraph] All reactant pattern mols: ${JSON.stringify(allReactantPatternMols)}`);
    }
    
    // Map product pattern molecules to reactant graph molecules
    const usedReactantPatternMols = new Set<number>();
    const productPatternToReactant = new Map<number, {reactantIdx: number, targetMolIdx: number}>();
    
    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const pMol = pattern.molecules[pMolIdx];
      
      // Find the first unassigned reactant pattern molecule with matching name
      for (let i = 0; i < allReactantPatternMols.length; i++) {
        if (usedReactantPatternMols.has(i)) continue;
        
        const rpmEntry = allReactantPatternMols[i];
        if (rpmEntry.name !== pMol.name) continue;
        
        usedReactantPatternMols.add(i);
        productPatternToReactant.set(pMolIdx, {
          reactantIdx: rpmEntry.reactantIdx, 
          targetMolIdx: rpmEntry.targetMolIdx
        });
        break;
      }
    }
    
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(`[buildProductGraph] Product pattern to reactant map: ${JSON.stringify(Array.from(productPatternToReactant.entries()))}`);
    }
    
    // Determine which molecules to include based on the PRODUCT PATTERN
    // For each product pattern molecule, include the corresponding reactant molecule
    // PLUS any molecules connected via wildcards (!+) in the product pattern
    const includedMols = new Set<string>(); // "reactantIdx:molIdx"
    
    // Start with directly mapped molecules AND their entire connected components
    // BioNetGen semantics: When a molecule is matched, ALL other molecules in its complex
    // should be preserved in the product (unless the rule explicitly breaks those bonds).
    for (const [, mapping] of productPatternToReactant.entries()) {
      const reactantGraph = reactantGraphs[mapping.reactantIdx];
      const startMolIdx = mapping.targetMolIdx;
      
      // Include the matched molecule
      includedMols.add(`${mapping.reactantIdx}:${startMolIdx}`);
      
      // Include all molecules in the same connected component
      const visited = new Set<number>([startMolIdx]);
      const queue = [startMolIdx];
      
      while (queue.length > 0) {
        const molIdx = queue.shift()!;
        
        // Find all molecules bonded to this one
        for (const [key, partnerKey] of reactantGraph.adjacency.entries()) {
          const [molStr] = key.split('.');
          const [partnerMolStr] = partnerKey.split('.');
          const keyMolIdx = Number(molStr);
          const partnerMolIdx = Number(partnerMolStr);
          
          if (keyMolIdx === molIdx && !visited.has(partnerMolIdx)) {
            visited.add(partnerMolIdx);
            includedMols.add(`${mapping.reactantIdx}:${partnerMolIdx}`);
            queue.push(partnerMolIdx);
          }
        }
      }
    }
    
    // Check if the product pattern has wildcards that require preserving connections
    // If product pattern has !+ wildcards, we need to include connected molecules
    //
    // IMPORTANT: We need to use the match's component mapping to know exactly which
    // reactant component corresponds to the product pattern's !+ wildcard.
    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const pMol = pattern.molecules[pMolIdx];
      const mapping = productPatternToReactant.get(pMolIdx);
      if (!mapping) continue;
      
      const reactantGraph = reactantGraphs[mapping.reactantIdx];
      const match = matches[mapping.reactantIdx];
      if (!match) continue;
      
      // Find the corresponding reactant pattern molecule
      // This is the molecule in reactantPatterns[mapping.reactantIdx] that maps to mapping.targetMolIdx
      const reactantPattern = reactantPatterns[mapping.reactantIdx];
      let reactantPatternMolIdx = -1;
      for (const [rPatternMol, targetMol] of match.moleculeMap.entries()) {
        if (targetMol === mapping.targetMolIdx) {
          reactantPatternMolIdx = rPatternMol;
          break;
        }
      }
      
      if (reactantPatternMolIdx === -1) continue;
      
      const reactantPatternMol = reactantPattern.molecules[reactantPatternMolIdx];
      
      // Track which reactant pattern components have been used for wildcards
      const usedReactantPatternComps = new Set<number>();
      
      // For each !+ component in the product pattern, find the corresponding
      // reactant pattern component and then the reactant graph component
      for (let pCompIdx = 0; pCompIdx < pMol.components.length; pCompIdx++) {
        const pComp = pMol.components[pCompIdx];
        if (pComp.wildcard !== '+') continue;
        
        // Find the corresponding component in the reactant pattern
        // Match by name and position (account for already-used components)
        let matchingReactantPatternCompIdx = -1;
        
        // Find the next unused reactant pattern component with same name and wildcard
        for (let i = 0; i < reactantPatternMol.components.length; i++) {
          if (usedReactantPatternComps.has(i)) continue;
          if (reactantPatternMol.components[i].name === pComp.name && 
              reactantPatternMol.components[i].wildcard === '+') {
            matchingReactantPatternCompIdx = i;
            usedReactantPatternComps.add(i);
            break;
          }
        }
        
        if (matchingReactantPatternCompIdx === -1) continue;
        
        // Use the componentMap to find the actual reactant graph component
        const componentMapKey = `${reactantPatternMolIdx}.${matchingReactantPatternCompIdx}`;
        const reactantGraphCompKey = match.componentMap.get(componentMapKey);
        
        if (!reactantGraphCompKey) continue;
        
        // Parse the reactant graph component key to get mol.comp
        const [, reactantCompStr] = reactantGraphCompKey.split('.');
        const reactantCompIdx = Number(reactantCompStr);
        
        // Find what this component is bonded to
        const bondTarget = reactantGraph.adjacency.get(`${mapping.targetMolIdx}.${reactantCompIdx}`);
        if (bondTarget) {
          const [partnerMolStr] = bondTarget.split('.');
          const partnerMolIdx = Number(partnerMolStr);
          includedMols.add(`${mapping.reactantIdx}:${partnerMolIdx}`);
          
          if (shouldLogNetworkGenerator) {
            debugNetworkLog(`[buildProductGraph] !+ wildcard at pattern comp ${pMolIdx}.${pCompIdx} -> reactant comp ${mapping.targetMolIdx}.${reactantCompIdx} -> bonded to mol ${partnerMolIdx}`);
          }
          
          // Recursively include the entire connected component from partner
          // (excluding the original molecule we started from)
          const toProcess = [partnerMolIdx];
          const visited = new Set<number>([partnerMolIdx, mapping.targetMolIdx]);
          while (toProcess.length > 0) {
            const molIdx = toProcess.pop()!;
            for (const [key, partnerKey] of reactantGraph.adjacency.entries()) {
              const [molStr] = key.split('.');
              const [partnerMolStr2] = partnerKey.split('.');
              const keyMolIdx = Number(molStr);
              const partnerMolIdx2 = Number(partnerMolStr2);
              
              if (keyMolIdx === molIdx && !visited.has(partnerMolIdx2)) {
                visited.add(partnerMolIdx2);
                includedMols.add(`${mapping.reactantIdx}:${partnerMolIdx2}`);
                toProcess.push(partnerMolIdx2);
              }
            }
          }
        }
      }
    }
    
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(`[buildProductGraph] Included molecules: ${Array.from(includedMols).join(', ')}`);
    }
    
    // Clone included molecules
    for (const key of includedMols) {
      const [rStr, molIdxStr] = key.split(':');
      const r = Number(rStr);
      const molIdx = Number(molIdxStr);
      
      if (reactantToProductMol.has(key)) continue;
      
      const sourceMol = reactantGraphs[r].molecules[molIdx];
      const clone = this.cloneMoleculeStructure(sourceMol);
      const newIdx = productGraph.molecules.length;
      productGraph.molecules.push(clone);
      reactantToProductMol.set(key, newIdx);
      
      if (shouldLogNetworkGenerator) {
        debugNetworkLog(`[buildProductGraph] Cloned reactant ${r} mol ${molIdx} (${sourceMol.name}) -> product mol ${newIdx}`);
      }
    }
    
    // IMPORTANT: Handle product pattern molecules that have NO corresponding reactant
    // These are newly synthesized molecules (e.g., MDM2 in "p53() -> p53() + MDM2()")
    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      if (productPatternToReactant.has(pMolIdx)) continue;  // Already has a reactant mapping
      
      const pMol = pattern.molecules[pMolIdx];
      
      // Create a fresh molecule from the pattern
      const newMol = this.cloneMoleculeStructure(pMol);
      const newIdx = productGraph.molecules.length;
      productGraph.molecules.push(newMol);
      patternToProductMol.set(pMolIdx, newIdx);
      
      if (shouldLogNetworkGenerator) {
        debugNetworkLog(`[buildProductGraph] Created NEW molecule from pattern mol ${pMolIdx} (${pMol.name}) -> product mol ${newIdx}`);
      }
    }
    
    // Map product pattern molecules to product graph molecules (for those from reactants)
    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const mapping = productPatternToReactant.get(pMolIdx);
      if (!mapping) continue;
      
      const key = `${mapping.reactantIdx}:${mapping.targetMolIdx}`;
      const productMolIdx = reactantToProductMol.get(key);
      if (productMolIdx !== undefined) {
        patternToProductMol.set(pMolIdx, productMolIdx);
        if (shouldLogNetworkGenerator) {
          debugNetworkLog(`[buildProductGraph] Pattern mol ${pMolIdx} (${pattern.molecules[pMolIdx].name}) -> product mol ${productMolIdx}`);
        }
      }
    }

    // Recreate bonds from reactants (only for molecules that are both included)
    // This preserves existing bonds ONLY if both endpoints are in the product
    const addedBonds = new Set<string>();
    
    for (let r = 0; r < reactantGraphs.length; r++) {
      const reactantGraph = reactantGraphs[r];
      
      for (const [key, partnerKey] of reactantGraph.adjacency.entries()) {
        const [molStr, compStr] = key.split('.');
        const [partnerMolStr, partnerCompStr] = partnerKey.split('.');
        const molIdx = Number(molStr);
        const compIdx = Number(compStr);
        const partnerMolIdx = Number(partnerMolStr);
        const partnerCompIdx = Number(partnerCompStr);
        
        // Skip if not valid
        if (isNaN(molIdx) || isNaN(compIdx) || isNaN(partnerMolIdx) || isNaN(partnerCompIdx)) continue;
        
        // Check if both molecules are included
        const mol1Key = `${r}:${molIdx}`;
        const mol2Key = `${r}:${partnerMolIdx}`;
        if (!includedMols.has(mol1Key) || !includedMols.has(mol2Key)) continue;
        
        // Avoid adding same bond twice
        const bondKey = molIdx < partnerMolIdx || (molIdx === partnerMolIdx && compIdx < partnerCompIdx)
          ? `${r}:${molIdx}.${compIdx}-${partnerMolIdx}.${partnerCompIdx}`
          : `${r}:${partnerMolIdx}.${partnerCompIdx}-${molIdx}.${compIdx}`;
        if (addedBonds.has(bondKey)) continue;
        addedBonds.add(bondKey);
        
        const productMolIdx1 = reactantToProductMol.get(mol1Key);
        const productMolIdx2 = reactantToProductMol.get(mol2Key);
        
        if (productMolIdx1 !== undefined && productMolIdx2 !== undefined) {
          productGraph.addBond(productMolIdx1, compIdx, productMolIdx2, partnerCompIdx);
        }
      }
    }

    // Step 5: Apply component state changes and map components
    // CRITICAL: Process pattern components in the right order:
    // 1. First, map wildcard components (!+) to bound product components
    // 2. Then, map unbound pattern components to unbound product components
    // 3. Finally, map new-bond pattern components to remaining unbound product components
    const usedComponentIndicesPerMol = new Map<number, Set<number>>();

    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const productMolIdx = patternToProductMol.get(pMolIdx);
      if (productMolIdx === undefined) continue;

      const patternMol = pattern.molecules[pMolIdx];
      const productMol = productGraph.molecules[productMolIdx];
      const usedSet = usedComponentIndicesPerMol.get(productMolIdx) ?? new Set<number>();

      // Categorize pattern components
      const wildcardComps: number[] = [];   // !+ components - should map to bound
      const unboundComps: number[] = [];    // no edges, no wildcard - should map to unbound
      const newBondComps: number[] = [];    // has edges (new bonds) - should map to unbound
      
      for (let pCompIdx = 0; pCompIdx < patternMol.components.length; pCompIdx++) {
        const pComp = patternMol.components[pCompIdx];
        if (pComp.wildcard === '+') {
          wildcardComps.push(pCompIdx);
        } else if (pComp.edges.size === 0) {
          unboundComps.push(pCompIdx);
        } else {
          newBondComps.push(pCompIdx);
        }
      }

      // Process in order: wildcards first, then unbound, then new bonds
      const orderedComps = [...wildcardComps, ...unboundComps, ...newBondComps];

      for (const pCompIdx of orderedComps) {
        const pComp = patternMol.components[pCompIdx];

        // Find a matching component in the product molecule
        let candidateIdx = -1;
        const isBound = (idx: number) => productGraph.adjacency.has(`${productMolIdx}.${idx}`);

        for (let idx = 0; idx < productMol.components.length; idx++) {
          if (usedSet.has(idx)) continue;
          if (productMol.components[idx].name !== pComp.name) continue;
          
          // For wildcard components (!+), prefer already-bound components
          if (pComp.wildcard === '+') {
            if (isBound(idx)) {
              candidateIdx = idx;
              break;
            }
          }
          // For components without wildcards, prefer unbound components
          else {
            if (!isBound(idx)) {
              candidateIdx = idx;
              break;
            }
          }
          
          // Fallback: take any available if no preferred found
          if (candidateIdx === -1) {
            candidateIdx = idx;
          }
        }

        if (candidateIdx === -1) {
          // Component doesn't exist, create it
          const newComponent = new Component(pComp.name, [...pComp.states]);
          newComponent.state = pComp.state;
          newComponent.wildcard = pComp.wildcard;
          candidateIdx = productMol.components.length;
          productMol.components.push(newComponent);
        }

        usedSet.add(candidateIdx);
        usedComponentIndicesPerMol.set(productMolIdx, usedSet);
        componentIndexMap.set(`${pMolIdx}:${pCompIdx}`, candidateIdx);

        // Apply state change if specified
        if (pComp.state && pComp.state !== '?') {
          productMol.components[candidateIdx].state = pComp.state;
        }
        
        if (shouldLogNetworkGenerator) {
          debugNetworkLog(`[buildProductGraph] Mapped pattern mol ${pMolIdx} comp ${pCompIdx} (${pComp.name}, wildcard=${pComp.wildcard}, edges=${pComp.edges.size}) -> product mol ${productMolIdx} comp ${candidateIdx} (bound=${isBound(candidateIdx)})`);
        }
      }
    }

    // Step 6: Create NEW bonds specified in the product pattern
    // Only process explicit bonds (numeric labels), not wildcards
    const bondEndpoints = new Map<number, Array<{ pMolIdx: number; pCompIdx: number }>>();

    for (let pMolIdx = 0; pMolIdx < pattern.molecules.length; pMolIdx++) {
      const patternMol = pattern.molecules[pMolIdx];
      for (let pCompIdx = 0; pCompIdx < patternMol.components.length; pCompIdx++) {
        const pComp = patternMol.components[pCompIdx];
        // Skip wildcards - they represent preserved bonds, not new ones
        if (pComp.wildcard) continue;
        
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
        if (shouldLogNetworkGenerator) {
          debugNetworkLog(`[buildProductGraph] Bond label ${bondLabel} has ${endpoints.length} endpoints, expected 2`);
        }
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
        if (shouldLogNetworkGenerator) {
          debugNetworkLog(`[buildProductGraph] Incomplete bond mapping for new bond ${bondLabel}`);
        }
        continue;
      }

      // Clear any existing bonds on these components before creating new ones
      const key1 = `${molIdx1}.${compIdx1}`;
      const key2 = `${molIdx2}.${compIdx2}`;
      const oldPartner1 = productGraph.adjacency.get(key1);
      const oldPartner2 = productGraph.adjacency.get(key2);
      
      if (oldPartner1) {
        productGraph.adjacency.delete(key1);
        productGraph.adjacency.delete(oldPartner1);
        productGraph.molecules[molIdx1].components[compIdx1].edges.clear();
        // Also clear the partner's edges
        const [oldPartnerMolStr, oldPartnerCompStr] = oldPartner1.split('.');
        const oldPartnerMolIdx = Number(oldPartnerMolStr);
        const oldPartnerCompIdx = Number(oldPartnerCompStr);
        if (!isNaN(oldPartnerMolIdx) && !isNaN(oldPartnerCompIdx)) {
          productGraph.molecules[oldPartnerMolIdx]?.components[oldPartnerCompIdx]?.edges.clear();
        }
      }
      if (oldPartner2 && oldPartner2 !== key1) {
        productGraph.adjacency.delete(key2);
        productGraph.adjacency.delete(oldPartner2);
        productGraph.molecules[molIdx2].components[compIdx2].edges.clear();
        const [oldPartnerMolStr, oldPartnerCompStr] = oldPartner2.split('.');
        const oldPartnerMolIdx = Number(oldPartnerMolStr);
        const oldPartnerCompIdx = Number(oldPartnerCompStr);
        if (!isNaN(oldPartnerMolIdx) && !isNaN(oldPartnerCompIdx)) {
          productGraph.molecules[oldPartnerMolIdx]?.components[oldPartnerCompIdx]?.edges.clear();
        }
      }

      // Create the new bond
      productGraph.addBond(molIdx1, compIdx1, molIdx2, compIdx2, bondLabel);
    }

    if (shouldLogNetworkGenerator) {
      debugNetworkLog(`[buildProductGraph] Result: ${productGraph.toString()}`);
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