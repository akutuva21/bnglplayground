/**
 * Deep debug symmetric dimer canonicalization
 */
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { SpeciesGraph } from './src/services/graph/core/SpeciesGraph';

// Two permutations that should be the same
const perm1 = 'egf(r!1).egf(r!2).egfr(Y1068~Y,Y1148~Y,l!1,r!3).egfr(Y1068~Y,Y1148~Y,l!2,r!3)';
const perm2 = 'egf(r!1).egf(r!2).egfr(Y1068~Y,Y1148~Y,l!2,r!3).egfr(Y1068~Y,Y1148~Y,l!1,r!3)';

const g1 = BNGLParser.parseSpeciesGraph(perm1);
const g2 = BNGLParser.parseSpeciesGraph(perm2);

console.log('=== Permutation 1 ===');
console.log('Molecules:');
g1.molecules.forEach((mol, idx) => {
  console.log(`  [${idx}] ${mol.name}(${mol.components.map(c => c.name + (c.state ? '~' + c.state : '')).join(',')})`);
});
console.log('Adjacency:');
for (const [key, val] of g1.adjacency) {
  console.log(`  ${key} -> ${val}`);
}

console.log('\n=== Permutation 2 ===');
console.log('Molecules:');
g2.molecules.forEach((mol, idx) => {
  console.log(`  [${idx}] ${mol.name}(${mol.components.map(c => c.name + (c.state ? '~' + c.state : '')).join(',')})`);
});
console.log('Adjacency:');
for (const [key, val] of g2.adjacency) {
  console.log(`  ${key} -> ${val}`);
}

// Manual WL refinement
function getLocalSig(mol: any): string {
  return `${mol.name}(${mol.components.map((c: any) => c.name + (c.state && c.state !== '?' ? '~' + c.state : '')).join(',')})`;
}

function refine(graph: SpeciesGraph): string[] {
  const n = graph.molecules.length;
  let sigs = graph.molecules.map(getLocalSig);
  console.log(`\nInitial signatures: ${sigs.join(' | ')}`);
  
  for (let iter = 0; iter < n; iter++) {
    const newSigs = sigs.slice();
    
    for (let molIdx = 0; molIdx < n; molIdx++) {
      const mol = graph.molecules[molIdx];
      const neighborSigs: string[] = [];
      
      for (let compIdx = 0; compIdx < mol.components.length; compIdx++) {
        const key = `${molIdx}.${compIdx}`;
        const partners = graph.adjacency.get(key);
        if (partners) {
          for (const partner of partners) {
            const [pMolIdx, pCompIdx] = partner.split('.').map(Number);
            neighborSigs.push(`${mol.components[compIdx].name}->${graph.molecules[pMolIdx].components[pCompIdx]?.name}:${sigs[pMolIdx]}`);
          }
        }
      }
      neighborSigs.sort();
      newSigs[molIdx] = sigs[molIdx] + '|' + neighborSigs.join(';');
    }
    
    console.log(`Iter ${iter + 1}: ${newSigs.map((s, i) => `[${i}] ${s.slice(0, 50)}...`).join(' | ')}`);
    
    if (newSigs.every((s, i) => s === sigs[i])) {
      console.log('  -> Converged');
      break;
    }
    sigs = newSigs;
  }
  
  return sigs;
}

console.log('\n=== Refining Perm 1 ===');
const sigs1 = refine(g1);

console.log('\n=== Refining Perm 2 ===');
const sigs2 = refine(g2);

// Check if same set of signatures
console.log('\n=== Signature comparison ===');
const sorted1 = [...sigs1].sort();
const sorted2 = [...sigs2].sort();
console.log('Sorted sigs 1:', sorted1.map(s => s.slice(0, 30) + '...').join(' | '));
console.log('Sorted sigs 2:', sorted2.map(s => s.slice(0, 30) + '...').join(' | '));
console.log('Match:', JSON.stringify(sorted1) === JSON.stringify(sorted2));
