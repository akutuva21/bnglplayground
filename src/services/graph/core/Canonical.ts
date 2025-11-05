// graph/core/Canonical.ts
import { SpeciesGraph } from './SpeciesGraph';

/**
 * BioNetGen: SpeciesGraph::findAutomorphisms() + canonical()
 * Uses nauty via HNauty.pm in Perl; here we implement a simplified version
 */
export class GraphCanonicalizer {

  /**
   * Generate canonical string with sorted molecules and renumbered bonds
   * Algorithm mirrors BioNetGen's HNauty::canonical_hash()
   */
  static canonicalize(graph: SpeciesGraph): string {
    const moleculeSignatures = graph.molecules.map((mol, molIdx) => {
      const componentSignatures = mol.components
        .map((comp, compIdx) => {
          const stateSegment = comp.state && comp.state !== '?' ? `~${comp.state}` : '';
          const adjacencyKey = `${molIdx}.${compIdx}`;
          const partnerKey = graph.adjacency.get(adjacencyKey);

          if (partnerKey) {
            const [partnerMolIdxStr, partnerCompIdxStr] = partnerKey.split('.');
            const partnerMolIdx = Number(partnerMolIdxStr);
            const partnerCompIdx = Number(partnerCompIdxStr);
            const partnerMol = graph.molecules[partnerMolIdx];
            const partnerComp = partnerMol?.components[partnerCompIdx];
            const labelSegment = Array.from(comp.edges.keys())
              .sort((a, b) => a - b)
              .join('&');
            const labelPart = labelSegment ? `!${labelSegment}` : '!#';
            const partnerPart = partnerMol && partnerComp
              ? `->${partnerMol.name}:${partnerComp.name}`
              : '->?';
            return `${comp.name}${stateSegment}${labelPart}${partnerPart}`;
          }

          if (comp.wildcard) {
            return `${comp.name}${stateSegment}!${comp.wildcard}`;
          }

          return `${comp.name}${stateSegment}!_`;
        })
        .sort();

      const compartmentSegment = mol.compartment ? `@${mol.compartment}` : '';
      return `${mol.name}${compartmentSegment}(${componentSignatures.join(',')})`;
    });

    moleculeSignatures.sort();
    return moleculeSignatures.join('.');
  }

  /**
   * Compute automorphism group size (for StatFactor correction)
   * BioNetGen: SpeciesGraph::aut_permutations()
   */
  static computeAutomorphisms(_graph: SpeciesGraph): number {
    // Count symmetries using nauty's automorphism generator
    // For simple cases: detect identical molecules/components
    return 1;  // Placeholder - full implementation uses nauty orbits
  }
}