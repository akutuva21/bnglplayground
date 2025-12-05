/**
 * Compare species canonical forms more carefully
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

// Parse BNG2 species and re-canonicalize them to get consistent comparison
const bng2CanonicalToOriginal = new Map<string, string>();
for (const s of bng2Species) {
  try {
    const parsed = BNGLParser.parseSpeciesGraph(s);
    const canonical = GraphCanonicalizer.canonicalize(parsed);
    bng2CanonicalToOriginal.set(canonical, s);
  } catch (e) {
    console.log(`  Failed to parse BNG2 species: ${s}`, e);
  }
}
console.log(`BNG2 unique canonical forms: ${bng2CanonicalToOriginal.size}`);

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

// Generate network
const generator = new NetworkGenerator({ 
  maxSpecies: 1000, 
  maxIterations: 1000, 
  maxStoich: 500
});

const result = await generator.generate(seedSpecies, rules);
console.log(`Web species count: ${result.species.length}`);

// Compare canonical forms
const webCanonicalToOriginal = new Map<string, string>();
for (const s of result.species) {
  const canonical = GraphCanonicalizer.canonicalize(s.graph);
  webCanonicalToOriginal.set(canonical, s.graph.toString());
}
console.log(`Web unique canonical forms: ${webCanonicalToOriginal.size}`);

// Find species in web but not in BNG2
const extraInWeb: string[] = [];
for (const [canonical, original] of webCanonicalToOriginal) {
  if (!bng2CanonicalToOriginal.has(canonical)) {
    extraInWeb.push(canonical);
  }
}
console.log(`\nExtra species in Web (not in BNG2): ${extraInWeb.length}`);

// Find species in BNG2 but not in web
const missingInWeb: string[] = [];
for (const [canonical, original] of bng2CanonicalToOriginal) {
  if (!webCanonicalToOriginal.has(canonical)) {
    missingInWeb.push(original);
  }
}
console.log(`Missing species in Web (in BNG2): ${missingInWeb.length}`);

// Show some examples
console.log('\n=== Examples of extra species in Web ===');
extraInWeb.slice(0, 10).forEach((s, i) => {
  const molCount = s.split('.').length;
  console.log(`  [${molCount} mol] ${s.slice(0, 100)}${s.length > 100 ? '...' : ''}`);
});

console.log('\n=== Examples of missing species (in BNG2 but not Web) ===');
missingInWeb.slice(0, 10).forEach((s, i) => {
  const molCount = s.split('.').length;
  console.log(`  [${molCount} mol] ${s.slice(0, 100)}${s.length > 100 ? '...' : ''}`);
});

// Check if extra species might be canonicalization collisions
console.log('\n=== Analyzing canonicalization collision potential ===');
const bng2Hashes = new Set<string>();
for (const [canonical] of bng2CanonicalToOriginal) {
  bng2Hashes.add(canonical);
}

// Check for collision: different BNG2 original strings mapping to same canonical
const originalToCanonical = new Map<string, string>();
let collisions = 0;
for (const s of bng2Species) {
  try {
    const parsed = BNGLParser.parseSpeciesGraph(s);
    const canonical = GraphCanonicalizer.canonicalize(parsed);
    if (originalToCanonical.has(canonical) && originalToCanonical.get(canonical) !== s) {
      collisions++;
      console.log(`Collision: ${s} and ${originalToCanonical.get(canonical)} both map to:`);
      console.log(`  ${canonical}`);
    }
    originalToCanonical.set(canonical, s);
  } catch (e) {
    // skip
  }
}
console.log(`Total BNG2 canonicalization collisions: ${collisions}`);
