import type { ReactionRule } from '../../types';
import type { ContactEdge, ContactMap } from '../../types/visualization';
import {
  extractBonds,
  parseSpeciesGraphs,
  snapshotComponentStates,
} from './speciesGraphUtils';

interface ContactMapOptions {
  getRuleId?: (rule: ReactionRule, index: number) => string;
  getRuleLabel?: (rule: ReactionRule, index: number) => string;
}

export const buildContactMap = (
  rules: ReactionRule[],
  options: ContactMapOptions = {},
): ContactMap => {
  const nodeSet = new Set<string>();
  const edgeMap = new Map<string, ContactEdge>();

  rules.forEach((rule, ruleIndex) => {
    const ruleId = options.getRuleId?.(rule, ruleIndex) ?? rule.name ?? `rule_${ruleIndex + 1}`;
    const ruleLabel = options.getRuleLabel?.(rule, ruleIndex) ?? rule.name ?? `Rule ${ruleIndex + 1}`;
    const reactantGraphs = parseSpeciesGraphs(rule.reactants);
    const productGraphs = parseSpeciesGraphs(rule.products);

    reactantGraphs.forEach((graph) => {
      graph.molecules.forEach((molecule) => nodeSet.add(molecule.name));
    });
    productGraphs.forEach((graph) => {
      graph.molecules.forEach((molecule) => nodeSet.add(molecule.name));
    });

    const reactantBonds = extractBonds(reactantGraphs);
    const productBonds = extractBonds(productGraphs);

    productBonds.forEach((bondInfo, key) => {
      if (reactantBonds.has(key)) {
        return;
      }

      const edgeKey = `${bondInfo.mol1}->${bondInfo.mol2}:${bondInfo.comp1}-${bondInfo.comp2}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from: bondInfo.mol1,
          to: bondInfo.mol2,
          interactionType: 'binding',
          componentPair: [bondInfo.comp1, bondInfo.comp2],
          ruleIds: [],
          ruleLabels: [],
        });
      }
      const edge = edgeMap.get(edgeKey)!;
      if (!edge.ruleIds.includes(ruleId)) {
        edge.ruleIds.push(ruleId);
        edge.ruleLabels.push(ruleLabel);
      }
    });

    const reactantStates = snapshotComponentStates(reactantGraphs);
    const productStates = snapshotComponentStates(productGraphs);

    productStates.forEach((productState, key) => {
      const reactantState = reactantStates.get(key);
      const fromState = reactantState?.state ?? 'none';
      const toState = productState.state ?? 'none';

      if (fromState === toState) {
        return;
      }

      const edgeKey = `${productState.molecule}:state:${productState.component}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from: productState.molecule,
          to: productState.molecule,
          interactionType: 'state_change',
          componentPair: [productState.component, productState.component],
          ruleIds: [],
          ruleLabels: [],
        });
      }
      const edge = edgeMap.get(edgeKey)!;
      if (!edge.ruleIds.includes(ruleId)) {
        edge.ruleIds.push(ruleId);
        edge.ruleLabels.push(ruleLabel);
      }
    });
  });

  return {
    nodes: Array.from(nodeSet),
    edges: Array.from(edgeMap.values()),
  };
};
