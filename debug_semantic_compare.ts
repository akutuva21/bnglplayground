/**
 * Test if BNG2 and web species are semantically equivalent (isomorphic)
 */
import { readFileSync } from 'fs';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

// Helper to create a signature that's canonical regardless of representation
function getSemanticSignature(speciesStr: string): string {
  try {
    const graph = BNGLParser.parseSpeciesGraph(speciesStr);
    // Use our canonicalizer - it should produce the same output for isomorphic graphs
    return GraphCanonicalizer.canonicalize(graph);
  } catch (e) {
    return `ERROR:${speciesStr}`;
  }
}

// Load BNG2 species
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

// Generate web species
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

const generator = new NetworkGenerator({ 
  maxSpecies: 1000, 
  maxIterations: 1000, 
  maxStoich: 500
});

console.log('Generating network...');
const result = await generator.generate(seedSpecies, rules);
console.log(`Web: ${result.species.length} species`);
console.log(`BNG2: ${bng2Species.length} species`);

// Create semantic signature maps
const bng2Sigs = new Map<string, string>(); // signature -> original string
const webSigs = new Map<string, string>(); // signature -> original string

for (const s of bng2Species) {
  const sig = getSemanticSignature(s);
  if (!bng2Sigs.has(sig)) {
    bng2Sigs.set(sig, s);
  } else {
    console.log(`BNG2 collision: ${s} and ${bng2Sigs.get(sig)} have same signature`);
  }
}

for (const sp of result.species) {
  const s = GraphCanonicalizer.canonicalize(sp.graph);
  if (!webSigs.has(s)) {
    webSigs.set(s, s);
  } else {
    console.log(`Web collision: two species have same signature ${s}`);
  }
}

console.log(`\nBNG2 unique signatures: ${bng2Sigs.size}`);
console.log(`Web unique signatures: ${webSigs.size}`);

// Compare
let inBoth = 0;
let onlyInBng2 = 0;
let onlyInWeb = 0;

for (const [sig, orig] of bng2Sigs) {
  if (webSigs.has(sig)) {
    inBoth++;
  } else {
    onlyInBng2++;
  }
}

for (const [sig, orig] of webSigs) {
  if (!bng2Sigs.has(sig)) {
    onlyInWeb++;
  }
}

console.log(`\nComparison:`);
console.log(`  In both: ${inBoth}`);
console.log(`  Only in BNG2: ${onlyInBng2}`);
console.log(`  Only in Web: ${onlyInWeb}`);

// Show some examples of mismatches
console.log(`\n=== Species only in BNG2 (first 5) ===`);
let count = 0;
for (const [sig, orig] of bng2Sigs) {
  if (!webSigs.has(sig)) {
    console.log(`  BNG2: ${orig}`);
    console.log(`  Sig:  ${sig}`);
    count++;
    if (count >= 5) break;
  }
}

console.log(`\n=== Species only in Web (first 5) ===`);
count = 0;
for (const [sig, orig] of webSigs) {
  if (!bng2Sigs.has(sig)) {
    console.log(`  Web: ${orig}`);
    count++;
    if (count >= 5) break;
  }
}
