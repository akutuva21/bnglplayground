// graph/core/SpeciesGraph.ts
import { Molecule } from './Molecule';

export class SpeciesGraph {
  molecules: Molecule[];
  adjacency: Map<string, string>;  // "molIdx.compIdx" => "molIdx.compIdx"
  compartment?: string;  // species-level compartment
  adjacencyBitset?: Uint32Array;

  // Cached properties
  private _stringExact?: string;
  private _componentOffsets?: number[];
  private _componentCount?: number;

  constructor(molecules: Molecule[] = []) {
    this.molecules = molecules;
    this.adjacency = new Map();
    this.adjacencyBitset = undefined;
    this._componentOffsets = undefined;
    this._componentCount = undefined;
  }

  /**
   * BioNetGen: SpeciesGraph::addBond()
   * Create edge between two components
   */
  addBond(mol1: number, comp1: number, mol2: number, comp2: number, bondLabel?: number): void {
    const compA = this.molecules[mol1].components[comp1];
    const compB = this.molecules[mol2].components[comp2];

    // Find next available bond label if not specified
    // FIX: Check if bondLabel is defined (including 0)
    const label = (bondLabel !== undefined) ? bondLabel : this.getNextBondLabel();

    // Update adjacency map (both directions)
    const key1 = `${mol1}.${comp1}`;
    const key2 = `${mol2}.${comp2}`;
    this.adjacency.set(key1, key2);
    this.adjacency.set(key2, key1);

    // Update Component.edges for VF2 matching
    // FIX: Remove any existing "unresolved" edges that might have been set by parser
    if (compA.edges.has(label) && compA.edges.get(label) === -1) {
        compA.edges.delete(label);
    }
    if (compB.edges.has(label) && compB.edges.get(label) === -1) {
        compB.edges.delete(label);
    }

    compA.edges.set(label, comp2);
    compB.edges.set(label, comp1);

    // Invalidate caches
    this._stringExact = undefined;
    this.adjacencyBitset = undefined;
    this._componentOffsets = undefined;
    this._componentCount = undefined;
  }

  /**
   * Get next available bond label
   */
  private getNextBondLabel(): number {
    let maxLabel = 0;
    const used = new Set<number>();

    for (const mol of this.molecules) {
      for (const comp of mol.components) {
        for (const label of comp.edges.keys()) {
          if (typeof label === 'number' && Number.isInteger(label)) {
            used.add(label);
            if (label > maxLabel) {
              maxLabel = label;
            }
          }
        }
      }
    }

    let candidate = maxLabel + 1;
    while (used.has(candidate)) {
      candidate += 1;
    }

    return candidate;
  }

  /**
   * BioNetGen: SpeciesGraph::deleteBond()
   * Safely removes a bond between a component and its partner.
   */
  deleteBond(mol: number, comp: number): void {
    const key = `${mol}.${comp}`;
    const partner = this.adjacency.get(key);
    
    // 1. Remove forward link from adjacency
    this.adjacency.delete(key);

    // 2. Remove edge from this component
    const molecule = this.molecules[mol];
    if (molecule) {
        const component = molecule.components[comp];
        if (component) {
            component.edges.clear();
        }
    }

    // 3. Handle partner
    if (partner) {
        // Only delete reverse link if it actually points back to us (reciprocity check)
        if (this.adjacency.get(partner) === key) {
            this.adjacency.delete(partner);
        }

        // Clear partner component edges ONLY if they point to us
        const [pMolStr, pCompStr] = partner.split('.');
        const pMol = Number(pMolStr);
        const pComp = Number(pCompStr);
        const pMolecule = this.molecules[pMol];
        if (pMolecule) {
            const pComponent = pMolecule.components[pComp];
            if (pComponent) {
                pComponent.edges.clear();
            }
        }
    }

    this.adjacencyBitset = undefined;
    this._componentOffsets = undefined;
    this._componentCount = undefined;
  }

