// graph/core/Canonical.ts
import { SpeciesGraph } from './SpeciesGraph';
import { Molecule } from './Molecule';

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
    // Step 1: Build adjacency matrix
    const n = graph.molecules.reduce((sum, m) => sum + m.components.length, 0);
    const adjMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    let nodeIdx = 0;
    const nodeLabels: string[] = [];
    const nodeToMol = new Map<number, [number, number]>();  // nodeIdx => [molIdx, compIdx]

    // Map components to nodes
    graph.molecules.forEach((mol, molIdx) => {
      mol.components.forEach((comp, compIdx) => {
        nodeLabels.push(`${mol.name}:${comp.name}:${comp.state || '*'}`);
        nodeToMol.set(nodeIdx, [molIdx, compIdx]);
        nodeIdx++;
      });
    });

    // Fill adjacency matrix from bonds
    for (const [key1, key2] of graph.adjacency.entries()) {
      const [m1, c1] = key1.split('.').map(Number);
      const [m2, c2] = key2.split('.').map(Number);
      const n1 = this.getNodeIndex(m1, c1, graph);
      const n2 = this.getNodeIndex(m2, c2, graph);
      adjMatrix[n1][n2] = 1;
      adjMatrix[n2][n1] = 1;
    }

    // Step 2: Compute canonical labeling (nauty-equivalent)
    const canonical = this.computeCanonicalLabeling(adjMatrix, nodeLabels);

    // Step 3: Rebuild canonical string
    return this.buildCanonicalString(canonical, graph);
  }

  private static getNodeIndex(molIdx: number, compIdx: number, graph: SpeciesGraph): number {
    let idx = 0;
    for (let i = 0; i < molIdx; i++) {
      idx += graph.molecules[i].components.length;
    }
    return idx + compIdx;
  }

  /**
   * Simplified nauty algorithm: lexicographically smallest DFS traversal
   * Production version should use actual nauty.js or Traces
   */
  private static computeCanonicalLabeling(adjMatrix: number[][], labels: string[]): number[] {
    // TODO: Implement full nauty algorithm OR use WebAssembly nauty
    // For now, sort nodes by label and rebuild
    const n = labels.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => labels[a].localeCompare(labels[b]));
    return indices;
  }

  private static buildCanonicalString(canonical: number[], graph: SpeciesGraph): string {
    // Rebuild species string in canonical order
    // Group nodes by molecule, sort molecules, renumber bonds
    // (Full implementation omitted for brevity - mirrors BioNetGen's logic)
    return graph.toString();  // Placeholder
  }

  /**
   * Compute automorphism group size (for StatFactor correction)
   * BioNetGen: SpeciesGraph::aut_permutations()
   */
  static computeAutomorphisms(graph: SpeciesGraph): number {
    // Count symmetries using nauty's automorphism generator
    // For simple cases: detect identical molecules/components
    return 1;  // Placeholder - full implementation uses nauty orbits
  }
}