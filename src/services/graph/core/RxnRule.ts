// graph/core/RxnRule.ts
import { SpeciesGraph } from './SpeciesGraph';
import { Molecule } from './Molecule';

export class RxnRule {
  name: string;
  reactants: SpeciesGraph[];
  products: SpeciesGraph[];
  rateConstant: number;
  allowsIntramolecular: boolean;

  // Transformation operations
  deleteBonds: Array<[number, number, number, number]>; // [mol1, comp1, mol2, comp2]
  addBonds: Array<[number, number, number, number]>;
  changeStates: Array<[number, number, string]>; // [mol, comp, newState]
  deleteMolecules: number[]; // molecule indices to delete
  addMolecules: Molecule[]; // molecules to add

  constructor(
    name: string,
    reactants: SpeciesGraph[],
    products: SpeciesGraph[],
    rateConstant: number,
    options: { allowsIntramolecular?: boolean } = {}
  ) {
    this.name = name;
    this.reactants = reactants;
    this.products = products;
    this.rateConstant = rateConstant;
    this.allowsIntramolecular = options.allowsIntramolecular ?? false;
    this.deleteBonds = [];
    this.addBonds = [];
    this.changeStates = [];
    this.deleteMolecules = [];
    this.addMolecules = [];
  }

  /**
   * BioNetGen: RxnRule::toString()
   */
  toString(): string {
    const reactantStr = this.reactants.map(r => r.toString()).join(' + ');
    const productStr = this.products.map(p => p.toString()).join(' + ');
    return `${reactantStr} -> ${productStr} ${this.rateConstant}`;
  }
}