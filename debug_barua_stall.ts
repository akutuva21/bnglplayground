// Debug Barua_2013 stall
import { readFileSync } from 'fs';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator, enableProfiling, printProfileData, resetProfileData } from './src/services/graph/NetworkGenerator';

const testFile = 'published-models/cell-regulation/Barua_2013.bngl';

async function debug() {
  console.log(`\n=== Debugging: ${testFile} ===\n`);

  const bngl = readFileSync(testFile, 'utf-8');
  const model = parseBNGL(bngl);
  
  console.log(`Rules: ${model.reactionRules.length}`);
  console.log(`Seed species: ${model.species.length}`);
  
  // Print rules
  console.log('\nRules:');
  for (const r of model.reactionRules) {
    console.log(`  ${r.reactants.join(' + ')} -> ${r.products.join(' + ')}`);
  }
  
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
  
  console.log(`\nTotal rules after expansion: ${rules.length}`);
  
  // Check for stoich limits from model
  const maxStoich = new Map<string, number>();
  maxStoich.set('APC', 1);
  maxStoich.set('AXIN', 1);
  maxStoich.set('bCat', 1);
  
  enableProfiling();
  resetProfileData();
  
  const generator = new NetworkGenerator({
    maxIterations: 1000,
    maxSpecies: 5000,
    maxReactions: 50000,
    maxAgg: 100,
    maxStoich: maxStoich
  });
  
  const genStart = performance.now();
  
  // Add abort controller like the test does
  const abortController = new AbortController();
  
  // Add timeout
  const timeout = setTimeout(() => {
    console.log('\n\n=== TIMEOUT after 30 seconds! ===');
    abortController.abort();
    printProfileData();
    process.exit(1);
  }, 30000);
  
  try {
    const result = await generator.generate(seedSpecies, rules, (progress) => {
      console.log(`Progress: ${progress.species} species, ${progress.reactions} reactions, iter ${progress.iteration}`);
    }, abortController.signal);
    
    clearTimeout(timeout);
    
    const genEnd = performance.now();
    console.log(`\nNetwork generation: ${((genEnd - genStart) / 1000).toFixed(3)}s`);
    console.log(`  Species: ${result.species.length}`);
    console.log(`  Reactions: ${result.reactions.length}`);
    
    printProfileData();
  } catch (e) {
    clearTimeout(timeout);
    console.error('Error:', e);
    printProfileData();
  }
}

debug().catch(console.error);
