/**
 * Debug symmetric dimer canonicalization
 */
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

// BNG2 species 8 - symmetric dimer (both egfrs are Y,Y)
const species8_bng2 = 'egf(r!1).egf(r!2).egfr(Y1068~Y,Y1148~Y,l!1,r!3).egfr(Y1068~Y,Y1148~Y,l!2,r!3)';

// BNG2 species 9 - asymmetric dimer (one egfr is pY,Y)
const species9_bng2 = 'egf(r!1).egf(r!2).egfr(Y1068~Y,Y1148~Y,l!2,r!3).egfr(Y1068~pY,Y1148~Y,l!1,r!3)';

// Permutation of species 8 (should canonicalize to the same)
const species8_alt = 'egf(r!2).egf(r!1).egfr(Y1068~Y,Y1148~Y,l!2,r!3).egfr(Y1068~Y,Y1148~Y,l!1,r!3)';

// Permutation of species 9 (should canonicalize to the same) 
const species9_alt = 'egf(r!2).egf(r!1).egfr(Y1068~pY,Y1148~Y,l!2,r!3).egfr(Y1068~Y,Y1148~Y,l!1,r!3)';

console.log('=== Parsing species ===');
const g8_bng2 = BNGLParser.parseSpeciesGraph(species8_bng2);
const g8_alt = BNGLParser.parseSpeciesGraph(species8_alt);
const g9_bng2 = BNGLParser.parseSpeciesGraph(species9_bng2);
const g9_alt = BNGLParser.parseSpeciesGraph(species9_alt);

console.log('\n=== Canonicalization results ===');
const c8_bng2 = GraphCanonicalizer.canonicalize(g8_bng2);
const c8_alt = GraphCanonicalizer.canonicalize(g8_alt);
const c9_bng2 = GraphCanonicalizer.canonicalize(g9_bng2);
const c9_alt = GraphCanonicalizer.canonicalize(g9_alt);

console.log('Species 8 BNG2:', c8_bng2);
console.log('Species 8 alt: ', c8_alt);
console.log('Match:', c8_bng2 === c8_alt);

console.log('\nSpecies 9 BNG2:', c9_bng2);
console.log('Species 9 alt: ', c9_alt);
console.log('Match:', c9_bng2 === c9_alt);

console.log('\n=== All four unique? ===');
const all = [c8_bng2, c8_alt, c9_bng2, c9_alt];
const unique = new Set(all);
console.log(`Unique canonical forms: ${unique.size} (should be 2)`);
for (const u of unique) {
  console.log(`  ${u}`);
}

// Check for more permutations
console.log('\n=== More permutations of symmetric dimer ===');
const permutations = [
  'egf(r!1).egf(r!2).egfr(Y1068~Y,Y1148~Y,l!1,r!3).egfr(Y1068~Y,Y1148~Y,l!2,r!3)',
  'egf(r!1).egf(r!2).egfr(Y1068~Y,Y1148~Y,l!2,r!3).egfr(Y1068~Y,Y1148~Y,l!1,r!3)',
  'egf(r!2).egf(r!1).egfr(Y1068~Y,Y1148~Y,l!1,r!3).egfr(Y1068~Y,Y1148~Y,l!2,r!3)',
  'egf(r!2).egf(r!1).egfr(Y1068~Y,Y1148~Y,l!2,r!3).egfr(Y1068~Y,Y1148~Y,l!1,r!3)',
];

const canonicalForms = new Set<string>();
for (const p of permutations) {
  const g = BNGLParser.parseSpeciesGraph(p);
  const c = GraphCanonicalizer.canonicalize(g);
  console.log(`  ${p}`);
  console.log(`  -> ${c}`);
  canonicalForms.add(c);
}
console.log(`\nUnique canonical forms: ${canonicalForms.size} (should be 1)`);
