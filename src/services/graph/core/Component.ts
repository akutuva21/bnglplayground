// graph/core/Component.ts

export interface ComponentState {
  name: string;
  index: number;  // position in allowed states array
}

export class Component {
  name: string;
  states: string[];           // allowed state names (from molecule type)
  state?: string;             // current state (for species instances)
  edges: Map<number, number>; // component index => bond partner component index
  wildcard?: '+' | '?';       // bond wildcard semantics

  constructor(name: string, states: string[] = []) {
    this.name = name;
    this.states = states;
    this.edges = new Map();
  }

  /**
   * BioNetGen: Component::toString()
   * Format: name~state!bond or name!bond or name~state
   */
  toString(): string {
    let str = this.name;
    if (this.state) str += `~${this.state}`;
    if (this.edges.size > 0) {
      const bondLabel = Array.from(this.edges.keys())[0];
      str += `!${bondLabel}`;
    } else if (this.wildcard) {
      str += `!${this.wildcard}`;
    }
    return str;
  }

  /**
   * BioNetGen: Component::isomorphicTo()
   * Check structural equivalence for graph matching
   */
  isomorphicTo(other: Component, checkState: boolean = true): boolean {
    if (this.name !== other.name) return false;
    if (checkState && this.state !== other.state) return false;
    if (this.states.length !== other.states.length) return false;
    // Wildcard matching: '+' requires bond, '?' allows any
    if (this.wildcard === '+' && other.edges.size === 0) return false;
    return true;
  }

  /**
   * Create a deep copy of this component (including bond metadata)
   */
  clone(): Component {
    const copy = new Component(this.name, [...this.states]);
    copy.state = this.state;
    copy.wildcard = this.wildcard;
    copy.edges = new Map(this.edges);
    return copy;
  }


}