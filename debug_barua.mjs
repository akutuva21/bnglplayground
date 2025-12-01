// scripts/debug_barua.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// src/services/graph/core/SpeciesGraph.ts
var SpeciesGraph = class _SpeciesGraph {
  constructor(molecules = []) {
    this.molecules = molecules;
    this.adjacency = /* @__PURE__ */ new Map();
    this.adjacencyBitset = void 0;
    this._componentOffsets = void 0;
    this._componentCount = void 0;
  }
  /**
   * BioNetGen: SpeciesGraph::addBond()
   * Create edge between two components
   */
  addBond(mol1, comp1, mol2, comp2, bondLabel) {
    const compA = this.molecules[mol1].components[comp1];
    const compB = this.molecules[mol2].components[comp2];
    const label = bondLabel || this.getNextBondLabel();
    const key1 = `${mol1}.${comp1}`;
    const key2 = `${mol2}.${comp2}`;
    this.adjacency.set(key1, key2);
    this.adjacency.set(key2, key1);
    compA.edges.set(label, comp2);
    compB.edges.set(label, comp1);
    this._stringExact = void 0;
    this.adjacencyBitset = void 0;
    this._componentOffsets = void 0;
    this._componentCount = void 0;
  }
  /**
   * Get next available bond label
   */
  getNextBondLabel() {
    let maxLabel = 0;
    const used = /* @__PURE__ */ new Set();
    for (const mol of this.molecules) {
      for (const comp of mol.components) {
        for (const label of comp.edges.keys()) {
          if (typeof label === "number" && Number.isInteger(label)) {
            used.add(label);
            if (label > maxLabel) {
              maxLabel = label;
            }
          }
        }
      }
    }
    let candidate = maxLabel + 1;
    while (used.has(candidate)) {
      candidate += 1;
    }
    return candidate;
  }
  /**
   * BioNetGen: SpeciesGraph::deleteBond()
   */
  deleteBond(mol, comp) {
    const key = `${mol}.${comp}`;
    const partner = this.adjacency.get(key);
    if (partner) {
      this.adjacency.delete(key);
      this.adjacency.delete(partner);
      this.adjacencyBitset = void 0;
      this._componentOffsets = void 0;
      this._componentCount = void 0;
    }
  }
  /**
   * VF2++ optimization: build a compact bitset encoding bonds for O(1) lookups.
   */
  buildAdjacencyBitset() {
    if (this.adjacencyBitset && this._componentOffsets && typeof this._componentCount === "number") {
      return;
    }
    const offsets = [];
    let runningIndex = 0;
    for (const mol of this.molecules) {
      offsets.push(runningIndex);
      runningIndex += mol.components.length;
    }
    const totalComponents = runningIndex;
    this._componentOffsets = offsets;
    this._componentCount = totalComponents;
    if (totalComponents === 0) {
      this.adjacencyBitset = new Uint32Array(0);
      return;
    }
    const bitsetSize = Math.ceil(totalComponents * totalComponents / 32);
    this.adjacencyBitset = new Uint32Array(bitsetSize);
    const getIndex = (molIdx, compIdx) => {
      return offsets[molIdx] + compIdx;
    };
    for (const [key, partnerKey] of this.adjacency.entries()) {
      const [molAStr, compAStr] = key.split(".");
      const [molBStr, compBStr] = partnerKey.split(".");
      const molA = Number(molAStr);
      const compA = Number(compAStr);
      const molB = Number(molBStr);
      const compB = Number(compBStr);
      if (Number.isNaN(molA) || Number.isNaN(compA) || Number.isNaN(molB) || Number.isNaN(compB)) {
        continue;
      }
      const idxA = getIndex(molA, compA);
      const idxB = getIndex(molB, compB);
      const bitIndex = idxA * totalComponents + idxB;
      const arrayIndex = Math.floor(bitIndex / 32);
      const bitPosition = bitIndex % 32;
      const mask = 1 << bitPosition >>> 0;
      this.adjacencyBitset[arrayIndex] |= mask;
    }
  }
  hasBondFast(molA, compA, molB, compB) {
    if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
      this.buildAdjacencyBitset();
      if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
        const keyA = `${molA}.${compA}`;
        const keyB = `${molB}.${compB}`;
        return this.adjacency.get(keyA) === keyB;
      }
    }
    const total = this._componentCount;
    if (!total) {
      const keyA = `${molA}.${compA}`;
      const keyB = `${molB}.${compB}`;
      return this.adjacency.get(keyA) === keyB;
    }
    const idxA = this._componentOffsets[molA] + compA;
    const idxB = this._componentOffsets[molB] + compB;
    const bitIndex = idxA * total + idxB;
    const arrayIndex = Math.floor(bitIndex / 32);
    const bitPosition = bitIndex % 32;
    const mask = 1 << bitPosition >>> 0;
    if (arrayIndex >= this.adjacencyBitset.length) {
      return false;
    }
    return (this.adjacencyBitset[arrayIndex] & mask) !== 0;
  }
  componentHasAnyBond(molIdx, compIdx) {
    if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
      this.buildAdjacencyBitset();
      if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
        const key = `${molIdx}.${compIdx}`;
        return this.adjacency.has(key);
      }
    }
    const total = this._componentCount;
    if (!total) {
      const key = `${molIdx}.${compIdx}`;
      return this.adjacency.has(key);
    }
    const rowIndex = this._componentOffsets[molIdx] + compIdx;
    const startBit = rowIndex * total;
    let remaining = total;
    let bitIndex = startBit;
    while (remaining > 0) {
      const arrayIndex = Math.floor(bitIndex / 32);
      const bitOffset = bitIndex % 32;
      const chunkSize = Math.min(32 - bitOffset, remaining);
      if (chunkSize === 32 && bitOffset === 0) {
        if (this.adjacencyBitset[arrayIndex] !== 0) {
          return true;
        }
      } else {
        const chunk = this.adjacencyBitset[arrayIndex] >>> bitOffset;
        const mask = chunkSize >= 32 ? 4294967295 : (1 << chunkSize) - 1;
        if ((chunk & mask) !== 0) {
          return true;
        }
      }
      remaining -= chunkSize;
      bitIndex += chunkSize;
    }
    return false;
  }
  /**
   * BioNetGen: SpeciesGraph::toString() / StringExact()
   * Non-canonical string (molecule order as-is)
   */
  toString() {
    if (this._stringExact) return this._stringExact;
    this._stringExact = this.molecules.map((m) => m.toString()).join(".");
    return this._stringExact;
  }
  /**
   * BioNetGen: SpeciesGraph::findMaps()
   * Find all isomorphisms from pattern to this graph
   * Returns array of Map<patternMolIdx, thisMolIdx>
   */
  findMaps(_pattern) {
    return [];
  }
  /**
   * Deep clone
   */
  clone() {
    const sg = new _SpeciesGraph(this.molecules.map((m) => m.clone()));
    sg.adjacency = new Map(this.adjacency);
    sg.compartment = this.compartment;
    if (this.adjacencyBitset) {
      sg.adjacencyBitset = this.adjacencyBitset.slice();
    }
    if (this._componentOffsets) {
      sg._componentOffsets = [...this._componentOffsets];
    }
    if (typeof this._componentCount === "number") {
      sg._componentCount = this._componentCount;
    }
    return sg;
  }
};

// src/services/graph/core/Canonical.ts
var GraphCanonicalizer = class {
  /**
   * Generate canonical string with sorted molecules and renumbered bonds
   * Algorithm mirrors BioNetGen's HNauty::canonical_hash()
   */
  static canonicalize(graph) {
    const moleculeSignatures = graph.molecules.map((mol, molIdx) => {
      const componentSignatures = mol.components.map((comp, compIdx) => {
        const stateSegment = comp.state && comp.state !== "?" ? `~${comp.state}` : "";
        const adjacencyKey2 = `${molIdx}.${compIdx}`;
        const partnerKey = graph.adjacency.get(adjacencyKey2);
        if (partnerKey) {
          const [partnerMolIdxStr, partnerCompIdxStr] = partnerKey.split(".");
          const partnerMolIdx = Number(partnerMolIdxStr);
          const partnerCompIdx = Number(partnerCompIdxStr);
          const partnerMol = graph.molecules[partnerMolIdx];
          const partnerComp = partnerMol?.components[partnerCompIdx];
          const labelSegment = Array.from(comp.edges.keys()).sort((a, b) => a - b).join("&");
          const labelPart = labelSegment ? `!${labelSegment}` : "!#";
          const partnerPart = partnerMol && partnerComp ? `->${partnerMol.name}:${partnerComp.name}` : "->?";
          return `${comp.name}${stateSegment}${labelPart}${partnerPart}`;
        }
        if (comp.wildcard) {
          return `${comp.name}${stateSegment}!${comp.wildcard}`;
        }
        return `${comp.name}${stateSegment}!_`;
      }).sort();
      const compartmentSegment = mol.compartment ? `@${mol.compartment}` : "";
      return `${mol.name}${compartmentSegment}(${componentSignatures.join(",")})`;
    });
    moleculeSignatures.sort();
    return moleculeSignatures.join(".");
  }
  /**
   * Compute automorphism group size (for StatFactor correction)
   * BioNetGen: SpeciesGraph::aut_permutations()
   */
  static computeAutomorphisms(_graph) {
    return 1;
  }
};

// src/services/graph/core/Species.ts
var Species = class {
  constructor(graph, index, concentration) {
    this.graph = graph;
    this.index = index;
    this.concentration = concentration;
  }
  /**
   * BioNetGen: Species::toString()
   */
  toString() {
    return this.graph.toString();
  }
  /**
   * Get canonical string for species identification
   */
  get canonicalString() {
    return GraphCanonicalizer.canonicalize(this.graph);
  }
};

