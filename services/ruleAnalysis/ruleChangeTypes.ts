export type RuleKind =
  | 'pure_state_change'
  | 'pure_binding'
  | 'binding_and_state_change'
  | 'association'
  | 'dissociation'
  | 'synthesis'
  | 'degradation'
  | 'mixed';

export type Reversibility = 'irreversible' | 'reversible';

export type ComplexChangeType =
  | 'no_change_complex'
  | 'no_change_separate'
  | 'assoc_nonrev'
  | 'assoc_rev'
  | 'dissoc_nonrev'
  | 'dissoc_rev';

export interface BondChange {
  molecule: string;
  site: string;
  change: 'added' | 'removed';
  reversibility: Reversibility;
}

export interface StateChange {
  molecule: string;
  site: string;
  fromState: string;
  toState: string;
  reversibility: Reversibility;
}

export interface SynthDegChange {
  molecule: string;
  fullPattern: string;
  change: 'synthesized' | 'degraded';
}

export interface RuleChangeSummary {
  ruleId: string;
  ruleName: string;
  kind: RuleKind;
  reversibility: Reversibility;
  bondChanges: BondChange[];
  stateChanges: StateChange[];
  complexChange: ComplexChangeType;
  synthDegChanges: SynthDegChange[];
}
