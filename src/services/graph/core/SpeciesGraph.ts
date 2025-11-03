// graph/core/SpeciesGraph.ts
import { Molecule } from './Molecule';
import { Component } from './Component';

export class SpeciesGraph {
  molecules: Molecule[];
  adjacency: Map<string, string>;  // "molIdx.compIdx" => "molIdx.compIdx"
  compartment?: string;  // species-level compartment

  // Cached properties
  private _canonical?: string;
  private _stringExact?: string;
  private _stringID?: string;

  constructor(molecules: Molecule[] = []) {
    this.molecules = molecules;
    this.adjacency = new Map();
  }

  /**
   * BioNetGen: SpeciesGraph::addBond()
   * Create edge between two components
   */
  addBond(mol1: number, comp1: number, mol2: number, comp2: number, bondLabel?: number): void {
    const compA = this.molecules[mol1].components[comp1];
    const compB = this.molecules[mol2].components[comp2];

    // Find next available bond label if not specified
    const label = bondLabel || this.getNextBondLabel();

    // Update adjacency map (both directions)
    const key1 = `${mol1}.${comp1}`;
    const key2 = `${mol2}.${comp2}`;
    this.adjacency.set(key1, key2);
    this.adjacency.set(key2, key1);

    // Update Component.edges for VF2 matching
    compA.edges.set(label, comp2);
    compB.edges.set(label, comp1);

    // Invalidate caches
    this._canonical = undefined;
    this._stringExact = undefined;
    this._stringID = undefined;
  }

  /**
   * Get next available bond label
   */
  private getNextBondLabel(): number {
    let maxLabel = 0;
    for (const mol of this.molecules) {
      for (const comp of mol.components) {
        for (const label of comp.edges.keys()) {
          if (label > maxLabel) maxLabel = label;
        }
      }
    }
    return maxLabel + 1;
  }

  /**
   * BioNetGen: SpeciesGraph::deleteBond()
   */
  deleteBond(mol: number, comp: number): void {
    const key = `${mol}.${comp}`;
    const partner = this.adjacency.get(key);
    if (partner) {
      this.adjacency.delete(key);
      this.adjacency.delete(partner);
      this._canonical = undefined;
    }
  }

  /**
   * BioNetGen: SpeciesGraph::toString() / StringExact()
   * Non-canonical string (molecule order as-is)
   */
  toString(): string {
    if (this._stringExact) return this._stringExact;
    this._stringExact = this.molecules.map(m => m.toString()).join('.');
    return this._stringExact;
  }

  /**
   * BioNetGen: SpeciesGraph::findMaps()
   * Find all isomorphisms from pattern to this graph
   * Returns array of Map<patternMolIdx, thisMolIdx>
   */
  findMaps(pattern: SpeciesGraph): Map<number, number>[] {
    // This is the core isomorphism algorithm - implement VF2 or Ullmann
    // See Phase 2 below for full implementation
    return [];
  }

  /**
   * Deep clone
   */
  clone(): SpeciesGraph {
    const sg = new SpeciesGraph(this.molecules.map(m => m.clone()));
    sg.adjacency = new Map(this.adjacency);
    sg.compartment = this.compartment;
    return sg;
  }
}