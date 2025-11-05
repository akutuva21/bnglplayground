import type { ReactionRule } from '../../types';
import type { VisualizationRule } from '../../types/visualization';
import { convertSpeciesGraph, parseSpeciesGraphs } from './speciesGraphUtils';

export const parseRuleForVisualization = (rule: ReactionRule, index: number): VisualizationRule => {
  const reactantGraphs = parseSpeciesGraphs(rule.reactants);
  const productGraphs = parseSpeciesGraphs(rule.products);

  const reactants = reactantGraphs.map((graph) => convertSpeciesGraph(graph));
  const products = productGraphs.map((graph) => convertSpeciesGraph(graph));

  return {
    id: rule.name ?? `rule_${index + 1}`,
    name: rule.name ?? 'Unnamed Rule',
    reactants,
    products,
    rate: String(rule.rate),
    reverseRate: rule.reverseRate ? String(rule.reverseRate) : undefined,
    isBidirectional: rule.isBidirectional,
  };
};
