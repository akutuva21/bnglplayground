// Profile network generation to find bottlenecks
import { readFileSync } from 'fs';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator, resetProfileData, printProfileData, enableProfiling, PROFILE_DATA } from './src/services/graph/NetworkGenerator';

// Enable profiling BEFORE running the generation
enableProfiling();
resetProfileData();

const testFile = process.argv[2] || 'published-models/complex-models/Blinov_2006.bngl';

async function profile() {
  console.log(`\n=== Profiling: ${testFile} ===\n`);

  // Parse
  const parseStart = performance.now();
  const bngl = readFileSync(testFile, 'utf-8');
  const model = parseBNGL(bngl);
  const parseEnd = performance.now();
  console.log(`Parse time: ${((parseEnd - parseStart) / 1000).toFixed(3)}s`);

  // Build seed species and rules
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

  // Network generation
  const genStart = performance.now();
  const generator = new NetworkGenerator({
    maxIterations: 1000,
    maxSpecies: 5000,
    maxReactions: 50000,
    maxAgg: 100,
  });
  const result = await generator.generate(seedSpecies, rules);
  const genEnd = performance.now();

  console.log(`\nNetwork generation: ${((genEnd - genStart) / 1000).toFixed(3)}s`);
  console.log(`  Species: ${result.species.length}`);
  console.log(`  Reactions: ${result.reactions.length}`);

  // Print profiling data
  printProfileData();
}

profile().catch(console.error);
