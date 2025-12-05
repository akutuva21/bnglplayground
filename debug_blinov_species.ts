/**
 * Debug Blinov_2006 species over-generation
 * Compare our generated species with BNG2's .net file
 */
import { readFileSync } from 'fs';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

// Load BNG2 .net file to get reference species
const netFile = readFileSync('bng_test_output/Blinov_2006.net', 'utf-8');
const speciesSection = netFile.match(/begin species\r?\n([\s\S]*?)\r?\nend species/);
const bng2Species: string[] = [];
if (speciesSection) {
  const lines = speciesSection[1].split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*\d+\s+(\S+)/);
    if (match) {
      bng2Species.push(match[1]);
    }
  }
}
console.log(`BNG2 species count: ${bng2Species.length}`);

// Parse BNGL and generate network
const bngl = readFileSync('published-models/complex-models/Blinov_2006.bngl', 'utf-8');
const model = parseBNGL(bngl);

const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
const rules = model.reactionRules.flatMap(r => {
  const ruleStr = `${r.reactants.join(' + ')} -> ${r.products.join(' + ')}`;
  const forwardRule = BNGLParser.parseRxnRule(ruleStr, 1.0);
  forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');
  if (r.isBidirectional) {
    const reverseRuleStr = `${r.products.join(' + ')} -> ${r.reactants.join(' + ')}`;
    const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, 1.0);
    reverseRule.name = r.products.join('+') + '->' + r.reactants.join('+');
    return [forwardRule, reverseRule];
  }
  return [forwardRule];
});

// Generate network with same limits as BNG2 (no special limits)
const generator = new NetworkGenerator({ 
  maxSpecies: 1000, 
  maxIterations: 1000, 
  maxStoich: 500
});

console.log('\nGenerating network...');
const result = await generator.generate(seedSpecies, rules);
console.log(`Web species count: ${result.species.length}`);

// Canonicalize our species
const webSpecies = result.species.map(s => GraphCanonicalizer.canonicalize(s.graph));

// Find species that are in BNG2 but not in ours
const webSet = new Set(webSpecies);
const bng2Set = new Set(bng2Species);

console.log('\n=== Species only in BNG2 (missing from web) ===');
const missingInWeb = bng2Species.filter(s => !webSet.has(s));
console.log(`Count: ${missingInWeb.length}`);
missingInWeb.slice(0, 10).forEach(s => console.log(`  ${s}`));
if (missingInWeb.length > 10) console.log('  ...');

console.log('\n=== Species only in Web (extra, not in BNG2) ===');
const extraInWeb = webSpecies.filter(s => !bng2Set.has(s));
console.log(`Count: ${extraInWeb.length}`);
extraInWeb.slice(0, 20).forEach(s => console.log(`  ${s}`));
if (extraInWeb.length > 20) console.log('  ...');

// Check if extra species are just canonicalization differences
console.log('\n=== Checking canonicalization differences ===');
// Parse BNG2 species and re-canonicalize them
const bng2Recanonized: string[] = [];
for (const s of bng2Species) {
  try {
    const parsed = BNGLParser.parseSpeciesGraph(s);
    const canonical = GraphCanonicalizer.canonicalize(parsed);
    bng2Recanonized.push(canonical);
  } catch (e) {
    console.log(`  Failed to parse BNG2 species: ${s}`);
  }
}

const bng2RecanonizedSet = new Set(bng2Recanonized);
console.log(`BNG2 species after re-canonicalization: ${bng2RecanonizedSet.size} (was ${bng2Species.length})`);

// Check how many of our species are in the re-canonicalized set
const matchingAfterRecanon = webSpecies.filter(s => bng2RecanonizedSet.has(s));
console.log(`Web species matching BNG2 (after re-canon): ${matchingAfterRecanon.length}`);

// Find species that differ in canonicalization
console.log('\n=== BNG2 species with different canonical form ===');
for (let i = 0; i < Math.min(10, bng2Species.length); i++) {
  if (bng2Species[i] !== bng2Recanonized[i]) {
    console.log(`  BNG2: ${bng2Species[i]}`);
    console.log(`  Ours: ${bng2Recanonized[i]}`);
    console.log();
  }
}

// Analyze molecule counts in species to understand complexity
console.log('\n=== Species complexity analysis ===');
const webMolCounts = new Map<number, number>();
for (const s of result.species) {
  const count = s.graph.molecules.length;
  webMolCounts.set(count, (webMolCounts.get(count) || 0) + 1);
}
console.log('Web species by molecule count:');
Array.from(webMolCounts.entries()).sort((a, b) => a[0] - b[0]).forEach(([count, num]) => {
  console.log(`  ${count} molecules: ${num} species`);
});

const bng2MolCounts = new Map<number, number>();
for (const s of bng2Species) {
  const count = (s.match(/\./g) || []).length + 1;  // Count dots + 1
  bng2MolCounts.set(count, (bng2MolCounts.get(count) || 0) + 1);
}
console.log('BNG2 species by molecule count:');
Array.from(bng2MolCounts.entries()).sort((a, b) => a[0] - b[0]).forEach(([count, num]) => {
  console.log(`  ${count} molecules: ${num} species`);
});
