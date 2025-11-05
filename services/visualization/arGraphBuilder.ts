import type { ReactionRule } from '../../types';
import type { AtomRuleGraph, AREdge, ARNode } from '../../types/visualization';
import {
  extractAtoms,
  parseSpeciesGraphs,
} from './speciesGraphUtils';

interface AtomRuleGraphOptions {
  getRuleId?: (rule: ReactionRule, index: number) => string;
  getRuleLabel?: (rule: ReactionRule, index: number) => string;
}

const ensureAtomNode = (
  atomId: string,
  nodes: ARNode[],
  atomSet: Set<string>,
): void => {
  if (atomSet.has(atomId)) {
    return;
  }
  atomSet.add(atomId);
  nodes.push({
    id: atomId,
    type: 'atom',
    label: atomId,
  });
};

const addEdge = (
  from: string,
  to: string,
  edgeType: AREdge['edgeType'],
  edges: AREdge[],
  edgeSet: Set<string>,
): void => {
  const key = `${from}->${to}:${edgeType}`;
  if (edgeSet.has(key)) {
    return;
  }
  edgeSet.add(key);
  edges.push({
    from,
    to,
    edgeType,
  });
};

export const buildAtomRuleGraph = (
  rules: ReactionRule[],
  options: AtomRuleGraphOptions = {},
): AtomRuleGraph => {
  const nodes: ARNode[] = [];
  const edges: AREdge[] = [];
  const atomIds = new Set<string>();
  const edgeIds = new Set<string>();

  rules.forEach((rule, index) => {
  const ruleId = options.getRuleId?.(rule, index) ?? rule.name ?? `rule_${index + 1}`;
    const ruleLabel = options.getRuleLabel?.(rule, index) ?? rule.name ?? `Rule ${index + 1}`;
    nodes.push({
      id: ruleId,
      type: 'rule',
      label: ruleLabel,
    });

    const reactantGraphs = parseSpeciesGraphs(rule.reactants);
    const productGraphs = parseSpeciesGraphs(rule.products);

    const reactantAtoms = extractAtoms(reactantGraphs);
    const productAtoms = extractAtoms(productGraphs);

    reactantAtoms.forEach((atom) => {
      ensureAtomNode(atom, nodes, atomIds);
      if (productAtoms.has(atom)) {
        addEdge(atom, ruleId, 'modifies', edges, edgeIds);
      } else {
        addEdge(atom, ruleId, 'consumes', edges, edgeIds);
      }
    });

    productAtoms.forEach((atom) => {
      ensureAtomNode(atom, nodes, atomIds);
      if (!reactantAtoms.has(atom)) {
        addEdge(ruleId, atom, 'produces', edges, edgeIds);
      }
    });
  });

  return {
    nodes,
    edges,
  };
};
