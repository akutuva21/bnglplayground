// graph/core/MoleculeType.ts
import { Component } from './Component';

export class MoleculeType {
  name: string;
  components: Map<string, Component>; // component name => component definition

  constructor(name: string) {
    this.name = name;
    this.components = new Map();
  }

  /**
   * Add a component definition to this molecule type
   */
  addComponent(name: string, states: string[] = []): void {
    this.components.set(name, new Component(name, states));
  }

  /**
   * Get component definition by name
   */
  getComponent(name: string): Component | undefined {
    return this.components.get(name);
  }

  /**
   * BioNetGen: MoleculeType::toString()
   */
  toString(): string {
    const compStr = Array.from(this.components.values())
      .map(c => {
        let str = c.name;
        if (c.states.length > 0) str += `~${c.states.join('~')}`;
        return str;
      })
      .join(',');
    return `${this.name}(${compStr})`;
  }
}