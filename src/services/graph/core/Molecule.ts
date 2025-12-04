// graph/core/Molecule.ts
import { Component } from './Component.ts';

export class Molecule {
  name: string;
  components: Component[];
  compartment?: string;
  label?: string;  // for pattern matching (e.g., A1, A2 in rules)
  hasExplicitEmptyComponentList: boolean;

  constructor(
    name: string,
    components: Component[] = [],
    compartment?: string,
    hasExplicitEmptyComponentList: boolean = false
  ) {
    this.name = name;
    this.components = components;
    this.compartment = compartment;
    this.hasExplicitEmptyComponentList = hasExplicitEmptyComponentList;
  }

  /**
   * BioNetGen: Molecule::toString()
   * Format: Name(comp1,comp2~state!1)@compartment
   */
  toString(): string {
    const compStr = this.components.map(c => c.toString()).join(',');
    const compSuffix = compStr ? `(${compStr})` : (this.hasExplicitEmptyComponentList ? '()' : '');
    const compartmentSuffix = this.compartment ? `@${this.compartment}` : '';
    if (compStr || this.hasExplicitEmptyComponentList) {
      return `${this.name}${compSuffix}${compartmentSuffix}`;
    }
    return `${this.name}${compartmentSuffix}`;
  }

  /**
   * BioNetGen: Molecule::isomorphicTo()
   */
  isomorphicTo(other: Molecule, componentMap: Map<number, number>): boolean {
    if (this.name !== other.name) return false;
    if (this.compartment !== other.compartment) return false;
    if (this.components.length !== other.components.length) return false;

    // Components must match in order (BioNetGen assumes sorted components)
    for (let i = 0; i < this.components.length; i++) {
      if (!this.components[i].isomorphicTo(other.components[i])) return false;
      componentMap.set(i, i);  // track component correspondence
    }
    return true;
  }

  /**
   * Deep clone for graph transformations
   */
  clone(): Molecule {
    const clonedComponents = this.components.map(comp => {
      const cloned = comp.clone();
      return cloned;
    });

    const cloned = new Molecule(
      this.name,
      clonedComponents,
      this.compartment,
      this.hasExplicitEmptyComponentList
    );
    cloned.label = this.label;
    return cloned;
  }
}