// graph/core/Canonical.ts
import { SpeciesGraph } from './SpeciesGraph.ts';

interface MoleculeInfo {
  originalIndex: number;
  localSignature: string;
  colorClass: number;  // Color class from WL refinement
  molecule: any;
}

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * BioNetGen: SpeciesGraph::findAutomorphisms() + canonical()
 * Uses nauty via HNauty.pm in Perl; here we implement a simplified version
 * using iterative refinement (similar to Weisfeiler-Lehman algorithm)
 * with hash-based color classes to handle symmetric subgraphs correctly.
 */
export class GraphCanonicalizer {

  /**
   * Generate canonical string with sorted molecules and renumbered bonds.
   * Uses iterative refinement to ensure symmetric graphs produce the same canonical form.
   */
  static canonicalize(graph: SpeciesGraph): string {
    // Check if already cached on the graph
    if (graph.cachedCanonical !== undefined) {
      return graph.cachedCanonical;
    }
    
    if (graph.molecules.length === 0) {
      graph.cachedCanonical = '';
      return '';
    }
    if (graph.molecules.length === 1) {
      const result = this.moleculeToString(graph.molecules[0], new Map(), graph, 0);
      graph.cachedCanonical = result;
      return result;
    }

    // 1. Generate initial signatures based on local structure only (no connectivity)
    const moleculeInfos: MoleculeInfo[] = graph.molecules.map((mol, molIdx) => {
      const localSig = this.getLocalSignature(mol);
      return {
        originalIndex: molIdx,
        localSignature: localSig,
        colorClass: simpleHash(localSig),
        molecule: mol
      };
    });

    // 2. Iterative refinement: update color classes based on neighbor colors
    // Use hash-based colors to avoid exponential string growth
    for (let iter = 0; iter < graph.molecules.length; iter++) {
      const prevColors = moleculeInfos.map(m => m.colorClass);
      
      for (let molIdx = 0; molIdx < graph.molecules.length; molIdx++) {
        const mol = graph.molecules[molIdx];
        const neighborColors: number[] = [];
        
        // Collect colors of all neighbors (molecules connected via bonds)
        // Support multi-site bonding where one component can have multiple partners
        for (let compIdx = 0; compIdx < mol.components.length; compIdx++) {
          const adjacencyKey = `${molIdx}.${compIdx}`;
          const partnerKeys = graph.adjacency.get(adjacencyKey);
          if (partnerKeys) {
            for (const partnerKey of partnerKeys) {
              const [pMolIdxStr, pCompIdxStr] = partnerKey.split('.');
              const pMolIdx = Number(pMolIdxStr);
              const pCompIdx = Number(pCompIdxStr);
              const pMol = graph.molecules[pMolIdx];
              if (pMol) {
                // Include component info and partner's color
                const edgeHash = simpleHash(
                  `${mol.components[compIdx].name}->${pMol.components[pCompIdx]?.name}:${prevColors[pMolIdx]}`
                );
                neighborColors.push(edgeHash);
              }
            }
          }
        }
        
        // Sort and combine neighbor colors for a deterministic hash
        neighborColors.sort((a, b) => a - b);
        const combinedHash = simpleHash(prevColors[molIdx] + ':' + neighborColors.join(','));
        moleculeInfos[molIdx].colorClass = combinedHash;
      }
      
      // Check if colors are stable (no changes)
      const newColors = moleculeInfos.map(m => m.colorClass);
      if (newColors.every((c, i) => c === prevColors[i])) {
        break; // Converged
      }
    }

    // 3. Sort molecules by (colorClass, localSignature) for grouping
    moleculeInfos.sort((a, b) => {
      if (a.colorClass !== b.colorClass) return a.colorClass - b.colorClass;
      if (a.localSignature < b.localSignature) return -1;
      if (a.localSignature > b.localSignature) return 1;
      return 0;
    });

    // Map original index -> sorted index (before canonical ordering)
    const originalToSorted = new Map<number, number>();
    moleculeInfos.forEach((info, index) => {
      originalToSorted.set(info.originalIndex, index);
    });

    // 4. Build adjacency list for BFS traversal
    const adjList: Map<number, Array<{neighbor: number, myComp: string, neighborComp: string, myCompIdx: number, neighborCompIdx: number}>> = new Map();
    for (let i = 0; i < moleculeInfos.length; i++) {
      adjList.set(i, []);
    }
    
    for (const [key, partnerKeys] of graph.adjacency) {
      const [m1, c1] = key.split('.').map(Number);
      for (const partnerKey of partnerKeys) {
        const [m2, c2] = partnerKey.split('.').map(Number);
        const si1 = originalToSorted.get(m1)!;
        const si2 = originalToSorted.get(m2)!;
        const mol1 = graph.molecules[m1];
        const mol2 = graph.molecules[m2];
        const compName1 = mol1.components[c1]?.name || '';
        const compName2 = mol2.components[c2]?.name || '';
        
        adjList.get(si1)!.push({neighbor: si2, myComp: compName1, neighborComp: compName2, myCompIdx: c1, neighborCompIdx: c2});
      }
    }
    
    // Sort each adjacency list for deterministic traversal
    for (const [node, neighbors] of adjList) {
      neighbors.sort((a, b) => {
        // First by neighbor's signature
        const sigA = moleculeInfos[a.neighbor].localSignature;
        const sigB = moleculeInfos[b.neighbor].localSignature;
        if (sigA !== sigB) return sigA < sigB ? -1 : 1;
        
        // Then by my component name (alphabetically)
        if (a.myComp !== b.myComp) return a.myComp < b.myComp ? -1 : 1;
        
        // Then by neighbor's component name
        if (a.neighborComp !== b.neighborComp) return a.neighborComp < b.neighborComp ? -1 : 1;
        
        // Then by neighbor's sorted index (for determinism)
        if (a.neighbor !== b.neighbor) return a.neighbor - b.neighbor;
        
        return 0;
      });
    }
    
    // 5. Use BFS from lexicographically smallest molecule to establish canonical order
    const finalOrder: number[] = [];
    const placed = new Set<number>();
    
    // Start with the smallest signature molecule
    const startIdx = 0; // moleculeInfos is already sorted by signature
    
    // BFS
    const queue: number[] = [startIdx];
    placed.add(startIdx);
    finalOrder.push(startIdx);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Visit neighbors in sorted order
      for (const edge of adjList.get(current)!) {
        if (!placed.has(edge.neighbor)) {
          placed.add(edge.neighbor);
          finalOrder.push(edge.neighbor);
          queue.push(edge.neighbor);
        }
      }
    }
    
