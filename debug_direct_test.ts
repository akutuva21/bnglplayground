/**
 * Direct simulation test for Barua_2013 - same logic as the vitest test
 */
import { readFileSync, existsSync } from 'node:fs';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator, GeneratorProgress } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

// Format species list like the test does
const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

async function runTest() {
  const bnglPath = 'published-models/immune-signaling/An_2009.bngl';
  console.log(`Testing: ${bnglPath}`);
  
  if (!existsSync(bnglPath)) {
    console.error(`File not found: ${bnglPath}`);
    return;
  }
  
  const bnglContent = readFileSync(bnglPath, 'utf-8');
  const model = parseBNGL(bnglContent);
  
  console.log(`networkOptions:`, JSON.stringify(model.networkOptions));
  
  // Setup exactly like test
  const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
  const observableNames = new Set(model.observables.map(o => o.name));
  const parametersMap = new Map(Object.entries(model.parameters));
  
  // Build rules exactly like test
  const rules = model.reactionRules.flatMap(r => {
    const rate = BNGLParser.evaluateExpression(r.rate, parametersMap, observableNames);
    const reverseRate = r.reverseRate 
      ? BNGLParser.evaluateExpression(r.reverseRate, parametersMap, observableNames)
      : rate;
    
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');
    
    if (r.constraints && r.constraints.length > 0) {
      forwardRule.applyConstraints(r.constraints, (s: string) => BNGLParser.parseSpeciesGraph(s));
    }
    
    if (r.isBidirectional) {
      const reverseRuleStr = `${formatSpeciesList(r.products)} -> ${formatSpeciesList(r.reactants)}`;
      const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
      reverseRule.name = r.products.join('+') + '->' + r.reactants.join('+');
      return [forwardRule, reverseRule];
    } else {
      return [forwardRule];
    }
  });
  
  console.log(`Rules: ${rules.length}`);
  
  // Network options from model
  const networkOpts = model.networkOptions || {};
  const maxStoich = networkOpts.maxStoich 
    ? new Map(Object.entries(networkOpts.maxStoich))
    : 500;
  
  console.log(`maxStoich: ${maxStoich instanceof Map ? JSON.stringify(Array.from(maxStoich.entries())) : maxStoich}`);
  
  // Create abort controller like test
  const NETWORK_TIMEOUT_MS = 60000;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
    console.error(`NETWORK GENERATION TIMEOUT after ${NETWORK_TIMEOUT_MS/1000}s`);
  }, NETWORK_TIMEOUT_MS);
  
  const generator = new NetworkGenerator({ 
    maxSpecies: 5000,
    maxIterations: 5000,
    maxAgg: networkOpts.maxAgg ?? 500,
    maxStoich 
  });
  
  console.log('\nStarting network generation...');
  const networkStart = Date.now();
  
  try {
    const result = await generator.generate(
      seedSpecies, 
      rules,
      (progress) => {
        if (progress.iteration % 50 === 0) {
          console.log(`  Iter ${progress.iteration}: ${progress.species} species, ${progress.reactions} reactions (${(progress.timeElapsed/1000).toFixed(1)}s)`);
        }
      },
      abortController.signal
    );
    
    clearTimeout(timeoutId);
    const networkTime = Date.now() - networkStart;
    console.log(`\nNetwork generation complete in ${(networkTime/1000).toFixed(2)}s`);
    console.log(`  Species: ${result.species.length}`);
    console.log(`  Reactions: ${result.reactions.length}`);
    
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('Error:', e);
    throw e;
  }
}

runTest().catch(console.error);
