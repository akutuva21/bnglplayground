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
  // Track molecules and their component set for hierarchical (compound) nodes
  const moleculeMap = new Map<string, Set<string>>();
  const edgeMap = new Map<string, ContactEdge>();

  rules.forEach((rule, ruleIndex) => {
    const ruleId = options.getRuleId?.(rule, ruleIndex) ?? rule.name ?? `rule_${ruleIndex + 1}`;
    const ruleLabel = options.getRuleLabel?.(rule, ruleIndex) ?? rule.name ?? `Rule ${ruleIndex + 1}`;
    const reactantGraphs = parseSpeciesGraphs(rule.reactants);
    const productGraphs = parseSpeciesGraphs(rule.products);

    reactantGraphs.forEach((graph) => {
      graph.molecules.forEach((molecule) => {
        if (!moleculeMap.has(molecule.name)) moleculeMap.set(molecule.name, new Set());
        molecule.components.forEach((c) => moleculeMap.get(molecule.name)!.add(c.name));
      });
    });
    productGraphs.forEach((graph) => {
      graph.molecules.forEach((molecule) => {
        if (!moleculeMap.has(molecule.name)) moleculeMap.set(molecule.name, new Set());
        molecule.components.forEach((c) => moleculeMap.get(molecule.name)!.add(c.name));
      });
    });

    // (colors are chosen at render-time by viewers using colorFromName)

    const reactantBonds = extractBonds(reactantGraphs);
    const productBonds = extractBonds(productGraphs);

    productBonds.forEach((bondInfo, key) => {
      if (reactantBonds.has(key)) {
        return;
      }

      // Edge now connects component-level nodes (compound nodes)
      const sourceId = `${bondInfo.mol1}_${bondInfo.comp1}`;
      const targetId = `${bondInfo.mol2}_${bondInfo.comp2}`;
      const edgeKey = `${sourceId}->${targetId}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from: sourceId,
          to: targetId,
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

      // State changes are component-level and stay within same molecule
      const compId = `${productState.molecule}_${productState.component}`;
      const edgeKey = `${compId}:state`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from: compId,
          to: compId,
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

  // Create compound nodes for molecules and component child nodes
  const nodes: any[] = [];
  // Add compartments if present (detect by looking for @compartment on molecules in rules)
  const compartmentSet = new Set<string>();
  // Map a molecule type to a compartment if seen
  const moleculeCompartment = new Map<string, string>();
  // scan rules again to collect molecule compartments
  rules.forEach((rule) => {
    const graphs = parseSpeciesGraphs([...rule.reactants, ...rule.products]);
    graphs.forEach((g) => {
      g.molecules.forEach((m) => {
        if (m.compartment) {
          compartmentSet.add(m.compartment);
          if (!moleculeCompartment.has(m.name)) moleculeCompartment.set(m.name, m.compartment);
        }
      });
    });
  });

  // Emit compartment parent nodes first so cytoscape layout keeps them at root
  compartmentSet.forEach((compName) => {
    nodes.push({ id: `compartment_${compName}`, label: compName, type: 'compartment' });
  });

  moleculeMap.forEach((components, molName) => {
    const molParent = moleculeCompartment.get(molName);
    const molParentId = molParent ? `compartment_${molParent}` : undefined;
    nodes.push({ id: molName, label: molName, type: 'molecule', parent: molParentId });
    Array.from(components).forEach((compName) => {
      const compId = `${molName}_${compName}`;
      nodes.push({ id: compId, label: compName, parent: molName, type: 'component' });
    });
  });

  return {
    nodes,
    edges: Array.from(edgeMap.values()),
  };
};