    // Add any disconnected molecules
    for (let i = 0; i < moleculeInfos.length; i++) {
      if (!placed.has(i)) {
        finalOrder.push(i);
      }
    }
    
    // Map sorted index -> canonical index (final order)
    const sortedToCanonical = new Map<number, number>();
    finalOrder.forEach((sortedIdx, canIdx) => {
      sortedToCanonical.set(sortedIdx, canIdx);
    });
    
    // 6. Collect all bonds for bond ID assignment
    // Support multi-site bonding where adjacency maps to arrays
    const allBonds: Array<{
      canIdx1: number, ci1: number, canIdx2: number, ci2: number,
      compName1: string, compName2: string
    }> = [];
    const addedBondKeys = new Set<string>(); // Track added bonds to avoid duplicates
    
    for (const [key, partnerKeys] of graph.adjacency) {
      const [m1, c1] = key.split('.').map(Number);
      for (const partnerKey of partnerKeys) {
        const [m2, c2] = partnerKey.split('.').map(Number);
        const si1 = originalToSorted.get(m1)!;
        const si2 = originalToSorted.get(m2)!;
        const canIdx1 = sortedToCanonical.get(si1)!;
        const canIdx2 = sortedToCanonical.get(si2)!;
        const mol1 = graph.molecules[m1];
        const mol2 = graph.molecules[m2];
        const compName1 = mol1.components[c1]?.name || '';
        const compName2 = mol2.components[c2]?.name || '';
        
        // Create canonical bond key (smaller canonical index first)
        const bondKey = canIdx1 < canIdx2 || (canIdx1 === canIdx2 && c1 < c2)
          ? `${canIdx1}.${c1}-${canIdx2}.${c2}`
          : `${canIdx2}.${c2}-${canIdx1}.${c1}`;
        
        // Only add each bond once
        if (!addedBondKeys.has(bondKey)) {
          addedBondKeys.add(bondKey);
          if (canIdx1 < canIdx2 || (canIdx1 === canIdx2 && c1 < c2)) {
            allBonds.push({canIdx1, ci1: c1, canIdx2, ci2: c2, compName1, compName2});
          } else {
            allBonds.push({canIdx1: canIdx2, ci1: c2, canIdx2: canIdx1, ci2: c1, compName1: compName2, compName2: compName1});
          }
        }
      }
    }
    
    // Sort bonds by (canIdx1, compName1, canIdx2, compName2) for deterministic bond ID assignment
    allBonds.sort((a, b) => {
      if (a.canIdx1 !== b.canIdx1) return a.canIdx1 - b.canIdx1;
      if (a.compName1 !== b.compName1) return a.compName1 < b.compName1 ? -1 : 1;
      if (a.canIdx2 !== b.canIdx2) return a.canIdx2 - b.canIdx2;
      if (a.compName2 !== b.compName2) return a.compName2 < b.compName2 ? -1 : 1;
      return 0;
    });
    
    // 7. Assign bond IDs in sorted bond order
    let nextBondId = 1;
    const bondMapping = new Map<string, number>();
    
    for (const bond of allBonds) {
      // Create canonical bond key (smaller canonical index first)
      let key: string;
      if (bond.canIdx1 < bond.canIdx2 || (bond.canIdx1 === bond.canIdx2 && bond.ci1 < bond.ci2)) {
        key = `${bond.canIdx1}.${bond.ci1}-${bond.canIdx2}.${bond.ci2}`;
      } else {
        key = `${bond.canIdx2}.${bond.ci2}-${bond.canIdx1}.${bond.ci1}`;
      }
      
      if (!bondMapping.has(key)) {
        bondMapping.set(key, nextBondId++);
      }
    }
    
