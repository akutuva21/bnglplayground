/**
 * Debug dual-site-phosphorylation network generation
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

// Import BNG2 path defaults
import { DEFAULT_BNG2_PATH, DEFAULT_PERL_CMD } from './scripts/bngDefaults.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const BNG2_PATH = process.env.BNG2_PATH ?? DEFAULT_BNG2_PATH;
const PERL_CMD = process.env.PERL_CMD ?? DEFAULT_PERL_CMD;

function runBNG2AndGetNet(bnglPath: string): { gdat: string, net: string } | null {
  // Copy to temp dir
  const tmpDir = mkdtempSync(join(tmpdir(), 'bng2-'));
  const tmpBnglPath = join(tmpDir, basename(bnglPath));
  copyFileSync(bnglPath, tmpBnglPath);
  
  const result = spawnSync(PERL_CMD, [BNG2_PATH, tmpBnglPath], {
    cwd: tmpDir,
    encoding: 'utf8',
    timeout: 60000,
  });
  
  if (result.status !== 0) {
    console.error('BNG2 error:', result.stderr);
    rmSync(tmpDir, { recursive: true, force: true });
    return null;
  }
  
  const gdatPath = tmpBnglPath.replace('.bngl', '.gdat');
  const netPath = tmpBnglPath.replace('.bngl', '.net');
  
  const gdat = existsSync(gdatPath) ? readFileSync(gdatPath, 'utf8') : '';
  const net = existsSync(netPath) ? readFileSync(netPath, 'utf8') : '';
  
  rmSync(tmpDir, { recursive: true, force: true });
  return { gdat, net };
}

function formatSpeciesList(species: string[]): string {
  return species.length === 0 ? '0' : species.join(' + ');
}

async function main() {
  console.log('=== DUAL-SITE-PHOSPHORYLATION NETWORK COMPARISON ===\n');
  
  const modelPath = resolve(thisDir, 'example-models/dual-site-phosphorylation.bngl');
  const bnglContent = readFileSync(modelPath, 'utf-8');
  
  // Run BNG2 to get reference network
  console.log('Running BNG2.pl...');
  const bng2Result = runBNG2AndGetNet(modelPath);
  if (!bng2Result) {
    console.error('BNG2 failed');
    return;
  }
  
  console.log('\n=== BNG2 .NET FILE ===');
  console.log(bng2Result.net);
  
  // Parse model
  const model = parseBNGL(bnglContent);
  console.log('\n=== PARSED MODEL ===');
  console.log('Species:', model.species.map(s => `${s.name}=${s.initialConcentration}`).join(', '));
  console.log('Parameters:', Object.entries(model.parameters).map(([k,v]) => `${k}=${v}`).join(', '));
  
  // Generate web network
  const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
  const seedConcentrationMap = new Map<string, number>();
  model.species.forEach(s => {
    const g = BNGLParser.parseSpeciesGraph(s.name);
    const canonicalName = GraphCanonicalizer.canonicalize(g);
    seedConcentrationMap.set(canonicalName, s.initialConcentration);
  });
  
  const parametersMap = new Map(Object.entries(model.parameters));
  const observableNames = new Set(model.observables.map(o => o.name));
  
  const rules = model.reactionRules.flatMap(r => {
    const rate = BNGLParser.evaluateExpression(r.rate, parametersMap, observableNames);
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');
    
    if (r.isBidirectional && r.reverseRate) {
      const reverseRate = BNGLParser.evaluateExpression(r.reverseRate, parametersMap, observableNames);
      const reverseRuleStr = `${formatSpeciesList(r.products)} -> ${formatSpeciesList(r.reactants)}`;
      const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
      reverseRule.name = r.products.join('+') + '->' + r.reactants.join('+');
      return [forwardRule, reverseRule];
    }
    return [forwardRule];
  });
  
  console.log('\n=== PARSED RULES ===');
  rules.forEach((rule, i) => {
    console.log(`  ${i}: ${rule.reactants.map(r => r.toString()).join(' + ')} -> ${rule.products.map(p => p.toString()).join(' + ')} @ ${rule.rateConstant}`);
  });
  
  const generator = new NetworkGenerator({ 
    maxSpecies: 1000,
    maxIterations: 100,
    maxAgg: 100,
    maxStoich: 100
  });
  
  console.log('\n=== GENERATING WEB NETWORK ===');
  const network = await generator.generate(seedSpecies, rules);
  
  console.log(`\nGenerated ${network.species.length} species:`);
  network.species.forEach((sp, i) => {
    const spName = GraphCanonicalizer.canonicalize(sp.graph);
    const conc = seedConcentrationMap.get(spName) || 0;
    console.log(`  ${i}: ${spName} = ${conc}`);
  });
  
  console.log(`\nGenerated ${network.reactions.length} reactions:`);
  network.reactions.forEach((rxn, i) => {
    const reactants = rxn.reactants.map(r => `[${r}]${GraphCanonicalizer.canonicalize(network.species[r].graph)}`).join(' + ');
    const products = rxn.products.map(p => `[${p}]${GraphCanonicalizer.canonicalize(network.species[p].graph)}`).join(' + ');
    console.log(`  ${i}: ${reactants} -> ${products} @ ${rxn.rate}`);
  });
}

main().catch(console.error);