  /**
   * Merge another graph into this one. Returns the molecule index offset.
   */
  merge(other: SpeciesGraph): number {
    const offset = this.molecules.length;
    
    // Clone and add molecules
    for (const mol of other.molecules) {
      this.molecules.push(mol.clone());
    }
    
    // Rebuild adjacency for the new molecules based on the cloned components
    for (let i = 0; i < other.molecules.length; i++) {
        const newMolIdx = offset + i;
        const mol = this.molecules[newMolIdx];
        
        for (let c = 0; c < mol.components.length; c++) {
            const comp = mol.components[c];
            const newEdges = new Map<number, number>();
            
            for (const [label, targetCompIdx] of comp.edges.entries()) {
                const oldKey = `${i}.${c}`;
                const oldPartner = other.adjacency.get(oldKey);
                if (oldPartner) {
                    const [oldPartnerMol, oldPartnerComp] = oldPartner.split('.').map(Number);
                    const newPartnerMol = offset + oldPartnerMol;
                    const newPartnerComp = oldPartnerComp;
                    
                    const newKey = `${newMolIdx}.${c}`;
                    const newPartnerKey = `${newPartnerMol}.${newPartnerComp}`;
                    
                    this.adjacency.set(newKey, newPartnerKey);
                    newEdges.set(label, targetCompIdx); 
                }
            }
            comp.edges = newEdges;
        }
    }

    this.adjacencyBitset = undefined;
    this._componentOffsets = undefined;
    this._componentCount = undefined;
    
    return offset;
  }

