export interface VisualizationComponent {
  name: string;
  state?: string;
  bondLabel?: string;
  bondPartner?: string;
  role?: VisualizationComponentRole;
}

export interface VisualizationMolecule {
  name: string;
  components: VisualizationComponent[];
  position?: { x: number; y: number };
}

export type VisualizationComponentRole = 'context' | 'transformed' | 'created';

export interface VisualizationRule {
  id: string;
  name: string;
  reactants: VisualizationMolecule[][];
  products: VisualizationMolecule[][];
  rate: string;
  reverseRate?: string;
  isBidirectional: boolean;
}

export type OperationType =
  | 'bind'
  | 'unbind'
  | 'state_change'
  | 'add_molecule'
  | 'remove_molecule';

export interface RuleOperation {
  type: OperationType;
  target: string;
  from?: string;
  to?: string;
  bondLabel?: string;
}

export interface CompactRule {
  name: string;
  context: VisualizationMolecule[];
  operations: RuleOperation[];
  rate: string;
}

export interface ContactEdge {
  from: string;
  to: string;
  interactionType: 'binding' | 'state_change';
  componentPair?: [string, string];
  ruleIds: string[];
  ruleLabels: string[];
}

export interface ContactMap {
  nodes: string[];
  edges: ContactEdge[];
}

export interface ARNode {
  id: string;
  type: 'atom' | 'rule';
  label: string;
  details?: string;
}

export interface AREdge {
  from: string;
  to: string;
  edgeType: 'produces' | 'consumes' | 'modifies';
}

export interface AtomRuleGraph {
  nodes: ARNode[];
  edges: AREdge[];
}

export interface RuleFlowNode {
  id: string;
  displayName: string;
  type: 'binding' | 'modification' | 'synthesis' | 'degradation' | 'complex';
  layer: number;
}

export interface RuleFlowEdge {
  from: string;
  to: string;
  producedSpecies: string[];
}

export interface RuleFlowGraph {
  nodes: RuleFlowNode[];
  edges: RuleFlowEdge[];
}
