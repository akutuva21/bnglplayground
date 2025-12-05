/**
 * Debug script to compare An_2009 species between web simulator and BNG2
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
    return GraphCanonicalizer.canonicalize(graph);
  } catch (e) {
    return `ERROR:${speciesStr}`;
  }
}

async function main() {
  // Read BNG2's .net file
  const netFile = readFileSync('bng_test_output/An_2009.net', 'utf-8');
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
  
  // Parse and generate network from BNGL
  const bngl = readFileSync('published-models/immune-signaling/An_2009.bngl', 'utf-8');
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
  
  // Get canonical forms
  const bng2Sigs = new Map<string, string>(); // signature -> original string
  const webSigs = new Map<string, string>(); // signature -> original string

  for (const s of bng2Species) {
    const sig = getSemanticSignature(s);
    if (!bng2Sigs.has(sig)) {
      bng2Sigs.set(sig, s);
    }
  }

  for (const sp of result.species) {
    const s = GraphCanonicalizer.canonicalize(sp.graph);
    if (!webSigs.has(s)) {
      webSigs.set(s, s);
    }
  }

  console.log(`\nBNG2 unique signatures: ${bng2Sigs.size}`);
  console.log(`Web unique signatures: ${webSigs.size}`);
  
  // Compare
  const inBoth = new Set<string>();
  const onlyInBng2 = new Set<string>();
  const onlyInWeb = new Set<string>();
  
  for (const sig of bng2Sigs.keys()) {
    if (webSigs.has(sig)) {
      inBoth.add(sig);
    } else {
      onlyInBng2.add(sig);
    }
  }
  
  for (const sig of webSigs.keys()) {
    if (!bng2Sigs.has(sig)) {
      onlyInWeb.add(sig);
    }
  }
  
  console.log(`\nComparison:`);
  console.log(`  In both: ${inBoth.size}`);
  console.log(`  Only in BNG2: ${onlyInBng2.size}`);
  console.log(`  Only in Web: ${onlyInWeb.size}`);
  
  // Show mismatches
  if (onlyInBng2.size > 0) {
    console.log(`\n=== Species only in BNG2 (first 10) ===`);
    let count = 0;
    for (const [sig, orig] of bng2Sigs.entries()) {
      if (onlyInBng2.has(sig)) {
        if (count >= 10) break;
        console.log(`  BNG2: ${orig}`);
        console.log(`  Canonical: ${sig}`);
        count++;
      }
    }
  }
  
  if (onlyInWeb.size > 0) {
    console.log(`\n=== Species only in Web (first 10) ===`);
    let count = 0;
    for (const sig of onlyInWeb) {
      if (count >= 10) break;
      console.log(`  ${sig}`);
      count++;
    }
  }
}

main().catch(console.error);