    // 8. Generate final canonical string
    const canonicalStrings = finalOrder.map((sortedIdx, canIdx) => {
      const info = moleculeInfos[sortedIdx];
      return this.moleculeToStringNew(
        info.molecule, 
        bondMapping, 
        graph, 
        info.originalIndex,
        originalToSorted,
        sortedToCanonical
      );
    });

    const result = canonicalStrings.join('.');
    graph.cachedCanonical = result;
    return result;
  }

  /**
   * Get local signature for a molecule (excluding connectivity to other molecules)
   * Components are sorted alphabetically to match BNG2 canonical form
   */
  private static getLocalSignature(mol: any): string {
    const compSigs = mol.components.map((comp: any, idx: number) => {
      let sig = comp.name;
      if (comp.state && comp.state !== '?') sig += `~${comp.state}`;
      return { sig, idx };
    });
    // Sort components alphabetically by their string representation
    compSigs.sort((a: any, b: any) => a.sig < b.sig ? -1 : a.sig > b.sig ? 1 : 0);
    const compartmentStr = mol.compartment ? `@${mol.compartment}` : '';
    return `${mol.name}${compartmentStr}(${compSigs.map((c: any) => c.sig).join(',')})`;
  }

  /**
   * Convert a molecule to string with canonical bond IDs (single molecule case)
   */
  private static moleculeToString(
    mol: any, 
    bondMapping: Map<string, number>,
    graph: SpeciesGraph,
    molOrigIdx: number
  ): string {
    // Build component strings with their original indices
    const componentData = mol.components.map((comp: any, compIdx: number) => {
      let str = comp.name;
      if (comp.state && comp.state !== '?') str += `~${comp.state}`;

      if (comp.wildcard) {
        str += `!${comp.wildcard}`;
      }

      return { str, compIdx };
    });

    // Sort components alphabetically
    componentData.sort((a: any, b: any) => {
      // Compare the base string (without bonds)
      const baseA = a.str.split('!')[0];
      const baseB = b.str.split('!')[0];
      return baseA < baseB ? -1 : baseA > baseB ? 1 : 0;
    });

    const compartmentSuffix = mol.compartment ? `@${mol.compartment}` : '';
    return `${mol.name}(${componentData.map((c: any) => c.str).join(',')})${compartmentSuffix}`;
  }

  /**
   * Convert a molecule to string with canonical bond IDs (multi-molecule case)
   * Components are sorted alphabetically to match BNG2 canonical form
   */
  private static moleculeToStringNew(
    mol: any, 
    bondMapping: Map<string, number>,
    graph: SpeciesGraph,
    molOrigIdx: number,
    originalToSorted: Map<number, number>,
    sortedToCanonical: Map<number, number>
  ): string {
    const mySortedIdx = originalToSorted.get(molOrigIdx)!;
    const myCanIdx = sortedToCanonical.get(mySortedIdx)!;
    
    // Build component strings with their original indices for bond lookup
    const componentData = mol.components.map((comp: any, compIdx: number) => {
      let baseStr = comp.name;
      if (comp.state && comp.state !== '?') baseStr += `~${comp.state}`;

      const adjacencyKey = `${molOrigIdx}.${compIdx}`;
      const partnerKeys = graph.adjacency.get(adjacencyKey);
      
      // Support multi-site bonding: collect all bond IDs for this component
      const bondIds: number[] = [];
      if (partnerKeys && partnerKeys.length > 0) {
        for (const partnerKey of partnerKeys) {
          const [pMolOrigIdx, pCompIdx] = partnerKey.split('.').map(Number);
          const pSortedIdx = originalToSorted.get(pMolOrigIdx)!;
          const pCanIdx = sortedToCanonical.get(pSortedIdx)!;
          
          let key: string;
          if (myCanIdx < pCanIdx || (myCanIdx === pCanIdx && compIdx < pCompIdx)) {
            key = `${myCanIdx}.${compIdx}-${pCanIdx}.${pCompIdx}`;
          } else {
            key = `${pCanIdx}.${pCompIdx}-${myCanIdx}.${compIdx}`;
          }
          
          const bondId = bondMapping.get(key);
          if (bondId !== undefined) {
            bondIds.push(bondId);
          }
        }
      }
      
      // Build bond string (sorted for canonical form)
      let bondStr = '';
      if (bondIds.length > 0) {
        bondIds.sort((a, b) => a - b);
        bondStr = bondIds.map(id => `!${id}`).join('');
      } else if (comp.wildcard) {
        bondStr = `!${comp.wildcard}`;
      }

      return { baseStr, bondStr, compIdx };
    });

    // Sort components alphabetically by their base string (name + state, without bond)
    componentData.sort((a: any, b: any) => a.baseStr < b.baseStr ? -1 : a.baseStr > b.baseStr ? 1 : 0);

    const compartmentSuffix = mol.compartment ? `@${mol.compartment}` : '';
    return `${mol.name}(${componentData.map((c: any) => c.baseStr + c.bondStr).join(',')})${compartmentSuffix}`;
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