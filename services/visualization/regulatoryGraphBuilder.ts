import type { ReactionRule } from '../../types';
import type { RegulatoryGraph, RegulatoryNode, RegulatoryEdge } from '../../types/visualization';

interface RegulatoryGraphOptions {
  getRuleId?: (rule: ReactionRule, index: number) => string;
  getRuleLabel?: (rule: ReactionRule, index: number) => string;
}

export const buildRegulatoryGraph = (
  rules: ReactionRule[],
  options: RegulatoryGraphOptions = {},
): RegulatoryGraph => {
  const nodesMap = new Map<string, RegulatoryNode>();
  const edges: RegulatoryEdge[] = [];

  const addNode = (id: string, label: string, type: 'rule' | 'species') => {
    if (!nodesMap.has(id)) {
      nodesMap.set(id, { id, label, type });
    }
  };

  rules.forEach((rule, ruleIndex) => {
    const ruleId = options.getRuleId?.(rule, ruleIndex) ?? rule.name ?? `rule_${ruleIndex + 1}`;
    const ruleLabel = options.getRuleLabel?.(rule, ruleIndex) ?? rule.name ?? `Rule ${ruleIndex + 1}`;

    // Add Rule Node
    addNode(ruleId, ruleLabel, 'rule');

    const reactants = new Set(rule.reactants);
    const products = new Set(rule.products);

    // Identify Catalysts (appear in both reactants and products)
    const catalysts = new Set<string>();
    reactants.forEach((r) => {
      if (products.has(r)) {
        catalysts.add(r);
      }
    });

    // Process Reactants (excluding catalysts from standard consumption)
    reactants.forEach((r) => {
      const speciesId = `species_${r}`;
      addNode(speciesId, r, 'species');

      if (catalysts.has(r)) {
        // Catalyst Edge: Species -> Rule (Modifier)
        edges.push({
          from: speciesId,
          to: ruleId,
          type: 'catalyst',
        });
      } else {
        // Reactant Edge: Species -> Rule (Consumed)
        edges.push({
          from: speciesId,
          to: ruleId,
          type: 'reactant',
        });
      }
    });

    // Process Products (excluding catalysts from standard production)
    products.forEach((p) => {
      const speciesId = `species_${p}`;
      addNode(speciesId, p, 'species');

      if (!catalysts.has(p)) {
        // Product Edge: Rule -> Species (Produced)
        edges.push({
          from: ruleId,
          to: speciesId,
          type: 'product',
        });
      }
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
};
