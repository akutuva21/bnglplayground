import { SpeciesGraph } from './SpeciesGraph.ts';
import { Molecule } from './Molecule.ts';
import { Component } from './Component.ts';
import { GraphMatcher, type MatchMap } from './Matcher.ts';

const buildInducedSubgraph = (target: SpeciesGraph, included: number[]): SpeciesGraph => {
  const includedSet = new Set(included);
  const oldToNew = new Map<number, number>();

  const clonedMolecules: Molecule[] = [];
  for (const oldIdx of included) {
    const original = target.molecules[oldIdx];
    const clonedComponents = original.components.map(component => {
      const clone = new Component(component.name, [...component.states]);
      clone.state = component.state;
      clone.wildcard = component.wildcard;
      return clone;
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
  const added = new Set<string>();

  const getBondLabel = (
    molIdx: number,
    compIdx: number,
    partnerCompIdx: number
  ): number | undefined => {
    const comp = target.molecules[molIdx]?.components[compIdx];
    if (!comp) {
      return undefined;
    }
    for (const [label, partnerIdx] of comp.edges.entries()) {
      if (partnerIdx === partnerCompIdx) {
        return label;
      }
    }
    return undefined;
  };

  for (const [key, partnerKey] of target.adjacency.entries()) {
    const [molStr, compStr] = key.split('.');
    const [partnerMolStr, partnerCompStr] = partnerKey.split('.');
    const molIdx = Number(molStr);
    const compIdx = Number(compStr);
    const partnerMolIdx = Number(partnerMolStr);
    const partnerCompIdx = Number(partnerCompStr);

    if (
      !Number.isInteger(molIdx) ||
      !Number.isInteger(compIdx) ||
      !Number.isInteger(partnerMolIdx) ||
      !Number.isInteger(partnerCompIdx)
    ) {
      continue;
    }

    if (!includedSet.has(molIdx) || !includedSet.has(partnerMolIdx)) {
      continue;
    }

    // Only add each bond once
    const bondKey = molIdx < partnerMolIdx || (molIdx === partnerMolIdx && compIdx <= partnerCompIdx)
      ? `${molIdx}.${compIdx}-${partnerMolIdx}.${partnerCompIdx}`
      : `${partnerMolIdx}.${partnerCompIdx}-${molIdx}.${compIdx}`;

    if (added.has(bondKey)) {
      continue;
    }
    added.add(bondKey);

    const newMolIdxA = oldToNew.get(molIdx);
    const newMolIdxB = oldToNew.get(partnerMolIdx);
    if (newMolIdxA === undefined || newMolIdxB === undefined) {
      continue;
    }

    const label = getBondLabel(molIdx, compIdx, partnerCompIdx);
    subgraph.addBond(newMolIdxA, compIdx, newMolIdxB, partnerCompIdx, label);
  }

  return subgraph;
};

export const countEmbeddingDegeneracy = (
  pattern: SpeciesGraph,
  target: SpeciesGraph,
  match: MatchMap
): number => {
  const matchedTargets = Array.from(new Set(match.moleculeMap.values()));
  if (matchedTargets.length === 0) {
    return 1;
  }

  const induced = buildInducedSubgraph(target, matchedTargets);
  const automorphisms = GraphMatcher.findAllMaps(pattern, induced);
  return automorphisms.length || 1;
};
