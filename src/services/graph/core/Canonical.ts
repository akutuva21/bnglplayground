// graph/core/Canonical.ts
import { SpeciesGraph } from './SpeciesGraph.ts';

interface MoleculeInfo {
  originalIndex: number;
  signature: string;
  molecule: any;
}

/**
 * BioNetGen: SpeciesGraph::findAutomorphisms() + canonical()
 * Uses nauty via HNauty.pm in Perl; here we implement a simplified version
 * that normalizes bond labels and sorts molecules.
 */
export class GraphCanonicalizer {

  /**
   * Generate canonical string with sorted molecules and renumbered bonds.
   * This ensures that isomorphic graphs (with simple bond relabeling) produce the same string.
   */
  static canonicalize(graph: SpeciesGraph): string {
    // 1. Generate local signatures for each molecule to establish a sort order
    const moleculeInfos: MoleculeInfo[] = graph.molecules.map((mol, molIdx) => {
      // Generate component signatures
      const compSigs = mol.components.map((comp, compIdx) => {
        let sig = comp.name;
        if (comp.state && comp.state !== '?') sig += `~${comp.state}`;
        if (comp.wildcard) sig += `!${comp.wildcard}`;

        // Add connectivity info to signature (PartnerName:PartnerComp)
        // This helps distinguish A bound to B from A bound to C
        const adjacencyKey = `${molIdx}.${compIdx}`;
        const partnerKey = graph.adjacency.get(adjacencyKey);
        if (partnerKey) {
          const [pMolIdxStr, pCompIdxStr] = partnerKey.split('.');
          const pMolIdx = Number(pMolIdxStr);
          const pCompIdx = Number(pCompIdxStr);
          const pMol = graph.molecules[pMolIdx];
          const pComp = pMol?.components[pCompIdx];
          if (pMol && pComp) {
            sig += `->${pMol.name}:${pComp.name}`;
          } else {
            sig += `->?`;
          }
        } else if (comp.edges.size > 0) {
          // Should not happen if adjacency is consistent, but fallback
          sig += `!+`;
        }
        return sig;
      });

      // Sort component signatures to ensure component order doesn't affect molecule signature
      // (Note: BNGL usually requires components to be defined in order, but good to be safe)
      compSigs.sort();

      const compartmentStr = mol.compartment ? `@${mol.compartment}` : '';
      // Signature for sorting purposes only
      const signature = `${mol.name}${compartmentStr}(${compSigs.join(',')})`;

      return {
        originalIndex: molIdx,
        signature,
        molecule: mol
      };
    });

    // 2. Sort molecules by signature
    // This establishes a canonical permutation of the molecules
    moleculeInfos.sort((a, b) => {
      if (a.signature < b.signature) return -1;
      if (a.signature > b.signature) return 1;
      return 0;
    });

    // Map original index -> new canonical index
    const originalToCanonical = new Map<number, number>();
    moleculeInfos.forEach((info, index) => {
      originalToCanonical.set(info.originalIndex, index);
    });

    // 3. Assign canonical bond labels
    // We iterate through molecules in canonical order.
    // For each bond encountered, if it hasn't been assigned a label yet, assign the next available integer.
    // We use a map key based on the canonical indices of the connected components to track assigned bonds.

    let nextBondId = 1;
    const bondMapping = new Map<string, number>(); // Key: "minMol.minComp-maxMol.maxComp" -> BondID

    // Helper to get canonical bond ID
    const getCanonicalBondId = (molIdx: number, compIdx: number): number | null => {
      const adjacencyKey = `${molIdx}.${compIdx}`;
      const partnerKey = graph.adjacency.get(adjacencyKey);

      if (!partnerKey) return null;

      const [pMolIdxStr, pCompIdxStr] = partnerKey.split('.');
      const pMolIdx = Number(pMolIdxStr);
      const pCompIdx = Number(pCompIdxStr);

      const canMol1 = originalToCanonical.get(molIdx)!;
      const canMol2 = originalToCanonical.get(pMolIdx)!;

      // Create a unique key for this bond using canonical indices
      // Always order so smaller canonical index comes first
      let key: string;
      if (canMol1 < canMol2 || (canMol1 === canMol2 && compIdx < pCompIdx)) {
        key = `${canMol1}.${compIdx}-${canMol2}.${pCompIdx}`;
      } else {
        key = `${canMol2}.${pCompIdx}-${canMol1}.${compIdx}`;
      }

      if (!bondMapping.has(key)) {
        bondMapping.set(key, nextBondId++);
      }
      return bondMapping.get(key)!;
    };

    // 4. Generate final canonical string
    const canonicalStrings = moleculeInfos.map((info) => {
      const mol = info.molecule;
      const molIdx = info.originalIndex;

      const componentStrings = mol.components.map((comp: any, compIdx: number) => {
        let str = comp.name;
        if (comp.state && comp.state !== '?') str += `~${comp.state}`;

        // Check for bond
        const bondId = getCanonicalBondId(molIdx, compIdx);
        if (bondId !== null) {
          str += `!${bondId}`;
        } else if (comp.wildcard) {
          str += `!${comp.wildcard}`;
        }

        return str;
      });

      componentStrings.sort();

      const compartmentSuffix = mol.compartment ? `@${mol.compartment}` : '';
      // FIX: Put compartment suffix at the end: Name(comps)@Comp
      return `${mol.name}(${componentStrings.join(',')})${compartmentSuffix}`;
    });

    return canonicalStrings.join('.');
  }

  /**
   * Compute automorphism group size (for StatFactor correction)
   * BioNetGen: SpeciesGraph::aut_permutations()
   */
  static computeAutomorphisms(_graph: SpeciesGraph): number {
    // Placeholder
    return 1;
  }
}