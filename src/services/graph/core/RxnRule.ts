// graph/core/RxnRule.ts
import { SpeciesGraph } from './SpeciesGraph.ts';
import { Molecule } from './Molecule.ts';

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
  excludeReactants: Array<{ reactantIndex: number; pattern: SpeciesGraph }>;
  includeReactants: Array<{ reactantIndex: number; pattern: SpeciesGraph }>;
  isDeleteMolecules: boolean;
  isMoveConnected: boolean;

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
    // Default to true to match native BNG behavior (allows intramolecular binding)
    this.allowsIntramolecular = options.allowsIntramolecular ?? true;
    this.deleteBonds = [];
    this.addBonds = [];
    this.changeStates = [];
    this.deleteMolecules = [];
    this.addMolecules = [];
    this.excludeReactants = [];
    this.includeReactants = [];
    this.isDeleteMolecules = false;
    this.isMoveConnected = false;
  }

  /**
   * BioNetGen: RxnRule::toString()
   */
  toString(): string {
    const reactantStr = this.reactants.map(r => r.toString()).join(' + ');
    const productStr = this.products.map(p => p.toString()).join(' + ');
    return `${reactantStr} -> ${productStr} ${this.rateConstant}`;
  }

  /**
   * Returns true when this rule appears to transport molecules between compartments
   * (e.g., A@cyto -> A@nuc). This is a heuristic used to detect possible transport rules.
   */
  isTransportRule(): boolean {
    const reactantCompartments = new Map<string, Set<string>>();
    const productCompartments = new Map<string, Set<string>>();

    for (const r of this.reactants) {
      for (const mol of r.molecules) {
        if (!reactantCompartments.has(mol.name)) reactantCompartments.set(mol.name, new Set());
        reactantCompartments.get(mol.name)!.add(mol.compartment ?? 'default');
      }
    }
    for (const p of this.products) {
      for (const mol of p.molecules) {
        if (!productCompartments.has(mol.name)) productCompartments.set(mol.name, new Set());
        productCompartments.get(mol.name)!.add(mol.compartment ?? 'default');
      }
    }

    for (const [name, rComps] of reactantCompartments.entries()) {
      const pComps = productCompartments.get(name);
      if (!pComps) continue;
      // If reactant and product compartments are disjoint or different sets, consider transport
      const all = new Set([...rComps, ...pComps]);
      if (all.size > rComps.size || all.size > pComps.size) return true;
    }

    return false;
  }

  /**
   * Apply constraints to the rule
   * @param constraints List of constraint strings (e.g., "exclude_reactants(1, A(b~P))")
   * @param parser Callback to parse BNGL patterns into SpeciesGraph
   */
  applyConstraints(constraints: string[], parser: (str: string) => SpeciesGraph) {
    for (const constraint of constraints) {
      // Match constraint type, index, and pattern
      // Example: exclude_reactants(1, A(b~P))
      const match = constraint.match(/^(exclude_reactants|include_reactants)\s*\(\s*(\d+)\s*,\s*(.+)\s*\)$/);
      if (match) {
        const type = match[1];
        const index = parseInt(match[2], 10);
        const patternStr = match[3];

        try {
          const pattern = parser(patternStr);

          // BNGL uses 1-based indexing, convert to 0-based
          const reactantIndex = index - 1;

          if (type === 'exclude_reactants') {
            this.excludeReactants.push({ reactantIndex, pattern });
          } else if (type === 'include_reactants') {
            this.includeReactants.push({ reactantIndex, pattern });
          }
        } catch (e) {
          console.warn(`Failed to parse pattern in constraint: ${constraint}`, e);
        }
      } else {
        console.warn(`Unknown or malformed constraint: ${constraint}`);
      }
    }
  }
}