  /**
   * Split graph into connected components (separate species)
   */
  split(): SpeciesGraph[] {
    const visited = new Set<number>();
    const graphs: SpeciesGraph[] = [];

    for (let i = 0; i < this.molecules.length; i++) {
      if (visited.has(i)) continue;

      const componentMols: number[] = [];
      const queue = [i];
      visited.add(i);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        componentMols.push(curr);

        // Check neighbors via adjacency
        const mol = this.molecules[curr];
        for (let c = 0; c < mol.components.length; c++) {
          const key = `${curr}.${c}`;
          const partner = this.adjacency.get(key);
          if (partner) {
            const [pMol] = partner.split('.').map(Number);
            if (!visited.has(pMol)) {
              visited.add(pMol);
              queue.push(pMol);
            }
          }
        }
      }

      // Build new graph for this component
      const oldToNew = new Map<number, number>();
      componentMols.sort((a, b) => a - b); // keep relative order
      componentMols.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx));

      const newMolecules = componentMols.map(idx => this.molecules[idx].clone());
      const newGraph = new SpeciesGraph(newMolecules);

      // Reconstruct bonds
      componentMols.forEach(oldMolIdx => {
        const mol = this.molecules[oldMolIdx];
        mol.components.forEach((comp, compIdx) => {
          const key = `${oldMolIdx}.${compIdx}`;
          const partner = this.adjacency.get(key);
          if (partner) {
            const [pMolIdx, pCompIdx] = partner.split('.').map(Number);
            // Only add if we haven't added this bond yet (e.g. smaller index first)
            if (oldMolIdx < pMolIdx) {
               // Find bond label
               let label: number | undefined;
               for(const [l, targetC] of comp.edges.entries()) {
                   if (targetC === pCompIdx) label = l;
               }
               
               const newM1 = oldToNew.get(oldMolIdx)!;
               const newM2 = oldToNew.get(pMolIdx)!;
               newGraph.addBond(newM1, compIdx, newM2, pCompIdx, label);
            }
          }
        });
      });

      graphs.push(newGraph);
    }

    return graphs;
  }

  /**
   * VF2++ optimization: build a compact bitset encoding bonds for O(1) lookups.
   */
  buildAdjacencyBitset(): void {
    if (
      this.adjacencyBitset &&
      this._componentOffsets &&
      typeof this._componentCount === 'number'
    ) {
      return;
    }

    const offsets: number[] = [];
    let runningIndex = 0;

    for (const mol of this.molecules) {
      offsets.push(runningIndex);
      runningIndex += mol.components.length;
    }

    const totalComponents = runningIndex;
    this._componentOffsets = offsets;
    this._componentCount = totalComponents;

    if (totalComponents === 0) {
      this.adjacencyBitset = new Uint32Array(0);
      return;
    }

    const bitsetSize = Math.ceil((totalComponents * totalComponents) / 32);
    this.adjacencyBitset = new Uint32Array(bitsetSize);

    const getIndex = (molIdx: number, compIdx: number): number => {
      return offsets[molIdx] + compIdx;
    };

    for (const [key, partnerKey] of this.adjacency.entries()) {
      const [molAStr, compAStr] = key.split('.');
      const [molBStr, compBStr] = partnerKey.split('.');
      const molA = Number(molAStr);
      const compA = Number(compAStr);
      const molB = Number(molBStr);
      const compB = Number(compBStr);

      if (
        Number.isNaN(molA) ||
        Number.isNaN(compA) ||
        Number.isNaN(molB) ||
        Number.isNaN(compB)
      ) {
        continue;
      }

      const idxA = getIndex(molA, compA);
      const idxB = getIndex(molB, compB);
      const bitIndex = idxA * totalComponents + idxB;
      const arrayIndex = Math.floor(bitIndex / 32);
      const bitPosition = bitIndex % 32;
      const mask = (1 << bitPosition) >>> 0;
      this.adjacencyBitset[arrayIndex] |= mask;
    }
  }

  hasBondFast(molA: number, compA: number, molB: number, compB: number): boolean {
    if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
      this.buildAdjacencyBitset();
      if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
        const keyA = `${molA}.${compA}`;
        const keyB = `${molB}.${compB}`;
        return this.adjacency.get(keyA) === keyB;
      }
    }

    const total = this._componentCount;
    if (!total) {
      const keyA = `${molA}.${compA}`;
      const keyB = `${molB}.${compB}`;
      return this.adjacency.get(keyA) === keyB;
    }

    const idxA = this._componentOffsets[molA] + compA;
    const idxB = this._componentOffsets[molB] + compB;
    const bitIndex = idxA * total + idxB;
    const arrayIndex = Math.floor(bitIndex / 32);
    const bitPosition = bitIndex % 32;
    const mask = (1 << bitPosition) >>> 0;

    if (arrayIndex >= this.adjacencyBitset.length) {
      return false;
    }

    return (this.adjacencyBitset[arrayIndex] & mask) !== 0;
  }

  componentHasAnyBond(molIdx: number, compIdx: number): boolean {
    if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
      this.buildAdjacencyBitset();
      if (!this.adjacencyBitset || !this._componentOffsets || !this._componentCount) {
        const key = `${molIdx}.${compIdx}`;
        return this.adjacency.has(key);
      }
    }

    const total = this._componentCount;
    if (!total) {
      const key = `${molIdx}.${compIdx}`;
      return this.adjacency.has(key);
    }

    const rowIndex = this._componentOffsets[molIdx] + compIdx;
    const startBit = rowIndex * total;
    let remaining = total;
    let bitIndex = startBit;

    while (remaining > 0) {
      const arrayIndex = Math.floor(bitIndex / 32);
      const bitOffset = bitIndex % 32;
      const chunkSize = Math.min(32 - bitOffset, remaining);

      if (chunkSize === 32 && bitOffset === 0) {
        if (this.adjacencyBitset[arrayIndex] !== 0) {
          return true;
        }
      } else {
        const chunk = this.adjacencyBitset[arrayIndex] >>> bitOffset;
        const mask = chunkSize >= 32 ? 0xffffffff : ((1 << chunkSize) - 1);
        if ((chunk & mask) !== 0) {
          return true;
        }
      }

      remaining -= chunkSize;
      bitIndex += chunkSize;
    }

    return false;
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
  findMaps(_pattern: SpeciesGraph): Map<number, number>[] {
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
    if (this.adjacencyBitset) {
      sg.adjacencyBitset = this.adjacencyBitset.slice();
    }
    if (this._componentOffsets) {
      sg._componentOffsets = [...this._componentOffsets];
    }
    if (typeof this._componentCount === 'number') {
      sg._componentCount = this._componentCount;
    }
    return sg;
  }
}