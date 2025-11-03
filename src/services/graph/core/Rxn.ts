// graph/core/Rxn.ts

export class Rxn {
  reactants: number[];  // species indices
  products: number[];   // species indices
  rate: number;
  name?: string;

  constructor(reactants: number[], products: number[], rate: number, name?: string) {
    this.reactants = reactants;
    this.products = products;
    this.rate = rate;
    this.name = name;
  }

  /**
   * BioNetGen: Rxn::toString()
   */
  toString(): string {
    const reactantStr = this.reactants.join(' + ');
    const productStr = this.products.join(' + ');
    return `${reactantStr} -> ${productStr} ${this.rate}`;
  }
}