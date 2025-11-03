// graph/core/Matcher.ts
import { SpeciesGraph } from './SpeciesGraph';
import { Molecule } from './Molecule';
import { Component } from './Component';

const shouldLogGraphMatcher =
  typeof process !== 'undefined' && process.env?.DEBUG_GRAPH_MATCHER === 'true';

export interface MatchMap {
  moleculeMap: Map<number, number>;      // pattern mol => target mol
  componentMap: Map<string, string>;     // "pMol.pCompIdx" => "tMol.tCompIdx"
}

/**
 * BioNetGen: Map::findMap() - VF2 subgraph isomorphism
 */
export class GraphMatcher {

  /**
   * Find ALL isomorphic embeddings of pattern in target
   * BioNetGen: SpeciesGraph::findMaps($pattern)
   */
  static findAllMaps(pattern: SpeciesGraph, target: SpeciesGraph): MatchMap[] {
    const matches: MatchMap[] = [];
    const state = new VF2State(pattern, target);

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
  static matchesPattern(pattern: SpeciesGraph, target: SpeciesGraph): boolean {
    const maps = this.findAllMaps(pattern, target);
    return maps.length > 0;
  }

  /**
   * VF2 recursive backtracking
   */
  private static vf2Backtrack(state: VF2State, matches: MatchMap[]): void {
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
}

interface BondEndpoint {
  molIdx: number;
  compIdx: number;
}

interface PendingComponentResult {
  patternMolIdx: number;
  targetMolIdx: number;
  mapping: Map<number, number>;
}

/**
 * VF2 matching state with BioNetGen semantic feasibility rules
 */
class VF2State {
  pattern: SpeciesGraph;
  target: SpeciesGraph;
  corePattern: Map<number, number>;
  coreTarget: Map<number, number>;
  componentMatches: Map<number, Map<number, number>>;
  pendingComponentResult?: PendingComponentResult;
  bondPartnerLookup: Map<string, BondEndpoint>;

  constructor(pattern: SpeciesGraph, target: SpeciesGraph) {
    this.pattern = pattern;
    this.target = target;
    this.corePattern = new Map();
    this.coreTarget = new Map();
    this.componentMatches = new Map();
    this.bondPartnerLookup = this.buildBondPartnerLookup();
  }

  isComplete(): boolean {
    return this.corePattern.size === this.pattern.molecules.length;
  }

  getCandidatePairs(): [number, number][] {
    const pairs: [number, number][] = [];

    for (let p = 0; p < this.pattern.molecules.length; p++) {
      if (this.corePattern.has(p)) continue;

      for (let t = 0; t < this.target.molecules.length; t++) {
        if (this.coreTarget.has(t)) continue;
        pairs.push([p, t]);
      }

      break;
    }

    return pairs;
  }

  isFeasible(pMol: number, tMol: number): boolean {
    this.pendingComponentResult = undefined;

    const patternMol = this.pattern.molecules[pMol];
    const targetMol = this.target.molecules[tMol];

    if (patternMol.name !== targetMol.name) {
      return false;
    }

    if (patternMol.compartment && patternMol.compartment !== targetMol.compartment) {
      return false;
    }

    // Ensure target has enough components of each required name
    const requiredCounts = new Map<string, number>();
    for (const comp of patternMol.components) {
      requiredCounts.set(comp.name, (requiredCounts.get(comp.name) ?? 0) + 1);
    }
    for (const [name, count] of requiredCounts.entries()) {
      const targetCount = targetMol.components.filter(c => c.name === name).length;
      if (targetCount < count) {
        return false;
      }
    }

    const componentMapping = this.matchComponents(pMol, tMol);
    if (!componentMapping) {
      return false;
    }

    this.pendingComponentResult = {
      patternMolIdx: pMol,
      targetMolIdx: tMol,
      mapping: componentMapping
    };

    return true;
  }

  addPair(p: number, t: number): void {
    this.corePattern.set(p, t);
    this.coreTarget.set(t, p);

    if (
      this.pendingComponentResult &&
      this.pendingComponentResult.patternMolIdx === p &&
      this.pendingComponentResult.targetMolIdx === t
    ) {
      this.componentMatches.set(p, new Map(this.pendingComponentResult.mapping));
    } else {
      const fallback = this.matchComponents(p, t) ?? new Map<number, number>();
      this.componentMatches.set(p, fallback);
    }

    this.pendingComponentResult = undefined;
  }

  removePair(p: number, t: number): void {
    this.corePattern.delete(p);
    this.coreTarget.delete(t);
    this.componentMatches.delete(p);
  }

  getMatch(): MatchMap {
    const componentMap = new Map<string, string>();

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

  private buildBondPartnerLookup(): Map<string, BondEndpoint> {
    const lookup = new Map<string, BondEndpoint>();
    const grouped = new Map<number, BondEndpoint[]>();

    for (let molIdx = 0; molIdx < this.pattern.molecules.length; molIdx++) {
      const mol = this.pattern.molecules[molIdx];
      mol.components.forEach((comp, compIdx) => {
        for (const bondLabel of comp.edges.keys()) {
          if (!grouped.has(bondLabel)) {
            grouped.set(bondLabel, []);
          }
          grouped.get(bondLabel)!.push({ molIdx, compIdx });
        }
      });
    }

    for (const [label, endpoints] of grouped.entries()) {
      if (endpoints.length < 2) continue;
      for (const endpoint of endpoints) {
        const partner = endpoints.find(ep => ep.molIdx !== endpoint.molIdx || ep.compIdx !== endpoint.compIdx);
        if (!partner) continue;
        lookup.set(this.componentBondKey(endpoint.molIdx, endpoint.compIdx, label), partner);
      }
    }

    return lookup;
  }

  private componentBondKey(molIdx: number, compIdx: number, bondLabel: number): string {
    return `${molIdx}.${compIdx}.${bondLabel}`;
  }

  private matchComponents(pMolIdx: number, tMolIdx: number): Map<number, number> | null {
    const patternMol = this.pattern.molecules[pMolIdx];
    if (patternMol.components.length === 0) {
      return new Map();
    }

    const order = patternMol.components
      .map((_, idx) => idx)
      .sort((a, b) => this.componentPriority(patternMol.components[b]) - this.componentPriority(patternMol.components[a]));

    const assignment = new Map<number, number>();
    const usedTargets = new Set<number>();

    const success = this.assignComponentsBacktrack(pMolIdx, tMolIdx, order, 0, assignment, usedTargets);
    return success ? assignment : null;
  }

  private assignComponentsBacktrack(
    pMolIdx: number,
    tMolIdx: number,
    order: number[],
    orderIdx: number,
    assignment: Map<number, number>,
    usedTargets: Set<number>
  ): boolean {
    if (orderIdx >= order.length) {
      return true;
    }

    const pCompIdx = order[orderIdx];
    const candidates = this.getComponentCandidates(pMolIdx, tMolIdx, pCompIdx, usedTargets);

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

  private getComponentCandidates(
    pMolIdx: number,
    tMolIdx: number,
    pCompIdx: number,
    usedTargets: Set<number>
  ): number[] {
    const pComp = this.pattern.molecules[pMolIdx].components[pCompIdx];
    const targetMol = this.target.molecules[tMolIdx];
    const candidates: number[] = [];

    for (let idx = 0; idx < targetMol.components.length; idx++) {
      if (usedTargets.has(idx)) continue;
      const tComp = targetMol.components[idx];
      if (tComp.name !== pComp.name) continue;
      if (!this.componentStateCompatible(pComp, tComp)) continue;
      candidates.push(idx);
    }

    return candidates;
  }

  private componentPriority(comp: Component): number {
    let score = 0;
    score += comp.edges.size * 10;
    if (comp.wildcard === '+') score += 5;
    if (comp.wildcard === '?') score += 1;
    if (!comp.wildcard && comp.edges.size === 0) score += 2;
    if (comp.state && comp.state !== '?') score += 3;
    return score;
  }

  private isComponentAssignmentValid(
    pMolIdx: number,
    pCompIdx: number,
    tMolIdx: number,
    tCompIdx: number,
    currentAssignments: Map<number, number>
  ): boolean {
    if (!this.componentBondStateCompatible(pMolIdx, pCompIdx, tMolIdx, tCompIdx)) {
      return false;
    }

    if (!this.componentBondConsistencySatisfied(pMolIdx, pCompIdx, tMolIdx, tCompIdx, currentAssignments)) {
      return false;
    }

    return true;
  }

  private componentStateCompatible(patternComp: Component, targetComp: Component): boolean {
    if (!patternComp.state || patternComp.state === '?') {
      return true;
    }

    return targetComp.state === patternComp.state;
  }

  private componentBondStateCompatible(
    pMolIdx: number,
    pCompIdx: number,
    tMolIdx: number,
    tCompIdx: number
  ): boolean {
    const pComp = this.pattern.molecules[pMolIdx].components[pCompIdx];
    const hasSpecificBond = pComp.edges.size > 0;
    const targetBound = this.targetHasBond(tMolIdx, tCompIdx);

    if (pComp.wildcard === '+') {
      return targetBound;
    }

    if (pComp.wildcard === '?') {
      return true;
    }

    if (hasSpecificBond) {
      return targetBound;
    }

    return !targetBound;
  }

  private componentBondConsistencySatisfied(
    pMolIdx: number,
    pCompIdx: number,
    tMolIdx: number,
    tCompIdx: number,
    currentAssignments: Map<number, number>
  ): boolean {
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
          const targetPartnerCompIdx = currentAssignments.get(partnerCompIdx)!;
          if (!this.areComponentsBonded(tMolIdx, tCompIdx, tMolIdx, targetPartnerCompIdx)) {
            return false;
          }
        } else {
          const neighborKey = this.target.adjacency.get(this.getAdjacencyKey(tMolIdx, tCompIdx));
          if (!neighborKey) {
            return false;
          }
          const [neighborMolIdxStr] = neighborKey.split('.');
          if (Number(neighborMolIdxStr) !== tMolIdx) {
            return false;
          }
        }
      } else if (this.corePattern.has(partnerMolIdx)) {
        const targetPartnerMolIdx = this.corePattern.get(partnerMolIdx)!;
        const partnerComponentMap = this.componentMatches.get(partnerMolIdx);
        if (!partnerComponentMap) {
          return false;
        }
        const targetPartnerCompIdx = partnerComponentMap.get(partnerCompIdx);
        if (targetPartnerCompIdx === undefined) {
          return false;
        }
        if (!this.areComponentsBonded(tMolIdx, tCompIdx, targetPartnerMolIdx, targetPartnerCompIdx)) {
          return false;
        }
      } else {
        const neighborKey = this.target.adjacency.get(this.getAdjacencyKey(tMolIdx, tCompIdx));
        if (!neighborKey) {
          return false;
        }
        const [neighborMolIdxStr] = neighborKey.split('.');
        const neighborMolIdx = Number(neighborMolIdxStr);
        if (this.coreTarget.has(neighborMolIdx)) {
          const mappedPatternMol = this.coreTarget.get(neighborMolIdx)!;
          if (mappedPatternMol !== partnerMolIdx) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private getBondPartner(molIdx: number, compIdx: number, bondLabel: number): BondEndpoint | null {
    return (
      this.bondPartnerLookup.get(this.componentBondKey(molIdx, compIdx, bondLabel)) ?? null
    );
  }

  private targetHasBond(tMolIdx: number, tCompIdx: number): boolean {
    return this.target.adjacency.has(this.getAdjacencyKey(tMolIdx, tCompIdx));
  }

  private areComponentsBonded(
    tMolIdxA: number,
    tCompIdxA: number,
    tMolIdxB: number,
    tCompIdxB: number
  ): boolean {
    const keyA = this.getAdjacencyKey(tMolIdxA, tCompIdxA);
    const keyB = this.getAdjacencyKey(tMolIdxB, tCompIdxB);
    return this.target.adjacency.get(keyA) === keyB;
  }

  private getAdjacencyKey(molIdx: number, compIdx: number): string {
    return `${molIdx}.${compIdx}`;
  }
}