// src/services/graph/core/Matcher.ts
var shouldLogGraphMatcher = typeof process !== "undefined" && process.env?.DEBUG_GRAPH_MATCHER === "true";
var adjacencyKey = (molIdx, compIdx) => `${molIdx}.${compIdx}`;
var getNeighborMolecules = (graph, molIdx) => {
  const neighbors = /* @__PURE__ */ new Set();
  const molecule = graph.molecules[molIdx];
  if (!molecule) {
    return [];
  }
  for (let compIdx = 0; compIdx < molecule.components.length; compIdx++) {
    const partnerKey = graph.adjacency.get(adjacencyKey(molIdx, compIdx));
    if (!partnerKey) {
      continue;
    }
    const [partnerMolStr] = partnerKey.split(".");
    const partnerMolIdx = Number(partnerMolStr);
    if (!Number.isNaN(partnerMolIdx)) {
      neighbors.add(partnerMolIdx);
    }
  }
  return Array.from(neighbors);
};
var GraphMatcher = class {
  /**
   * VF2++ Algorithm 1 (Egerváry & Madarasi 2018, Section 3): compute an order that prioritizes
   * rare, highly connected pattern nodes to maximize early pruning. Each connected component is
   * explored with a BFS, starting from the highest degree / rarest label root. Within each level
   * nodes are sorted by the number of already covered neighbours, then raw degree, then label
   * frequency, yielding a deterministic, duplicate-free ordering.
   */
  static computeNodeOrdering(pattern, target) {
    if (!pattern.molecules.length) {
      return [];
    }
    const ordering = [];
    const visited = /* @__PURE__ */ new Set();
    const labelFrequency = this.buildTargetLabelFrequency(target);
    const components = this.findConnectedComponents(pattern);
    for (const component of components) {
      const root = this.selectBfsRoot(component, pattern, labelFrequency);
      if (root === void 0) {
        continue;
      }
      const queue = [root];
      visited.add(root);
      ordering.push(root);
      let levelIndex = 0;
      while (levelIndex < queue.length) {
        const levelEnd = queue.length;
        const nextLevel = [];
        const nextLevelSet = /* @__PURE__ */ new Set();
        for (let i = levelIndex; i < levelEnd; i++) {
          const node = queue[i];
          for (const neighbor of getNeighborMolecules(pattern, node)) {
            if (!component.has(neighbor) || visited.has(neighbor) || nextLevelSet.has(neighbor)) {
              continue;
            }
            nextLevelSet.add(neighbor);
            nextLevel.push(neighbor);
          }
        }
        nextLevel.sort((a, b) => {
          const coveredA = this.countCoveredNeighbors(pattern, a, visited);
          const coveredB = this.countCoveredNeighbors(pattern, b, visited);
          if (coveredA !== coveredB) {
            return coveredB - coveredA;
          }
          const degreeA = getNeighborMolecules(pattern, a).length;
          const degreeB = getNeighborMolecules(pattern, b).length;
          if (degreeA !== degreeB) {
            return degreeB - degreeA;
          }
          const freqA = labelFrequency.get(pattern.molecules[a].name) ?? 0;
          const freqB = labelFrequency.get(pattern.molecules[b].name) ?? 0;
          if (freqA !== freqB) {
            return freqA - freqB;
          }
          return a - b;
        });
        const deduplicated = Array.from(new Set(nextLevel));
        for (const node of deduplicated) {
          visited.add(node);
          queue.push(node);
          ordering.push(node);
        }
        levelIndex = levelEnd;
      }
    }
    return ordering;
  }
  static buildTargetLabelFrequency(target) {
    const freq = /* @__PURE__ */ new Map();
    for (const molecule of target.molecules) {
      freq.set(molecule.name, (freq.get(molecule.name) ?? 0) + 1);
    }
    return freq;
  }
  static findConnectedComponents(graph) {
    const visited = /* @__PURE__ */ new Set();
    const components = [];
    for (let idx = 0; idx < graph.molecules.length; idx++) {
      if (visited.has(idx)) {
        continue;
      }
      const component = /* @__PURE__ */ new Set();
      const stack = [idx];
      const maxIterations = graph.molecules.length * 2;
      let iterations = 0;
      while (stack.length > 0) {
        iterations += 1;
        if (iterations > maxIterations) {
          console.warn("[GraphMatcher] Connected component traversal exceeded safety bound");
          break;
        }
        const node = stack.pop();
        if (visited.has(node)) {
          continue;
        }
        visited.add(node);
        component.add(node);
        for (const neighbor of getNeighborMolecules(graph, node)) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
      components.push(component);
    }
    return components;
  }
  static selectBfsRoot(component, pattern, labelFrequency) {
    let bestNode;
    let bestDegree = -1;
    let bestLabelFrequency = Number.POSITIVE_INFINITY;
    for (const node of component) {
      const degree = getNeighborMolecules(pattern, node).length;
      const freq = labelFrequency.get(pattern.molecules[node].name) ?? 0;
      if (degree > bestDegree || degree === bestDegree && freq < bestLabelFrequency || degree === bestDegree && freq === bestLabelFrequency && (bestNode === void 0 || node < bestNode)) {
        bestNode = node;
        bestDegree = degree;
        bestLabelFrequency = freq;
      }
    }
    return bestNode;
  }
  static countCoveredNeighbors(pattern, node, visited) {
    let covered = 0;
    for (const neighbor of getNeighborMolecules(pattern, node)) {
      if (visited.has(neighbor)) {
        covered += 1;
      }
    }
    return covered;
  }
  /**
   * Find ALL isomorphic embeddings of pattern in target
   * BioNetGen: SpeciesGraph::findMaps($pattern)
   */
  static findAllMaps(pattern, target) {
    const matches = [];
    const ordering = this.computeNodeOrdering(pattern, target);
    const state = new VF2State(pattern, target, ordering);
    this.vf2Backtrack(state, matches);
    if (shouldLogGraphMatcher) {
      console.log(
        `[GraphMatcher] Found ${matches.length} matches for pattern ${pattern.toString()} in target ${target.toString()}`
      );
    }
    return matches;
  }
  /**
   * Check if target species matches the pattern (has at least one valid mapping)
   */
  static matchesPattern(pattern, target) {
    const maps = this.findAllMaps(pattern, target);
    return maps.length > 0;
  }
  /**
   * VF2 recursive backtracking
   */
  static vf2Backtrack(state, matches) {
    if (state.isComplete()) {
      matches.push(state.getMatch());
      return;
    }
    const candidates = state.getCandidatePairs();
    for (const [pNode, tNode] of candidates) {
      if (state.isFeasible(pNode, tNode)) {
        state.addPair(pNode, tNode);
        this.vf2Backtrack(state, matches);
        state.removePair(pNode, tNode);
      }
    }
  }
};
var VF2State = class {
  constructor(pattern, target, nodeOrdering) {
    this.pattern = pattern;
    this.target = target;
    this.corePattern = /* @__PURE__ */ new Map();
    this.coreTarget = /* @__PURE__ */ new Map();
    this.componentMatches = /* @__PURE__ */ new Map();
    this.bondPartnerLookup = this.buildBondPartnerLookup();
    this.nodeOrdering = nodeOrdering.length ? nodeOrdering : pattern.molecules.map((_, idx) => idx);
    this.componentCandidateCache = /* @__PURE__ */ new Map();
    this.usedTargetsScratch = [];
  }
  isComplete() {
    return this.corePattern.size === this.pattern.molecules.length;
  }
  computePatternFrontier() {
    const frontier = /* @__PURE__ */ new Set();
    for (const patternIdx of this.corePattern.keys()) {
      for (const neighbor of getNeighborMolecules(this.pattern, patternIdx)) {
        if (!this.corePattern.has(neighbor)) {
          frontier.add(neighbor);
        }
      }
    }
    return frontier;
  }
  computeTargetFrontier() {
    const frontier = /* @__PURE__ */ new Set();
    for (const targetIdx of this.coreTarget.keys()) {
      for (const neighbor of getNeighborMolecules(this.target, targetIdx)) {
        if (!this.coreTarget.has(neighbor)) {
          frontier.add(neighbor);
        }
      }
    }
    return frontier;
  }
  getUncoveredPatternNodes() {
    const nodes = /* @__PURE__ */ new Set();
    for (let idx = 0; idx < this.pattern.molecules.length; idx++) {
      if (!this.corePattern.has(idx)) {
        nodes.add(idx);
      }
    }
    return nodes;
  }
  getUncoveredTargetNodes() {
    const nodes = /* @__PURE__ */ new Set();
    for (let idx = 0; idx < this.target.molecules.length; idx++) {
      if (!this.coreTarget.has(idx)) {
        nodes.add(idx);
      }
    }
    return nodes;
  }
  neighborConsistencyCheck(pNode, tNode) {
    let patternUncovered = 0;
    for (const neighbor of getNeighborMolecules(this.pattern, pNode)) {
      if (!this.corePattern.has(neighbor)) {
        patternUncovered += 1;
      }
    }
    let targetUncovered = 0;
    for (const neighbor of getNeighborMolecules(this.target, tNode)) {
      if (!this.coreTarget.has(neighbor)) {
        targetUncovered += 1;
      }
    }
    return patternUncovered <= targetUncovered;
  }
  /**
   * VF2++ frontier-driven candidate generation. Preference is given to frontier nodes (those
   * adjacent to the current core), falling back to uncovered nodes following the precomputed
   * ordering. Target candidates are filtered with quick feasibility and neighbourhood degree
   * consistency before being returned for recursive exploration.
   */
  getCandidatePairs() {
    const pairs = [];
    const patternFrontier = this.computePatternFrontier();
    const targetFrontier = this.computeTargetFrontier();
    const patternCandidates = patternFrontier.size > 0 ? patternFrontier : this.getUncoveredPatternNodes();
    const targetCandidates = targetFrontier.size > 0 ? targetFrontier : this.getUncoveredTargetNodes();
    let nextPatternIdx;
    for (const idx of this.nodeOrdering) {
      if (patternCandidates.has(idx) && !this.corePattern.has(idx)) {
        nextPatternIdx = idx;
        break;
      }
    }
    if (nextPatternIdx === void 0) {
      return pairs;
    }
    const sortedTargetCandidates = Array.from(targetCandidates).sort((a, b) => a - b);
    for (const tIdx of sortedTargetCandidates) {
      if (this.coreTarget.has(tIdx)) {
        continue;
      }
      if (!this.quickFeasibilityCheck(nextPatternIdx, tIdx)) {
        continue;
      }
      if (!this.neighborConsistencyCheck(nextPatternIdx, tIdx)) {
        continue;
      }
      pairs.push([nextPatternIdx, tIdx]);
    }
    return pairs;
  }
  isFeasible(pMol, tMol) {
    this.pendingComponentResult = void 0;
    if (!this.quickFeasibilityCheck(pMol, tMol)) {
      return false;
    }
    if (!this.labelConsistencyCut(pMol, tMol)) {
      return false;
    }
    const componentMapping = this.matchComponents(pMol, tMol);
    if (!componentMapping) {
      return false;
    }
    if (!this.checkFrontierConsistency(pMol, tMol)) {
      return false;
    }
    this.pendingComponentResult = {
      patternMolIdx: pMol,
      targetMolIdx: tMol,
      mapping: componentMapping
    };
    return true;
  }
  quickFeasibilityCheck(pMol, tMol) {
    const patternMol = this.pattern.molecules[pMol];
    const targetMol = this.target.molecules[tMol];
    if (patternMol.name !== targetMol.name) {
      return false;
    }
    if (patternMol.compartment && patternMol.compartment !== targetMol.compartment) {
      return false;
    }
    if (targetMol.components.length < patternMol.components.length) {
      return false;
    }
    const requiredCounts = /* @__PURE__ */ new Map();
    for (const comp of patternMol.components) {
      requiredCounts.set(comp.name, (requiredCounts.get(comp.name) ?? 0) + 1);
    }
    for (const [name, count] of requiredCounts.entries()) {
      let available = 0;
      for (const targetComp of targetMol.components) {
        if (targetComp.name === name) {
          available += 1;
        }
      }
      if (available < count) {
        return false;
      }
    }
    return true;
  }
  /**
   * VF2++ Algorithm 2 label consistency check. We compare the unmatched neighbourhoods (T1' and T2')
   * induced by already mapped nodes plus the candidate pair (pMol, tMol). Every label/compartment
   * requirement exposed by the pattern frontier must be satisfiable by the target frontier.
   */
  labelConsistencyCut(pMol, tMol) {
    const patternCounts = /* @__PURE__ */ new Map();
    const addPatternNeighbors = (sourceIdx, skipCandidate) => {
      for (const neighbor of getNeighborMolecules(this.pattern, sourceIdx)) {
        if (this.corePattern.has(neighbor)) {
          continue;
        }
        if (skipCandidate && neighbor === pMol) {
          continue;
        }
        const mol = this.pattern.molecules[neighbor];
        const key = mol.compartment ? `${mol.name}|${mol.compartment}` : mol.name;
        patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
      }
    };
    for (const coveredIdx of this.corePattern.keys()) {
      addPatternNeighbors(coveredIdx, true);
    }
    addPatternNeighbors(pMol, false);
    if (patternCounts.size === 0) {
      return true;
    }
    const targetCounts = /* @__PURE__ */ new Map();
    const addTargetNeighbors = (sourceIdx, skipCandidate) => {
      for (const neighbor of getNeighborMolecules(this.target, sourceIdx)) {
        if (this.coreTarget.has(neighbor)) {
          continue;
        }
        if (skipCandidate && neighbor === tMol) {
          continue;
        }
        const mol = this.target.molecules[neighbor];
        const key = mol.compartment ? `${mol.name}|${mol.compartment}` : mol.name;
        targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
      }
    };
    for (const coveredIdx of this.coreTarget.keys()) {
      addTargetNeighbors(coveredIdx, true);
    }
    addTargetNeighbors(tMol, false);
    for (const [labelKey, required] of patternCounts.entries()) {
      if ((targetCounts.get(labelKey) ?? 0) < required) {
        return false;
      }
    }
    return true;
  }
  checkFrontierConsistency(pMol, tMol) {
    const patternCounts = /* @__PURE__ */ new Map();
    for (const neighbor of getNeighborMolecules(this.pattern, pMol)) {
      if (this.corePattern.has(neighbor)) {
        continue;
      }
      const mol = this.pattern.molecules[neighbor];
      const key = mol.compartment ? `${mol.name}|${mol.compartment}` : mol.name;
      patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
    }
    if (!patternCounts.size) {
      return true;
    }
    const targetCounts = /* @__PURE__ */ new Map();
    for (const neighbor of getNeighborMolecules(this.target, tMol)) {
      if (this.coreTarget.has(neighbor)) {
        continue;
      }
      const mol = this.target.molecules[neighbor];
      const key = mol.compartment ? `${mol.name}|${mol.compartment}` : mol.name;
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }
    for (const [key, required] of patternCounts.entries()) {
      if ((targetCounts.get(key) ?? 0) < required) {
        return false;
      }
    }
    return true;
  }
  addPair(p, t) {
    this.corePattern.set(p, t);
    this.coreTarget.set(t, p);
    this.componentCandidateCache.clear();
    if (this.pendingComponentResult && this.pendingComponentResult.patternMolIdx === p && this.pendingComponentResult.targetMolIdx === t) {
      this.componentMatches.set(p, new Map(this.pendingComponentResult.mapping));
    } else {
      const fallback = this.matchComponents(p, t) ?? /* @__PURE__ */ new Map();
      this.componentMatches.set(p, fallback);
    }
    this.pendingComponentResult = void 0;
  }
  removePair(p, t) {
    this.corePattern.delete(p);
    this.coreTarget.delete(t);
    this.componentMatches.delete(p);
    this.componentCandidateCache.clear();
  }
  getMatch() {
    const componentMap = /* @__PURE__ */ new Map();
    for (const [pMolIdx, tMolIdx] of this.corePattern.entries()) {
      const perMolMap = this.componentMatches.get(pMolIdx);
      if (!perMolMap) continue;
      for (const [pCompIdx, tCompIdx] of perMolMap.entries()) {
        componentMap.set(`${pMolIdx}.${pCompIdx}`, `${tMolIdx}.${tCompIdx}`);
      }
    }
    return {
      moleculeMap: new Map(this.corePattern),
      componentMap
    };
  }
  buildBondPartnerLookup() {
    const lookup = /* @__PURE__ */ new Map();
    const grouped = /* @__PURE__ */ new Map();
    for (let molIdx = 0; molIdx < this.pattern.molecules.length; molIdx++) {
      const mol = this.pattern.molecules[molIdx];
      mol.components.forEach((comp, compIdx) => {
        for (const bondLabel of comp.edges.keys()) {
          if (!grouped.has(bondLabel)) {
            grouped.set(bondLabel, []);
          }
          grouped.get(bondLabel).push({ molIdx, compIdx });
        }
      });
    }
    for (const [label, endpoints] of grouped.entries()) {
      if (endpoints.length < 2) continue;
      for (const endpoint of endpoints) {
        const partner = endpoints.find((ep) => ep.molIdx !== endpoint.molIdx || ep.compIdx !== endpoint.compIdx);
        if (!partner) continue;
        lookup.set(this.componentBondKey(endpoint.molIdx, endpoint.compIdx, label), partner);
      }
    }
    return lookup;
  }
  componentBondKey(molIdx, compIdx, bondLabel) {
    return `${molIdx}.${compIdx}.${bondLabel}`;
  }
  matchComponents(pMolIdx, tMolIdx) {
    const patternMol = this.pattern.molecules[pMolIdx];
    if (patternMol.components.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const order = patternMol.components.map((_, idx) => idx).sort((a, b) => this.componentPriority(patternMol.components[b]) - this.componentPriority(patternMol.components[a]));
    const assignment = /* @__PURE__ */ new Map();
    const usedTargets = /* @__PURE__ */ new Set();
    const success = this.assignComponentsBacktrack(pMolIdx, tMolIdx, order, 0, assignment, usedTargets);
    return success ? assignment : null;
  }
  assignComponentsBacktrack(pMolIdx, tMolIdx, order, orderIdx, assignment, usedTargets) {
    if (orderIdx >= order.length) {
      return true;
    }
    let bestPos = orderIdx;
    let minCandidates = Number.POSITIVE_INFINITY;
    const candidateCache = /* @__PURE__ */ new Map();
    for (let i = orderIdx; i < order.length; i++) {
      const compIdx = order[i];
      const candidatesForComp = this.getComponentCandidates(pMolIdx, tMolIdx, compIdx, usedTargets);
      candidateCache.set(compIdx, candidatesForComp);
      if (candidatesForComp.length < minCandidates) {
        minCandidates = candidatesForComp.length;
        bestPos = i;
        if (minCandidates === 0) {
          break;
        }
      }
    }
    if (bestPos !== orderIdx) {
      const tmp = order[orderIdx];
      order[orderIdx] = order[bestPos];
      order[bestPos] = tmp;
    }
    const pCompIdx = order[orderIdx];
    const candidates = candidateCache.get(pCompIdx) ?? [];
    if (candidates.length === 0) {
      return false;
    }
    for (const tCompIdx of candidates) {
      if (!this.isComponentAssignmentValid(pMolIdx, pCompIdx, tMolIdx, tCompIdx, assignment)) {
        continue;
      }
      assignment.set(pCompIdx, tCompIdx);
      usedTargets.add(tCompIdx);
      if (this.assignComponentsBacktrack(pMolIdx, tMolIdx, order, orderIdx + 1, assignment, usedTargets)) {
        return true;
      }
      assignment.delete(pCompIdx);
      usedTargets.delete(tCompIdx);
    }
    return false;
  }
  getComponentCandidates(pMolIdx, tMolIdx, pCompIdx, usedTargets) {
    const usedKey = this.getUsedTargetsKey(usedTargets);
    let level1 = this.componentCandidateCache.get(pMolIdx);
    if (!level1) {
      level1 = /* @__PURE__ */ new Map();
      this.componentCandidateCache.set(pMolIdx, level1);
    }
    let level2 = level1.get(tMolIdx);
    if (!level2) {
      level2 = /* @__PURE__ */ new Map();
      level1.set(tMolIdx, level2);
    }
    let level3 = level2.get(pCompIdx);
    if (!level3) {
      level3 = /* @__PURE__ */ new Map();
      level2.set(pCompIdx, level3);
    }
    const cached = level3.get(usedKey);
    if (cached) {
      return cached;
    }
    const pComp = this.pattern.molecules[pMolIdx].components[pCompIdx];
    const targetMol = this.target.molecules[tMolIdx];
    const candidates = [];
    for (let idx = 0; idx < targetMol.components.length; idx++) {
      if (usedTargets.has(idx)) continue;
      const tComp = targetMol.components[idx];
      if (tComp.name !== pComp.name) continue;
      if (!this.componentStateCompatible(pComp, tComp)) continue;
      candidates.push(idx);
    }
    level3.set(usedKey, candidates);
    return candidates;
  }
  getUsedTargetsKey(usedTargets) {
    this.usedTargetsScratch.length = 0;
    for (const value of usedTargets) {
      this.usedTargetsScratch.push(value);
    }
    this.usedTargetsScratch.sort((a, b) => a - b);
    return this.usedTargetsScratch.join(",");
  }
  componentPriority(comp) {
    let score = 0;
    score += comp.edges.size * 10;
    if (comp.wildcard === "+") score += 5;
    if (comp.wildcard === "?") score += 1;
    if (comp.wildcard === "-") score += 4;
    if (!comp.wildcard && comp.edges.size === 0) score += 2;
    if (comp.state && comp.state !== "?") score += 3;
    return score;
  }
  isComponentAssignmentValid(pMolIdx, pCompIdx, tMolIdx, tCompIdx, currentAssignments) {
    if (!this.componentBondStateCompatible(pMolIdx, pCompIdx, tMolIdx, tCompIdx)) {
      return false;
    }
    if (!this.componentBondConsistencySatisfied(pMolIdx, pCompIdx, tMolIdx, tCompIdx, currentAssignments)) {
      return false;
    }
    return true;
  }
  componentStateCompatible(patternComp, targetComp) {
    if (!patternComp.state || patternComp.state === "?") {
      return true;
    }
    return targetComp.state === patternComp.state;
  }
  componentBondStateCompatible(pMolIdx, pCompIdx, tMolIdx, tCompIdx) {
    const patternMol = this.pattern.molecules[pMolIdx];
    const targetMol = this.target.molecules[tMolIdx];
    if (patternMol.compartment && targetMol.compartment && patternMol.compartment !== targetMol.compartment) {
      return false;
    }
    const pComp = this.pattern.molecules[pMolIdx].components[pCompIdx];
    const hasSpecificBond = pComp.edges.size > 0;
    const targetBound = this.targetHasBond(tMolIdx, tCompIdx);
    if (pComp.wildcard === "+") {
      return targetBound;
    }
    if (pComp.wildcard === "?") {
      return true;
    }
    if (pComp.wildcard === "-") {
      return !targetBound;
    }
    if (hasSpecificBond) {
      return targetBound;
    }
    return !targetBound;
  }
  componentBondConsistencySatisfied(pMolIdx, pCompIdx, tMolIdx, tCompIdx, currentAssignments) {
    const pComp = this.pattern.molecules[pMolIdx].components[pCompIdx];
    for (const [bondLabel] of pComp.edges.entries()) {
      const partner = this.getBondPartner(pMolIdx, pCompIdx, bondLabel);
      if (!partner) {
        continue;
      }
      const partnerMolIdx = partner.molIdx;
      const partnerCompIdx = partner.compIdx;
      if (partnerMolIdx === pMolIdx) {
        if (currentAssignments.has(partnerCompIdx)) {
          const targetPartnerCompIdx = currentAssignments.get(partnerCompIdx);
          if (!this.areComponentsBonded(tMolIdx, tCompIdx, tMolIdx, targetPartnerCompIdx)) {
            return false;
          }
        } else {
          const neighborKey = this.target.adjacency.get(this.getAdjacencyKey(tMolIdx, tCompIdx));
          if (!neighborKey) {
            return false;
          }
          const [neighborMolIdxStr] = neighborKey.split(".");
          if (Number(neighborMolIdxStr) !== tMolIdx) {
            return false;
          }
        }
      } else if (this.corePattern.has(partnerMolIdx)) {
        const targetPartnerMolIdx = this.corePattern.get(partnerMolIdx);
        const partnerComponentMap = this.componentMatches.get(partnerMolIdx);
        if (!partnerComponentMap) {
          return false;
        }
        const targetPartnerCompIdx = partnerComponentMap.get(partnerCompIdx);
        if (targetPartnerCompIdx === void 0) {
          return false;
        }
        if (!this.areComponentsBonded(tMolIdx, tCompIdx, targetPartnerMolIdx, targetPartnerCompIdx)) {
          return false;
        }
        if (!this.targetCompartmentsMatch(tMolIdx, targetPartnerMolIdx)) {
          return false;
        }
      } else {
        const neighborKey = this.target.adjacency.get(this.getAdjacencyKey(tMolIdx, tCompIdx));
        if (!neighborKey) {
          return false;
        }
        const [neighborMolIdxStr] = neighborKey.split(".");
        const neighborMolIdx = Number(neighborMolIdxStr);
        if (this.coreTarget.has(neighborMolIdx)) {
          const mappedPatternMol = this.coreTarget.get(neighborMolIdx);
          if (mappedPatternMol !== partnerMolIdx) {
            return false;
          }
        }
        if (!Number.isNaN(neighborMolIdx) && !this.targetCompartmentsMatch(tMolIdx, neighborMolIdx)) {
          return false;
        }
      }
    }
    return true;
  }
  getBondPartner(molIdx, compIdx, bondLabel) {
    return this.bondPartnerLookup.get(this.componentBondKey(molIdx, compIdx, bondLabel)) ?? null;
  }
  targetHasBond(tMolIdx, tCompIdx) {
    return this.target.adjacency.has(this.getAdjacencyKey(tMolIdx, tCompIdx));
  }
  areComponentsBonded(tMolIdxA, tCompIdxA, tMolIdxB, tCompIdxB) {
    const keyA = this.getAdjacencyKey(tMolIdxA, tCompIdxA);
    const keyB = this.getAdjacencyKey(tMolIdxB, tCompIdxB);
    return this.target.adjacency.get(keyA) === keyB;
  }
  targetCompartmentsMatch(molIdxA, molIdxB) {
    const molA = this.target.molecules[molIdxA];
    const molB = this.target.molecules[molIdxB];
    if (!molA || !molB) {
      return false;
    }
    if (molA.compartment && molB.compartment && molA.compartment !== molB.compartment) {
      return false;
    }
    return true;
  }
  getAdjacencyKey(molIdx, compIdx) {
    return `${molIdx}.${compIdx}`;
  }
};

// src/services/graph/core/Rxn.ts
var Rxn = class {
  constructor(reactants, products, rate, name, options = {}) {
    this.reactants = reactants;
    this.products = products;
    this.rate = rate;
    this.name = name;
    this.degeneracy = options.degeneracy ?? 1;
    this.propensityFactor = options.propensityFactor;
  }
  /**
   * BioNetGen: Rxn::toString()
   */
  toString() {
    const reactantStr = this.reactants.join(" + ");
    const productStr = this.products.join(" + ");
    return `${reactantStr} -> ${productStr} ${this.rate}`;
  }
};

// src/services/graph/core/Component.ts
var Component = class _Component {
  // bond wildcard semantics (include '!' modifiers like !+, !? and !-)
  constructor(name, states = []) {
    this.name = name;
    this.states = states;
    this.edges = /* @__PURE__ */ new Map();
  }
  /**
   * BioNetGen: Component::toString()
   * Format: name~state!bond or name!bond or name~state
   */
  toString() {
    let str = this.name;
    if (this.state) str += `~${this.state}`;
    if (this.edges.size > 0) {
      const bondLabel = Array.from(this.edges.keys())[0];
      str += `!${bondLabel}`;
    } else if (this.wildcard) {
      str += `!${this.wildcard}`;
    }
    return str;
  }
  /**
   * BioNetGen: Component::isomorphicTo()
   * Check structural equivalence for graph matching
   */
  isomorphicTo(other, checkState = true) {
    if (this.name !== other.name) return false;
    if (checkState && this.state !== other.state) return false;
    if (this.states.length !== other.states.length) return false;
    if (this.wildcard === "+" && other.edges.size === 0) return false;
    return true;
  }
  /**
   * Create a deep copy of this component (including bond metadata)
   */
  clone() {
    const copy = new _Component(this.name, [...this.states]);
    copy.state = this.state;
    copy.wildcard = this.wildcard;
    copy.edges = new Map(this.edges);
    return copy;
  }
};

// src/services/graph/core/Molecule.ts
var Molecule = class _Molecule {
  constructor(name, components = [], compartment, hasExplicitEmptyComponentList = false) {
    this.name = name;
    this.components = components;
    this.compartment = compartment;
    this.hasExplicitEmptyComponentList = hasExplicitEmptyComponentList;
  }
  /**
   * BioNetGen: Molecule::toString()
   * Format: Name(comp1,comp2~state!1)@compartment
   */
  toString() {
    const compStr = this.components.map((c) => c.toString()).join(",");
    const compSuffix = compStr ? `(${compStr})` : this.hasExplicitEmptyComponentList ? "()" : "";
    const compartmentSuffix = this.compartment ? `@${this.compartment}` : "";
    if (compStr || this.hasExplicitEmptyComponentList) {
      return `${this.name}${compSuffix}${compartmentSuffix}`;
    }
    return `${this.name}${compartmentSuffix}`;
  }
  /**
   * BioNetGen: Molecule::isomorphicTo()
   */
  isomorphicTo(other, componentMap) {
    if (this.name !== other.name) return false;
    if (this.compartment !== other.compartment) return false;
    if (this.components.length !== other.components.length) return false;
    for (let i = 0; i < this.components.length; i++) {
      if (!this.components[i].isomorphicTo(other.components[i])) return false;
      componentMap.set(i, i);
    }
    return true;
  }
  /**
   * Deep clone for graph transformations
   */
  clone() {
    const clonedComponents = this.components.map((comp) => {
      const cloned2 = comp.clone();
      return cloned2;
    });
    const cloned = new _Molecule(
      this.name,
      clonedComponents,
      this.compartment,
      this.hasExplicitEmptyComponentList
    );
    cloned.label = this.label;
    return cloned;
  }
};

// src/services/graph/core/degeneracy.ts
var buildInducedSubgraph = (target, included) => {
  const includedSet = new Set(included);
  const oldToNew = /* @__PURE__ */ new Map();
  const clonedMolecules = [];
  for (const oldIdx of included) {
    const original = target.molecules[oldIdx];
    const clonedComponents = original.components.map((component) => {
      const clone2 = new Component(component.name, [...component.states]);
      clone2.state = component.state;
      clone2.wildcard = component.wildcard;
      return clone2;
    });
    const clone = new Molecule(
      original.name,
      clonedComponents,
      original.compartment,
      original.hasExplicitEmptyComponentList
    );
    clone.label = original.label;
    const newIdx = clonedMolecules.length;
    clonedMolecules.push(clone);
    oldToNew.set(oldIdx, newIdx);
  }
  const subgraph = new SpeciesGraph(clonedMolecules);
  const added = /* @__PURE__ */ new Set();
  const getBondLabel = (molIdx, compIdx, partnerCompIdx) => {
    const comp = target.molecules[molIdx]?.components[compIdx];
    if (!comp) {
      return void 0;
    }
    for (const [label, partnerIdx] of comp.edges.entries()) {
      if (partnerIdx === partnerCompIdx) {
        return label;
      }
    }
    return void 0;
  };
  for (const [key, partnerKey] of target.adjacency.entries()) {
    const [molStr, compStr] = key.split(".");
    const [partnerMolStr, partnerCompStr] = partnerKey.split(".");
    const molIdx = Number(molStr);
    const compIdx = Number(compStr);
    const partnerMolIdx = Number(partnerMolStr);
    const partnerCompIdx = Number(partnerCompStr);
    if (!Number.isInteger(molIdx) || !Number.isInteger(compIdx) || !Number.isInteger(partnerMolIdx) || !Number.isInteger(partnerCompIdx)) {
      continue;
    }
    if (!includedSet.has(molIdx) || !includedSet.has(partnerMolIdx)) {
      continue;
    }
    const bondKey = molIdx < partnerMolIdx || molIdx === partnerMolIdx && compIdx <= partnerCompIdx ? `${molIdx}.${compIdx}-${partnerMolIdx}.${partnerCompIdx}` : `${partnerMolIdx}.${partnerCompIdx}-${molIdx}.${compIdx}`;
    if (added.has(bondKey)) {
      continue;
    }
    added.add(bondKey);
    const newMolIdxA = oldToNew.get(molIdx);
    const newMolIdxB = oldToNew.get(partnerMolIdx);
    if (newMolIdxA === void 0 || newMolIdxB === void 0) {
      continue;
    }
    const label = getBondLabel(molIdx, compIdx, partnerCompIdx);
    subgraph.addBond(newMolIdxA, compIdx, newMolIdxB, partnerCompIdx, label);
  }
  return subgraph;
};
var countEmbeddingDegeneracy = (pattern, target, match) => {
  const matchedTargets = Array.from(new Set(match.moleculeMap.values()));
  if (matchedTargets.length === 0) {
    return 1;
  }
  const induced = buildInducedSubgraph(target, matchedTargets);
  const automorphisms = GraphMatcher.findAllMaps(pattern, induced);
  return automorphisms.length || 1;
};

// src/services/graph/NetworkGenerator.ts
var shouldLogNetworkGenerator = process.env.DEBUG_GENERATOR === "true";
var debugNetworkLog = (msg) => {
  if (shouldLogNetworkGenerator) {
    process.stderr.write(msg + "\n");
  }
};
var NetworkGenerator = class {
  constructor(options = {}) {
    this.speciesByMoleculeIndex = /* @__PURE__ */ new Map();
    this.startTime = 0;
    this.lastMemoryCheck = 0;
    this.aggLimitWarnings = 0;
    this.stoichLimitWarnings = 0;
    this.speciesLimitWarnings = 0;
    this.currentRuleName = null;
    this.options = {
      maxSpecies: 1e4,
      maxReactions: 1e5,
      maxIterations: 50,
      maxAgg: 500,
      maxStoich: 500,
      checkInterval: 500,
      memoryLimit: 1e9,
      ...options
    };
    this.currentRuleName = null;
  }
  async generate(seedSpecies, rules, onProgress, signal, onRuleApplication) {
    this.startTime = Date.now();
    this.lastMemoryCheck = this.startTime;
    this.aggLimitWarnings = 0;
    this.stoichLimitWarnings = 0;
    this.speciesLimitWarnings = 0;
    this.currentRuleName = null;
    this.speciesByMoleculeIndex.clear();
    const speciesMap = /* @__PURE__ */ new Map();
    const speciesList = [];
    const reactionsList = [];
    const queue = [];
    const processedPairs = /* @__PURE__ */ new Set();
    const ruleProcessedSpecies = /* @__PURE__ */ new Map();
    for (const rule of rules) {
      ruleProcessedSpecies.set(rule.name, /* @__PURE__ */ new Set());
    }
    for (const sg of seedSpecies) {
      const canonical = GraphCanonicalizer.canonicalize(sg);
      if (!speciesMap.has(canonical)) {
        const species = new Species(sg, speciesList.length);
        speciesMap.set(canonical, species);
        speciesList.push(species);
        this.indexSpecies(species);
        queue.push(sg);
      }
    }
    let iteration = 0;
    while (queue.length > 0 && iteration < this.options.maxIterations) {
      if (signal?.aborted) {
        throw new DOMException("Network generation cancelled", "AbortError");
      }
      await this.checkResourceLimits(signal);
      iteration++;
      const currentSpecies = queue.shift();
      const currentCanonical = GraphCanonicalizer.canonicalize(currentSpecies);
      const currentSpeciesObj = speciesMap.get(currentCanonical);
      if (shouldLogNetworkGenerator) {
        debugNetworkLog(
          "[NetworkGenerator] Iter " + iteration + ", Species " + currentSpeciesObj.index + ": " + currentSpecies.toString().slice(0, 100)
        );
      }
      for (const rule of rules) {
        if (signal?.aborted) {
          throw new DOMException("Network generation cancelled", "AbortError");
        }
        this.currentRuleName = rule.name;
        if (shouldLogNetworkGenerator) {
          try {
            const reactantInfo = (rule.reactants || []).map((r, i) => {
              try {
                return i + ":" + (r?.toString?.() ?? String(r)) + "[" + (r && typeof r === "object" && r.constructor ? r.constructor.name : typeof r) + "]";
              } catch (e) {
                return i + ":<unserializable>";
              }
            }).join(" | ");
            debugNetworkLog(
              "[NetworkGenerator] Dispatching rule: " + rule.name + ", Reactants count: " + (rule.reactants?.length ?? 0) + " -> " + reactantInfo
            );
          } catch (e) {
            debugNetworkLog("[NetworkGenerator] Dispatching rule: <error reading rule>");
          }
        }
        const pairKey = currentCanonical + "::" + rule.name;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        const ruleProcessed = ruleProcessedSpecies.get(rule.name);
        if (ruleProcessed.has(currentCanonical)) continue;
        ruleProcessed.add(currentCanonical);
        if (rule.reactants.length === 1) {
          if (shouldLogNetworkGenerator) {
            debugNetworkLog(
              "[applyUnimolecularRule] Applying unimolecular rule with reactant pattern: " + rule.reactants[0].toString()
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
          if (shouldLogNetworkGenerator) {
            debugNetworkLog(
              "[applyBimolecularRule] Applying bimolecular rule with patterns: " + rule.reactants[0].toString() + " + " + rule.reactants[1].toString()
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
            "Reached max reactions limit (" + this.options.maxReactions + ') while applying rule "' + (this.currentRuleName ?? "unknown") + '"'
          );
        }
      }
      this.currentRuleName = null;
      if (onProgress && iteration % 10 === 0) {
        onProgress({
          species: speciesList.length,
          reactions: reactionsList.length,
          iteration,
          memoryUsed: performance.memory?.usedJSHeapSize || 0,
          timeElapsed: Date.now() - this.startTime
        });
      }
    }
    return { species: speciesList, reactions: reactionsList };
  }
  async applyUnimolecularRule(rule, reactantSpecies, speciesMap, speciesList, queue, reactionsList, signal) {
    const pattern = rule.reactants[0];
    if (!reactantSpecies.graph.adjacencyBitset) {
      reactantSpecies.graph.buildAdjacencyBitset();
    }
    const matches = GraphMatcher.findAllMaps(pattern, reactantSpecies.graph);
    for (const match of matches) {
      if (signal?.aborted) {
        throw new DOMException("Network generation cancelled", "AbortError");
      }
      const degeneracy = countEmbeddingDegeneracy(pattern, reactantSpecies.graph, match);
      const products = this.applyRuleTransformation(
        rule,
        [rule.reactants[0]],
        [reactantSpecies.graph],
        [match]
      );
      if (!products || !this.validateProducts(products)) continue;
      const productSpeciesIndices = [];
      for (const product of products) {
        const productSpecies = this.addOrGetSpecies(product, speciesMap, speciesList, queue, signal);
        productSpeciesIndices.push(productSpecies.index);
      }
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
  async applyBimolecularRule(rule, reactant1Species, allSpecies, speciesMap, speciesList, queue, reactionsList, processedPairs, signal) {
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
    const shareTargets = (a, b) => {
      const mappedA = new Set(a.moleculeMap.values());
      for (const mol of b.moleculeMap.values()) {
        if (mappedA.has(mol)) {
          return true;
        }
      }
      return false;
    };
    const getDegeneracy = (cache, match, patternGraph, speciesGraph) => {
      const cached = cache.get(match);
      if (cached !== void 0) {
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
      const firstDegeneracyCache = /* @__PURE__ */ new WeakMap();
      const requiredMols = secondPattern.molecules.map((m) => m.name);
      let candidateIndices = null;
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
            const next = /* @__PURE__ */ new Set();
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
          throw new DOMException("Network generation cancelled", "AbortError");
        }
        if (!reactant2Species.graph.adjacencyBitset) {
          reactant2Species.graph.buildAdjacencyBitset();
        }
        const keyA = reactant1Species.index;
        const keyB = reactant2Species.index;
        const pairKey = Math.min(keyA, keyB) + "::" + Math.max(keyA, keyB) + "::" + rule.name;
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
          const matchesSecond = GraphMatcher.findAllMaps(secondPattern, reactant2Species.graph);
          const secondDegeneracyCache = /* @__PURE__ */ new WeakMap();
          for (const matchSecond of matchesSecond) {
            if (!allowIntramolecular && reactant1Species === reactant2Species && shareTargets(matchFirst, matchSecond)) {
              if (shouldLogNetworkGenerator) {
                debugNetworkLog(
                  "[applyBimolecularRule] Skipping intramolecular mapping (rule forbids it)"
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
            const productSpeciesIndices = [];
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
              throw new DOMException("Network generation cancelled", "AbortError");
            }
          }
        }
        if (producedReaction) {
          processedPairs.add(pairKey);
        }
      }
    }
  }
  addOrGetSpecies(graph, speciesMap, speciesList, queue, signal) {
    const canonical = GraphCanonicalizer.canonicalize(graph);
    if (speciesMap.has(canonical)) {
      return speciesMap.get(canonical);
    }
    if (speciesList.length >= this.options.maxSpecies) {
      this.warnSpeciesLimit();
      throw this.buildLimitError(
        "Max species limit reached (" + this.options.maxSpecies + ') while applying rule "' + (this.currentRuleName ?? "unknown") + '"'
      );
    }
    const species = new Species(graph, speciesList.length);
    speciesMap.set(canonical, species);
    speciesList.push(species);
    queue.push(graph);
    if (signal?.aborted) {
      throw new DOMException("Network generation cancelled", "AbortError");
    }
    this.indexSpecies(species);
    return species;
  }
  applyRuleTransformation(rule, reactantPatterns, reactantGraphs, matches) {
    if (shouldLogNetworkGenerator) {
      debugNetworkLog(
        "[applyTransformation] Rule " + rule.name + ", " + reactantGraphs.length + " reactants -> " + rule.products.length + " products"
      );
    }
    const participantMolIndices = /* @__PURE__ */ new Set();
    for (let r = 0; r < matches.length; r++) {
      const match = matches[r];
      for (const targetMolIdx of match.moleculeMap.values()) {
        participantMolIndices.add(r + ":" + targetMolIdx);
      }
    }
    const combinedGraph = new SpeciesGraph();
    const oldToNewMap = /* @__PURE__ */ new Map();
    for (let r = 0; r < reactantGraphs.length; r++) {
      const graph = reactantGraphs[r];
      for (let m = 0; m < graph.molecules.length; m++) {
        const key = r + ":" + m;
        if (!participantMolIndices.has(key)) {
          const clone = this.cloneMoleculeStructure(graph.molecules[m]);
          const newIdx = combinedGraph.molecules.length;
          combinedGraph.molecules.push(clone);
          oldToNewMap.set(key, newIdx);
        }
      }
    }
    const patternToProductMol = /* @__PURE__ */ new Map();
    const usedReactantMolecules = /* @__PURE__ */ new Set();
    for (let pIdx = 0; pIdx < rule.products.length; pIdx++) {
      const productPattern = rule.products[pIdx];
      for (let pMolIdx = 0; pMolIdx < productPattern.molecules.length; pMolIdx++) {
        const pMol = productPattern.molecules[pMolIdx];
        let found = false;
        for (let r = 0; r < reactantPatterns.length; r++) {
          const match = matches[r];
          if (!match) continue;
          for (const [patternMolIdx, targetMolIdx] of match.moleculeMap.entries()) {
            const templateMol = reactantPatterns[r].molecules[patternMolIdx];
            if (templateMol.name === pMol.name) {
              const key = r + ":" + targetMolIdx;
              if (usedReactantMolecules.has(key)) continue;
              const sourceMol = reactantGraphs[r].molecules[targetMolIdx];
              const clone = this.cloneMoleculeStructure(sourceMol);
              const newIdx = combinedGraph.molecules.length;
              combinedGraph.molecules.push(clone);
              oldToNewMap.set(key, newIdx);
              patternToProductMol.set(pIdx + ":" + pMolIdx, newIdx);
              usedReactantMolecules.add(key);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          const clone = this.cloneMoleculeStructure(pMol);
          const newIdx = combinedGraph.molecules.length;
          combinedGraph.molecules.push(clone);
          patternToProductMol.set(pIdx + ":" + pMolIdx, newIdx);
        }
      }
    }
    for (let pIdx = 0; pIdx < rule.products.length; pIdx++) {
      const productPattern = rule.products[pIdx];
      for (let pMolIdx = 0; pMolIdx < productPattern.molecules.length; pMolIdx++) {
        const newIdx = patternToProductMol.get(pIdx + ":" + pMolIdx);
        if (newIdx === void 0) continue;
        const productMol = combinedGraph.molecules[newIdx];
        const patternMol = productPattern.molecules[pMolIdx];
        for (const pComp of patternMol.components) {
          let comp = productMol.components.find((c) => c.name === pComp.name);
          if (!comp) {
            comp = new Component(pComp.name, [...pComp.states]);
            productMol.components.push(comp);
          }
          if (pComp.state && pComp.state !== "?") {
            comp.state = pComp.state;
          }
        }
      }
    }
    const productCompMap = /* @__PURE__ */ new Map();
    for (let pIdx = 0; pIdx < rule.products.length; pIdx++) {
      const productPattern = rule.products[pIdx];
      for (let pMolIdx = 0; pMolIdx < productPattern.molecules.length; pMolIdx++) {
        const newIdx = patternToProductMol.get(pIdx + ":" + pMolIdx);
        if (newIdx === void 0) continue;
        const patternMol = productPattern.molecules[pMolIdx];
        for (const pComp of patternMol.components) {
          productCompMap.set(newIdx + ":" + pComp.name, pComp);
        }
      }
    }
    const shouldPreserveBond = (newMolIdx, compName) => {
      const pComp = productCompMap.get(newMolIdx + ":" + compName);
      if (!pComp) return true;
      if (pComp.edges.size === 0 && !pComp.wildcard) return false;
      if (pComp.wildcard) return true;
      return false;
    };
    for (let r = 0; r < reactantGraphs.length; r++) {
      const graph = reactantGraphs[r];
      for (const [key, partnerKey] of graph.adjacency.entries()) {
        const [mStr, cStr] = key.split(".");
        const [m2Str, c2Str] = partnerKey.split(".");
        const m = parseInt(mStr);
        const c = parseInt(cStr);
        const m2 = parseInt(m2Str);
        const c2 = parseInt(c2Str);
        if (m2 < m || m2 === m && c2 < c) continue;
        const mol = graph.molecules[m];
        const comp = mol.components[c];
        const otherMol = graph.molecules[m2];
        const otherComp = otherMol.components[c2];
        let bondLabel;
        for (const [lbl, pCompIdx] of comp.edges.entries()) {
          if (pCompIdx === c2) {
            bondLabel = lbl;
            break;
          }
        }
        if (bondLabel === void 0) continue;
        const newMolIdx1 = oldToNewMap.get(r + ":" + m);
        const newMolIdx2 = oldToNewMap.get(r + ":" + m2);
        if (newMolIdx1 !== void 0 && newMolIdx2 !== void 0) {
          if (shouldPreserveBond(newMolIdx1, comp.name) && shouldPreserveBond(newMolIdx2, otherComp.name)) {
            const newMol1 = combinedGraph.molecules[newMolIdx1];
            const newMol2 = combinedGraph.molecules[newMolIdx2];
            const newCompIdx1 = newMol1.components.findIndex((xc) => xc.name === comp.name);
            const newCompIdx2 = newMol2.components.findIndex((xc) => xc.name === otherComp.name);
            if (newCompIdx1 !== -1 && newCompIdx2 !== -1) {
              combinedGraph.addBond(newMolIdx1, newCompIdx1, newMolIdx2, newCompIdx2, bondLabel);
            }
          }
        }
      }
    }
    const bondEndpoints = /* @__PURE__ */ new Map();
    for (let pIdx = 0; pIdx < rule.products.length; pIdx++) {
      const productPattern = rule.products[pIdx];
      for (let pCompIdx = 0; pCompIdx < productPattern.molecules.length; pCompIdx++) {
        const newMolIdx = patternToProductMol.get(pIdx + ":" + pCompIdx);
        if (newMolIdx === void 0) continue;
        const patternMol = productPattern.molecules[pCompIdx];
        for (const pComp of patternMol.components) {
          for (const [bondLabel, targetCompIdx] of pComp.edges.entries()) {
            if (bondLabel === 0) continue;
            const targetMol = productPattern.molecules[targetCompIdx];
            const targetComp = targetMol.components.find((c) => c.name === pComp.name);
            if (!targetComp) continue;
            const newTargetMolIdx = patternToProductMol.get(pIdx + ":" + targetCompIdx);
            if (newTargetMolIdx === void 0) continue;
            const key = Math.min(newMolIdx, newTargetMolIdx) + ":" + Math.max(newMolIdx, newTargetMolIdx);
            if (!bondEndpoints.has(bondLabel)) {
              bondEndpoints.set(bondLabel, []);
            }
            bondEndpoints.get(bondLabel).push({ newMolIdx, compName: pComp.name });
            bondEndpoints.get(bondLabel).push({ newMolIdx: newTargetMolIdx, compName: targetComp.name });
          }
        }
      }
    }
    for (const [bondLabel, endpoints] of bondEndpoints.entries()) {
      if (endpoints.length !== 2) {
        console.warn("[NetworkGenerator] Bond label " + bondLabel + " has " + endpoints.length + " endpoints, expected 2. Skipping.");
        continue;
      }
      const ep1 = endpoints[0];
      const ep2 = endpoints[1];
      const newMol1 = combinedGraph.molecules[ep1.newMolIdx];
      const newMol2 = combinedGraph.molecules[ep2.newMolIdx];
      const newCompIdx1 = newMol1.components.findIndex((xc) => xc.name === ep1.compName);
      const newCompIdx2 = newMol2.components.findIndex((xc) => xc.name === ep2.compName);
      if (newCompIdx1 !== -1 && newCompIdx2 !== -1) {
        combinedGraph.addBond(ep1.newMolIdx, newCompIdx1, ep2.newMolIdx, newCompIdx2, bondLabel);
      }
    }
    return [combinedGraph];
  }
  cloneMoleculeStructure(source) {
    const clonedComponents = source.components.map((c) => {
      const cloned = new Component(c.name, [...c.states]);
      cloned.state = c.state;
      cloned.wildcard = c.wildcard;
      cloned.edges = new Map(c.edges);
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
  indexSpecies(species) {
    for (const m of species.graph.molecules) {
      const set = this.speciesByMoleculeIndex.get(m.name) ?? /* @__PURE__ */ new Set();
      set.add(species.index);
      this.speciesByMoleculeIndex.set(m.name, set);
    }
  }
  isDuplicateReaction(rxn, reactionsList) {
    const key = JSON.stringify({
      reactants: rxn.reactants.slice().sort(),
      products: rxn.products.slice().sort()
    });
    return reactionsList.some((existing) => {
      const existingKey = JSON.stringify({
        reactants: existing.reactants.slice().sort(),
        products: existing.products.slice().sort()
      });
      return key === existingKey;
    });
  }
  async checkResourceLimits(signal) {
    const now = Date.now();
    if (now - this.lastMemoryCheck > this.options.checkInterval) {
      this.lastMemoryCheck = now;
      const memory = performance.memory;
      if (process.env.DEBUG_BARUA === "true" && memory) {
        debugNetworkLog("[DEBUG] Memory: " + (memory.usedJSHeapSize / 1e6).toFixed(1) + " MB");
      }
      if (memory && memory.usedJSHeapSize > this.options.memoryLimit) {
        throw new Error(
          "Memory limit exceeded: " + (memory.usedJSHeapSize / 1e6).toFixed(0) + " MB > " + (this.options.memoryLimit / 1e6).toFixed(0) + " MB"
        );
      }
      if (signal?.aborted) {
        throw new Error("Network generation aborted by user");
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  validateProducts(products) {
    for (const product of products) {
      if (product.molecules.length > this.options.maxAgg) {
        this.warnAggLimit(product.molecules.length);
        throw this.buildLimitError(
          "Species exceeds max complex size (" + this.options.maxAgg + '); rule "' + (this.currentRuleName ?? "unknown") + '" likely produces runaway polymerization.'
        );
      }
      const typeCounts = /* @__PURE__ */ new Map();
      for (const mol of product.molecules) {
        typeCounts.set(mol.name, (typeCounts.get(mol.name) || 0) + 1);
      }
      for (const [typeName, count] of typeCounts.entries()) {
        if (count > this.options.maxStoich) {
          this.warnStoichLimit(count);
          throw this.buildLimitError(
            "Species exceeds max stoichiometry (" + this.options.maxStoich + ') for molecule type "' + typeName + '" under rule "' + (this.currentRuleName ?? "unknown") + '".'
          );
        }
      }
      for (const mol of product.molecules) {
        for (const comp of mol.components) {
          if (comp.wildcard === "+" && comp.edges.size === 0) {
            console.warn("[validateProducts] Component marked !+ but no bond present; rejecting product");
            return false;
          }
          if (comp.wildcard === "?" && comp.edges.size > 0) {
            console.warn("[validateProducts] Component marked !? but bond detected; rejecting product");
            return false;
          }
        }
      }
    }
    return true;
  }
  warnAggLimit(count) {
    if (this.aggLimitWarnings < 5) {
      console.warn("Species exceeds max_agg: " + count);
    } else if (this.aggLimitWarnings === 5) {
      console.warn("Species exceeds max_agg: additional occurrences suppressed");
    }
    this.aggLimitWarnings++;
  }
  warnStoichLimit(count) {
    if (this.stoichLimitWarnings < 5) {
      console.warn("Species exceeds max_stoich: " + count);
    } else if (this.stoichLimitWarnings === 5) {
      console.warn("Species exceeds max_stoich: additional occurrences suppressed");
    }
    this.stoichLimitWarnings++;
  }
  warnSpeciesLimit() {
    if (this.speciesLimitWarnings < 5) {
      console.warn("Max species limit reached");
    } else if (this.speciesLimitWarnings === 5) {
      console.warn("Max species limit reached: additional occurrences suppressed");
    }
    this.speciesLimitWarnings++;
  }
  buildLimitError(message) {
    const err = new Error(message);
    err.name = "NetworkGenerationLimitError";
    return err;
  }
};

// src/services/graph/core/RxnRule.ts
var RxnRule = class {
  constructor(name, reactants, products, rateConstant, options = {}) {
    this.name = name;
    this.reactants = reactants;
    this.products = products;
    this.rateConstant = rateConstant;
    this.allowsIntramolecular = options.allowsIntramolecular ?? false;
    this.deleteBonds = [];
    this.addBonds = [];
    this.changeStates = [];
    this.deleteMolecules = [];
    this.addMolecules = [];
    this.excludeReactants = [];
    this.includeReactants = [];
    this.isDeleteMolecules = false;
    this.isMoveConnected = false;
  }
  /**
   * BioNetGen: RxnRule::toString()
   */
  toString() {
    const reactantStr = this.reactants.map((r) => r.toString()).join(" + ");
    const productStr = this.products.map((p) => p.toString()).join(" + ");
    return `${reactantStr} -> ${productStr} ${this.rateConstant}`;
  }
  /**
   * Returns true when this rule appears to transport molecules between compartments
   * (e.g., A@cyto -> A@nuc). This is a heuristic used to detect possible transport rules.
   */
  isTransportRule() {
    const reactantCompartments = /* @__PURE__ */ new Map();
    const productCompartments = /* @__PURE__ */ new Map();
    for (const r of this.reactants) {
      for (const mol of r.molecules) {
        if (!reactantCompartments.has(mol.name)) reactantCompartments.set(mol.name, /* @__PURE__ */ new Set());
        reactantCompartments.get(mol.name).add(mol.compartment ?? "default");
      }
    }
    for (const p of this.products) {
      for (const mol of p.molecules) {
        if (!productCompartments.has(mol.name)) productCompartments.set(mol.name, /* @__PURE__ */ new Set());
        productCompartments.get(mol.name).add(mol.compartment ?? "default");
      }
    }
    for (const [name, rComps] of reactantCompartments.entries()) {
      const pComps = productCompartments.get(name);
      if (!pComps) continue;
      const all = /* @__PURE__ */ new Set([...rComps, ...pComps]);
      if (all.size > rComps.size || all.size > pComps.size) return true;
    }
    return false;
  }
  /**
   * Apply constraints to the rule
   * @param constraints List of constraint strings (e.g., "exclude_reactants(1, A(b~P))")
   * @param parser Callback to parse BNGL patterns into SpeciesGraph
   */
  applyConstraints(constraints, parser) {
    for (const constraint of constraints) {
      const match = constraint.match(/^(exclude_reactants|include_reactants)\s*\(\s*(\d+)\s*,\s*(.+)\s*\)$/);
      if (match) {
        const type = match[1];
        const index = parseInt(match[2], 10);
        const patternStr = match[3];
        try {
          const pattern = parser(patternStr);
          const reactantIndex = index - 1;
          if (type === "exclude_reactants") {
            this.excludeReactants.push({ reactantIndex, pattern });
          } else if (type === "include_reactants") {
            this.includeReactants.push({ reactantIndex, pattern });
          }
        } catch (e) {
          console.warn(`Failed to parse pattern in constraint: ${constraint}`, e);
        }
      } else {
        console.warn(`Unknown or malformed constraint: ${constraint}`);
      }
    }
  }
};

// src/services/graph/core/BNGLParser.ts
var BNGLParser = class {
  /**
   * Parse a BNGL species string into SpeciesGraph
   * Example: "A(b!1).B(a!1)" -> SpeciesGraph with two molecules connected by bond 1
   */
  static parseSpeciesGraph(bnglString, resolveBonds = true) {
    const graph = new SpeciesGraph();
    if (!bnglString.trim()) return graph;
    const moleculeStrings = bnglString.split(".");
    for (const molStr of moleculeStrings) {
      const molecule = this.parseMolecule(molStr.trim());
      graph.molecules.push(molecule);
    }
    if (resolveBonds) {
      const bondMap = /* @__PURE__ */ new Map();
      graph.molecules.forEach((mol, molIdx) => {
        mol.components.forEach((comp, compIdx) => {
          for (const bond of comp.edges.keys()) {
            if (!bondMap.has(bond)) bondMap.set(bond, []);
            bondMap.get(bond).push({ molIdx, compIdx });
          }
        });
      });
      bondMap.forEach((partners) => {
        if (partners.length === 2) {
          const [p1, p2] = partners;
          graph.addBond(p1.molIdx, p1.compIdx, p2.molIdx, p2.compIdx);
        }
      });
    }
    return graph;
  }
  /**
   * Parse a BNGL molecule string
   * Example: "A(b!1,c~P)" -> Molecule with name A, components b (bonded) and c (phosphorylated)
   */
  static parseMolecule(molStr) {
    const match = molStr.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?(?:@([A-Za-z0-9_]+))?\s*$/);
    if (!match) {
      return new Molecule(molStr, []);
    }
    const name = match[1];
    const componentStr = match[2] || "";
    const compartment = match[3];
    if (!componentStr.trim()) {
      return new Molecule(name, [], compartment, true);
    }
    const components = [];
    const compStrings = componentStr.split(",");
    for (const compStr of compStrings) {
      const component = this.parseComponent(compStr.trim());
      components.push(component);
    }
    return new Molecule(name, components, compartment);
  }
  /**
   * Parse a BNGL component string
   * Examples: "b!1" (bonded), "c~P" (state), "d" (unbound)
   */
  static parseComponent(compStr) {
    const parts = compStr.split("!");
    const nameAndStates = parts[0].trim();
    const bondPart = parts[1];
    const stateParts = nameAndStates.split("~");
    const name = stateParts[0];
    const states = stateParts.slice(1);
    const component = new Component(name, states);
    if (states.length > 0) component.state = states[0];
    if (bondPart) {
      if (bondPart === "+" || bondPart === "?" || bondPart === "-") {
        component.wildcard = bondPart;
      } else {
        const bond = parseInt(bondPart);
        if (!isNaN(bond)) {
          component.edges.set(bond, -1);
        }
      }
    }
    return component;
  }
  /**
   * Parse a BNGL reaction rule string into RxnRule
   * Example: "A(b) + B(a) -> A(b!1).B(a!1)"
   */
  static parseRxnRule(ruleStr, rateConstant, name) {
    let processedRuleStr = ruleStr;
    let bondCounter = 1;
    while (processedRuleStr.includes("!+")) {
      processedRuleStr = processedRuleStr.replace("!+", `!${bondCounter}`);
      bondCounter++;
    }
    const arrowRegex = /(?:<->|->|<-|~>)/;
    const arrowMatch = processedRuleStr.match(arrowRegex);
    if (!arrowMatch) throw new Error(`Invalid rule (no arrow found): ${ruleStr}`);
    const parts = processedRuleStr.split(arrowRegex).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) throw new Error(`Invalid rule: ${ruleStr}`);
    const reactantsStr = parts[0];
    const productsStr = parts.slice(1).join(" ");
    const parseEntityList2 = (segment) => {
      if (!segment || !segment.trim()) return [];
      const topLevelCandidates = segment.split(/\s*\+\s*|(?<=\S)\s{2,}(?=\S)/).map((s) => s.trim()).filter(Boolean);
      const parts2 = [];
      for (const cand of topLevelCandidates) {
        let current = "";
        let depth = 0;
        for (let i = 0; i < cand.length; i++) {
          const ch = cand[i];
          if (ch === "(" || ch === "[" || ch === "{") depth++;
          else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
          current += ch;
        }
        if (current.trim()) parts2.push(current.trim());
      }
      if (parts2.length === 1 && parts2[0].includes(" ")) {
        const moreParts = [];
        let cur = "";
        let d = 0;
        for (let i = 0; i < segment.length; i++) {
          const ch = segment[i];
          if (ch === "(") d++;
          else if (ch === ")") d = Math.max(0, d - 1);
          if (d === 0 && ch === " ") {
            if (cur.trim()) moreParts.push(cur.trim());
            cur = "";
            while (i + 1 < segment.length && segment[i + 1] === " ") i++;
            continue;
          }
          cur += ch;
        }
        if (cur.trim()) moreParts.push(cur.trim());
        if (moreParts.length > 1) return moreParts;
      }
      return parts2;
    };
    const reactants = parseEntityList2(reactantsStr).map((s) => this.parseSpeciesGraph(s.trim(), true));
    const products = parseEntityList2(productsStr).map((s) => this.parseSpeciesGraph(s.trim(), false));
    return new RxnRule(name || "", reactants, products, rateConstant);
  }
  /**
   * Convert SpeciesGraph back to BNGL string
   */
  static speciesGraphToString(graph) {
    return graph.toString();
  }
  /**
   * Convert RxnRule back to BNGL string
   */
  static rxnRuleToString(rule) {
    const reactants = rule.reactants.map((r) => this.speciesGraphToString(r)).join(" + ");
    const products = rule.products.map((p) => this.speciesGraphToString(p)).join(" + ");
    return `${reactants} -> ${products}`;
  }
  /**
   * Parse seed species block and evaluate expressions
   */
  static parseSeedSpecies(block, parameters) {
    const seed = /* @__PURE__ */ new Map();
    for (const raw of block.split("\n")) {
      const line = raw.split("#")[0].trim();
      if (!line) continue;
      const m = line.match(/^\s*(\S+(?:\([^)]*\))?(?:\.\S+(?:\([^)]*\))?)*)\s+(.+)$/);
      if (!m) continue;
      const speciesStr = m[1].trim();
      const amountExpr = m[2].trim();
      console.log("[parseSeedSpecies] Species:", speciesStr, "Amount expr:", amountExpr);
      const amt = this.evaluateExpression(amountExpr, parameters);
      console.log("[parseSeedSpecies] Evaluated to:", amt);
      seed.set(speciesStr, amt);
    }
    return seed;
  }
  /**
   * Evaluate mathematical expressions with parameter substitution
   */
  static evaluateExpression(expr, parameters) {
    try {
      let evaluable = expr;
      const sortedParams = Array.from(parameters.entries()).sort((a, b) => b[0].length - a[0].length);
      for (const [name, value] of sortedParams) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escapedName}\\b`, "g");
        evaluable = evaluable.replace(regex, value.toString());
      }
      console.log(`[evaluateExpression] "${expr}" => "${evaluable}"`);
      const result = new Function(`return ${evaluable}`)();
      return typeof result === "number" && !isNaN(result) ? result : 0;
    } catch (e) {
      console.error(`[evaluateExpression] Failed to evaluate: "${expr}"`, e);
      return 0;
    }
  }
};

// services/parseBNGL.ts
var speciesPattern = /^[A-Za-z0-9_]+(?:\([^)]*\))?(?:\.[A-Za-z0-9_]+(?:\([^)]*\))?)*$/;
var escapeRegex = (value) => {
  const ESCAPE_CODES = {
    92: true,
    94: true,
    36: true,
    42: true,
    43: true,
    63: true,
    46: true,
    40: true,
    41: true,
    124: true,
    91: true,
    93: true,
    123: true,
    125: true
  };
  let result = "";
  for (let i = 0; i < value.length; i++) {
    const codePoint = value.charCodeAt(i);
    if (ESCAPE_CODES[codePoint]) {
      result += "\\";
    }
    result += value[i];
  }
  return result;
};
var cleanLine = (line) => {
  if (typeof line !== "string") return "";
  return line.replace(/#.*$/, "").trim();
};
var extractInlineComment = (line) => {
  if (typeof line !== "string") return void 0;
  const m = line.match(/#(.*)$/);
  if (!m) return void 0;
  return m[1].trim();
};
var parseEntityList = (segment) => {
  const parts = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "+" && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};
var splitProductsAndRates = (segment, parameters) => {
  const tokens = segment.trim().split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { productChunk: "", rateChunk: "" };
  }
  const rateTokens = [];
  while (tokens.length > 0) {
    let token = tokens[tokens.length - 1];
    if (token.includes(",") && !token.includes("(") && !token.includes(")")) {
      tokens.pop();
      const commaParts = token.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
      if (commaParts.length > 1) {
        for (let idx = commaParts.length - 1; idx >= 0; idx -= 1) {
          tokens.push(commaParts[idx]);
        }
        continue;
      }
      if (commaParts.length === 1) {
        token = commaParts[0];
        tokens.push(token);
      } else {
        continue;
      }
    }
    token = tokens[tokens.length - 1];
    const cleaned = token.replace(/,$/, "");
    const isParam = Object.hasOwn(parameters, cleaned);
    const numeric = cleaned !== "" && !Number.isNaN(parseFloat(cleaned));
    const looksLikeSpecies = speciesPattern.test(cleaned);
    const isKeyword = /^(exclude_reactants|include_reactants)/.test(cleaned);
    const expressionToken = (!looksLikeSpecies || isKeyword) && /[*/()+-]/.test(cleaned);
    const singleZeroProduct = tokens.length === 1 && cleaned === "0";
    if (!isParam && !numeric && !expressionToken && !isKeyword || singleZeroProduct) break;
    rateTokens.push(cleaned);
    tokens.pop();
  }
  return {
    productChunk: tokens.join(" ").trim(),
    rateChunk: rateTokens.reverse().join(" ").trim()
  };
};
function parseBNGL(code, options = {}) {
  const { checkCancelled, debug } = options;
  const logDebug = (...args) => {
    if (debug) {
      console.log(...args);
    }
  };
  const maybeCancel = () => {
    if (checkCancelled) {
      checkCancelled();
    }
  };
  const getBlockContent = (blockName, sourceCode) => {
    const escapedBlock = escapeRegex(blockName);
    const beginPattern = new RegExp("^\\s*begin\\s+" + escapedBlock + "\\b", "i");
    const endPattern = new RegExp("^\\s*end\\s+" + escapedBlock + "\\b", "i");
    const lines = sourceCode.split(/\r?\n/);
    const collected = [];
    let inBlock = false;
    for (const rawLine of lines) {
      maybeCancel();
      const lineWithoutComments = rawLine.replace(/#.*$/, "").trim();
      if (!inBlock) {
        if (beginPattern.test(lineWithoutComments)) {
          inBlock = true;
        }
        continue;
      }
      if (endPattern.test(lineWithoutComments)) {
        break;
      }
      collected.push(lineWithoutComments);
    }
    return collected.join("\n").trim();
  };
  const model = {
    parameters: {},
    moleculeTypes: [],
    species: [],
    observables: [],
    reactions: [],
    reactionRules: []
  };
  const paramsContent = getBlockContent("parameters", code);
  if (paramsContent) {
    for (const line of paramsContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
      if (cleaned) {
        const parts = cleaned.split(/\s+/);
        if (parts.length >= 2) {
          const value = parseFloat(parts[1]);
          model.parameters[parts[0]] = value;
          logDebug("[parseBNGL] parameter", parts[0], value);
        }
      }
    }
  }
  const molTypesContent = getBlockContent("molecule types", code);
  if (molTypesContent) {
    for (const line of molTypesContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
      if (cleaned) {
        const match = cleaned.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?\s*$/);
        if (match) {
          const name = match[1];
          const componentsStr = match[2] || "";
          const components = componentsStr ? componentsStr.split(",").map((c) => c.trim()).filter(Boolean) : [];
          model.moleculeTypes.push({ name, components, comment: extractInlineComment(line) });
        } else {
          model.moleculeTypes.push({ name: cleaned, components: [], comment: extractInlineComment(line) });
        }
      }
    }
  }
  let speciesContent = getBlockContent("seed species", code);
  if (!speciesContent) {
    speciesContent = getBlockContent("species", code);
  }
  if (speciesContent) {
    const parametersMap = new Map(Object.entries(model.parameters));
    const seedSpeciesMap = BNGLParser.parseSeedSpecies(speciesContent, parametersMap);
    const completeSpeciesName = (partial) => {
      if (partial.includes(".")) {
        return partial.split(".").map((m) => completeSpeciesName(m.trim())).join(".");
      }
      const mm = partial.match(/^([A-Za-z0-9_]+)(\(([^)]*)\))?(?:@([A-Za-z0-9_]+))?$/);
      if (!mm) return partial;
      const name = mm[1];
      const specified = (mm[3] || "").trim();
      const compartment = mm[4];
      if (specified) return `${name}(${specified})${compartment ? `@${compartment}` : ""}`;
      const mt = model.moleculeTypes.find((m) => m.name === name);
      if (!mt) return partial;
      const comps = mt.components.map((c) => {
        const [base, ...states] = c.split("~");
        return states.length ? `${base}~${states[0]}` : base;
      });
      return `${name}(${comps.join(",")})${compartment ? `@${compartment}` : ""}`;
    };
    for (const [s, amt] of seedSpeciesMap.entries()) {
      maybeCancel();
      const completed = completeSpeciesName(s);
      logDebug("[parseBNGL] seed species", s, "=>", completed, amt);
      model.species.push({ name: completed, initialConcentration: amt });
    }
  }
  const compartmentsContent = getBlockContent("compartments", code);
  if (compartmentsContent) {
    model.compartments = [];
    for (const rawLine of compartmentsContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(rawLine);
      if (!cleaned) continue;
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length >= 3) {
        const name = parts[0];
        const dimension = parseInt(parts[1], 10) || 3;
        const rawSize = parts[2];
        const sizeVal = parseFloat(rawSize);
        const size = Number.isNaN(sizeVal) ? 1 : sizeVal;
        const parent = parts[3];
        model.compartments.push({ name, dimension, size, parent });
      }
    }
  }
  const observablesContent = getBlockContent("observables", code);
  if (observablesContent) {
    for (const line of observablesContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
      if (cleaned) {
        const parts = cleaned.split(/\s+/);
        if (parts.length >= 3 && (parts[0].toLowerCase() === "molecules" || parts[0].toLowerCase() === "species")) {
          model.observables.push({ type: parts[0].toLowerCase(), name: parts[1], pattern: parts.slice(2).join(" "), comment: extractInlineComment(line) });
        }
      }
    }
  }
  let rulesContent = getBlockContent("reaction rules", code);
  if (!rulesContent) {
    rulesContent = getBlockContent("reactions", code);
  }
  if (rulesContent) {
    const statements = [];
    let current = "";
    for (const line of rulesContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
      if (!cleaned) continue;
      if (cleaned.endsWith("\\")) {
        current += cleaned.slice(0, -1).trim() + " ";
      } else {
        current += cleaned;
        statements.push(current.trim());
        current = "";
      }
    }
    if (current.trim()) {
      statements.push(current.trim());
    }
    statements.forEach((statement) => {
      maybeCancel();
      let ruleLine = statement;
      let ruleName;
      const labelMatch = ruleLine.match(/^[^:]+:\s*(.*)$/);
      if (labelMatch) {
        const labelSegment = statement.split(":")[0]?.trim();
        if (labelSegment) {
          ruleName = labelSegment;
        }
        ruleLine = labelMatch[1];
      }
      const arrowRegex = /(?:<->|->|<-|~>|-)/;
      const arrowMatch = ruleLine.match(arrowRegex);
      if (!arrowMatch) {
        console.warn("[parseBNGL] Rule parsing failed - no arrow found:", statement);
        return;
      }
      const arrow = arrowMatch[0];
      const isBidirectional = arrow === "<->" || arrow === "-";
      const arrowIndex = ruleLine.indexOf(arrow);
      if (arrowIndex < 0) {
        console.warn("[parseBNGL] Rule parsing failed - arrow index not found:", statement);
        return;
      }
      const reactantsPart = ruleLine.slice(0, arrowIndex).trim();
      const productsAndRatesPart = ruleLine.slice(arrowIndex + arrow.length).trim();
      const reactants = parseEntityList(reactantsPart);
      if (reactants.length === 0) {
        console.warn("[parseBNGL] Rule parsing: no reactants parsed for:", statement);
        return;
      }
      const { productChunk, rateChunk } = splitProductsAndRates(productsAndRatesPart, model.parameters);
      const rawProducts = productChunk ? parseEntityList(productChunk) : [];
      const products = rawProducts.length === 1 && rawProducts[0] === "0" ? [] : rawProducts;
      const tokenizeRateChunk = (chunk) => {
        const tokens = [];
        let current2 = "";
        let depth = 0;
        for (let i = 0; i < chunk.length; i++) {
          const ch = chunk[i];
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          if ((ch === "," || /\s/.test(ch)) && depth === 0) {
            if (current2.trim()) tokens.push(current2.trim());
            current2 = "";
          } else {
            current2 += ch;
          }
        }
        if (current2.trim()) tokens.push(current2.trim());
        return tokens;
      };
      const allRateTokens = tokenizeRateChunk(rateChunk);
      const constraints = [];
      const rateConstants = [];
      allRateTokens.forEach((token) => {
        if (token.startsWith("exclude_reactants") || token.startsWith("include_reactants")) {
          constraints.push(token);
        } else {
          rateConstants.push(token);
        }
      });
      const forwardRateLabel = rateConstants[0] ?? "";
      const reverseRateLabel = rateConstants[1];
      if (products.length === 0 && forwardRateLabel === "") {
        console.warn("[parseBNGL] Rule parsing: could not determine products or rate for:", statement);
        return;
      }
      model.reactionRules.push({
        name: ruleName,
        reactants,
        products,
        rate: forwardRateLabel,
        isBidirectional,
        reverseRate: isBidirectional ? reverseRateLabel : void 0,
        constraints,
        comment: extractInlineComment(statement)
      });
    });
  }
  model.reactionRules.forEach((rule) => {
    maybeCancel();
    const forwardRate = model.parameters[rule.rate] ?? parseFloat(rule.rate);
    if (!Number.isNaN(forwardRate)) {
      model.reactions.push({
        reactants: rule.reactants,
        products: rule.products,
        rate: rule.rate,
        rateConstant: forwardRate
      });
    }
    if (rule.isBidirectional && rule.reverseRate) {
      const reverseRate = model.parameters[rule.reverseRate] ?? parseFloat(rule.reverseRate);
      if (!Number.isNaN(reverseRate)) {
        model.reactions.push({
          reactants: rule.products,
          products: rule.reactants,
          rate: rule.reverseRate,
          rateConstant: reverseRate
        });
      }
    }
  });
  return model;
}

// scripts/debug_barua.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
process.env.DEBUG_NETWORK_GENERATOR = "true";
process.env.DEBUG_BARUA = "true";
async function runDebug() {
  const bnglPath = path.resolve(process.cwd(), "published-models/complex-models/Barua_2007.bngl");
  console.log("Reading BNGL from:", bnglPath);
  const code = fs.readFileSync(bnglPath, "utf8");
  const model = parseBNGL(code);
  console.log(`Parsed ${model.species.length} seed species.`);
  console.log(`Parsed ${model.reactionRules.length} rules.`);
  const seedSpecies = model.species.map((s) => BNGLParser.parseSpeciesGraph(s.name));
  const formatSpeciesList = (list) => list.length > 0 ? list.join(" + ") : "0";
  const rules = model.reactionRules.flatMap((r) => {
    const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
    const reverseRate = r.reverseRate ? model.parameters[r.reverseRate] ?? parseFloat(r.reverseRate) : rate;
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join("+") + "->" + r.products.join("+");
    if (r.constraints && r.constraints.length > 0) {
      console.log(`[DEBUG] Applying constraints to rule ${r.name}`);
      forwardRule.applyConstraints(r.constraints, (s) => BNGLParser.parseSpeciesGraph(s));
    }
    if (r.isBidirectional) {
      const reverseRuleStr = `${formatSpeciesList(r.products)} -> ${formatSpeciesList(r.reactants)}`;
      const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
      reverseRule.name = r.products.join("+") + "->" + r.reactants.join("+");
      return [forwardRule, reverseRule];
    } else {
      return [forwardRule];
    }
  });
  console.log(`Generated ${rules.length} rule objects.`);
  const generator = new NetworkGenerator({
    maxSpecies: 50,
    // Very low limit for smoke test
    maxReactions: 1e3,
    maxIterations: 5,
    checkInterval: 10
    // Check limits frequently
  });
  try {
    console.log("Starting generation...");
    const result = await generator.generate(seedSpecies, rules, (progress) => {
      process.stderr.write(`Progress: Iter ${progress.iteration}, Species ${progress.species}, Rxns ${progress.reactions}, Mem ${(progress.memoryUsed / 1024 / 1024).toFixed(1)}MB
`);
    });
    console.log("Generation complete.");
    console.log(`Species: ${result.species.length}`);
    console.log(`Reactions: ${result.reactions.length}`);
  } catch (e) {
    console.error("Generation failed:", e.message);
    if (e.stack) console.error(e.stack);
  }
}
runDebug();
