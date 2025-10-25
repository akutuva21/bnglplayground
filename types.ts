export interface Status {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface Example {
  id: string;
  name: string;
  description: string;
  code: string;
  tags: string[];
}

export interface BNGLMoleculeType {
  name: string;
  components: string[];
}

export interface BNGLSpecies {
  name: string;
  initialConcentration: number;
}

export interface BNGLObservable {
  name: string;
  pattern: string;
}

export interface BNGLReaction {
  reactants: string[];
  products: string[];
  rate: string;
  rateConstant: number;
}

export interface ReactionRule {
  reactants: string[];
  products: string[];
  rate: string;
  reverseRate?: string;
  isBidirectional: boolean;
}

export interface BNGLModel {
  parameters: Record<string, number>;
  moleculeTypes: BNGLMoleculeType[];
  species: BNGLSpecies[];
  observables: BNGLObservable[];
  reactions: BNGLReaction[];
  reactionRules: ReactionRule[];
}

export interface SimulationResults {
  headers: string[];
  data: Record<string, number>[];
}

export interface SimulationOptions {
  method: 'ode' | 'ssa';
  t_end: number;
  n_steps: number;
  steadyState?: boolean;
  steadyStateTolerance?: number;
  steadyStateWindow?: number;
}

// Worker message contracts
export interface WorkerRequest<T = any> {
  id?: number;
  type: string;
  payload?: T;
}

export interface WorkerResponse<T = any> {
  id?: number;
  type: string;
  payload?: T;
}
