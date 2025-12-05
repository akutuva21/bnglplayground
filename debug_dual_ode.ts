/**
 * Full simulation debug for dual-site-phosphorylation
 * Trace every step to find where web diverges from BNG2
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

function runBNG2(bnglPath: string): { gdat: string, net: string } | null {
  const tmpDir = mkdtempSync(join(tmpdir(), 'bng2-'));
  const tmpBnglPath = join(tmpDir, basename(bnglPath));
  copyFileSync(bnglPath, tmpBnglPath);
  
  const result = spawnSync(PERL_CMD, [BNG2_PATH, tmpBnglPath], {
    cwd: tmpDir,
    encoding: 'utf8',
    timeout: 60000,
  });
  
  if (result.status !== 0) {
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

function parseGdat(content: string): { headers: string[], data: number[][] } {
  const lines = content.trim().split('\n');
  let headers: string[] = [];
  const data: number[][] = [];
  
  for (const line of lines) {
    if (line.startsWith('#')) {
      if (line.includes('time')) {
        headers = line.replace(/^#\s*/, '').trim().split(/\s+/);
      }
      continue;
    }
    const values = line.trim().split(/\s+/).map(Number);
    if (values.length > 0 && !values.some(isNaN)) {
      data.push(values);
    }
  }
  return { headers, data };
}

function formatSpeciesList(species: string[]): string {
  return species.length === 0 ? '0' : species.join(' + ');
}

async function main() {
  console.log('=== DUAL-SITE ODE COMPARISON ===\n');
  
  const modelPath = resolve(thisDir, 'example-models/dual-site-phosphorylation.bngl');
  const bnglContent = readFileSync(modelPath, 'utf-8');
  
  // Get BNG2 reference
  console.log('Running BNG2.pl...');
  const bng2Result = runBNG2(modelPath);
  if (!bng2Result) {
    console.error('BNG2 failed');
    return;
  }
  
  const bng2Gdat = parseGdat(bng2Result.gdat);
  console.log('BNG2 headers:', bng2Gdat.headers);
  console.log('BNG2 time points:', bng2Gdat.data.length);
  
  // Parse model and generate web network
  const model = parseBNGL(bnglContent);
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
      return [forwardRule, reverseRule];
    }
    return [forwardRule];
  });
  
  const generator = new NetworkGenerator({ 
    maxSpecies: 1000,
    maxIterations: 100,
    maxAgg: 100,
    maxStoich: 100
  });
  
  const network = await generator.generate(seedSpecies, rules);
  
  // Map species names to indices
  const speciesNames: string[] = network.species.map(s => GraphCanonicalizer.canonicalize(s.graph));
  const speciesNameToIdx = new Map<string, number>();
  speciesNames.forEach((name, i) => speciesNameToIdx.set(name, i));
  
  console.log('\nSpecies mapping:');
  speciesNames.forEach((name, i) => console.log(`  ${i}: ${name}`));
  
  // Observable indices
  // Unphosphorylated = Substrate(y1~U,y2~U) = species 2
  // SingleP_y1 = Substrate(y1~P,y2~U) = species 3
  // SingleP_y2 = Substrate(y1~U,y2~P) = species 4  
  // DoubleP = Substrate(y1~P,y2~P) = species 5
  const obsIndices = {
    Unphosphorylated: speciesNameToIdx.get('Substrate(y1~U,y2~U)') ?? -1,
    SingleP_y1: speciesNameToIdx.get('Substrate(y1~P,y2~U)') ?? -1,
    SingleP_y2: speciesNameToIdx.get('Substrate(y1~U,y2~P)') ?? -1,
    DoubleP: speciesNameToIdx.get('Substrate(y1~P,y2~P)') ?? -1,
  };
  console.log('\nObservable indices:', obsIndices);
  
  // Initial state
  const numSpecies = network.species.length;
  const state = new Float64Array(numSpecies);
  for (let i = 0; i < numSpecies; i++) {
    state[i] = seedConcentrationMap.get(speciesNames[i]) || 0;
  }
  console.log('\nInitial concentrations:', Array.from(state));
  
  // Prepare reactions
  const reactions = network.reactions.map(rxn => ({
    reactants: rxn.reactants,
    products: rxn.products,
    rate: rxn.rate
  }));
  
  console.log('\nReactions:');
  reactions.forEach((rxn, i) => {
    console.log(`  ${i}: [${rxn.reactants}] -> [${rxn.products}] @ ${rxn.rate}`);
  });
  
  // ODE solver (same as test code)
  const derivatives = (yIn: Float64Array, dydt: Float64Array) => {
    dydt.fill(0);
    for (const rxn of reactions) {
      let velocity = rxn.rate;
      for (const r of rxn.reactants) velocity *= yIn[r];
      for (const r of rxn.reactants) dydt[r] -= velocity;
      for (const p of rxn.products) dydt[p] += velocity;
    }
  };
  
  const rk4Step = (yCurr: Float64Array, h: number) => {
    const n = yCurr.length;
    const k1 = new Float64Array(n);
    const k2 = new Float64Array(n);
    const k3 = new Float64Array(n);
    const k4 = new Float64Array(n);
    const temp = new Float64Array(n);
    const yNext = new Float64Array(n);
    
    derivatives(yCurr, k1);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k1[i];
    derivatives(temp, k2);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k2[i];
    derivatives(temp, k3);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + h * k3[i];
    derivatives(temp, k4);
    
    for(let i=0; i<n; i++) {
      yNext[i] = yCurr[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    return yNext;
  };
  
  // Simulate with FIXED small step
  const t_end = 80;
  const n_steps = 160;
  const dtOut = t_end / n_steps;
  const dt = 0.001;  // Fixed small step
  
  let y = new Float64Array(state);
  let t = 0;
  
  const webResults: number[][] = [];
  webResults.push([0, y[obsIndices.Unphosphorylated], y[obsIndices.SingleP_y1], y[obsIndices.SingleP_y2], y[obsIndices.DoubleP]]);
  
  for (let i = 1; i <= n_steps; i++) {
    const tTarget = i * dtOut;
    
    while (t < tTarget - 1e-12) {
      let h = Math.min(dt, tTarget - t);
      y = rk4Step(y, h);
      t += h;
    }
    
    webResults.push([tTarget, y[obsIndices.Unphosphorylated], y[obsIndices.SingleP_y1], y[obsIndices.SingleP_y2], y[obsIndices.DoubleP]]);
  }
  
  // Compare results
  console.log('\n=== COMPARISON ===');
  console.log('Time\tBNG2_Unphos\tWeb_Unphos\tDiff%');
  
  const timePoints = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80];
  for (const time of timePoints) {
    const bng2Row = bng2Gdat.data.find(row => Math.abs(row[0] - time) < 0.1);
    const webRow = webResults.find(row => Math.abs(row[0] - time) < 0.1);
    
    if (bng2Row && webRow) {
      const bng2Val = bng2Row[1];  // Unphosphorylated
      const webVal = webRow[1];
      const diff = Math.abs(bng2Val - webVal) / Math.max(Math.abs(bng2Val), 1) * 100;
      console.log(`${time.toFixed(0)}\t${bng2Val.toFixed(4)}\t${webVal.toFixed(4)}\t${diff.toFixed(2)}%`);
    }
  }
  
  // Final values for all observables
  const finalBng2 = bng2Gdat.data[bng2Gdat.data.length - 1];
  const finalWeb = webResults[webResults.length - 1];
  
  console.log('\n=== FINAL VALUES (t=80) ===');
  console.log('Observable\tBNG2\t\tWeb\t\tDiff%');
  const obsNames = ['Unphosphorylated', 'SingleP_y1', 'SingleP_y2', 'DoubleP'];
  for (let i = 0; i < 4; i++) {
    const bng2Val = finalBng2[i + 1];
    const webVal = finalWeb[i + 1];
    const diff = Math.abs(bng2Val - webVal) / Math.max(Math.abs(bng2Val), 1) * 100;
    console.log(`${obsNames[i]}\t${bng2Val.toFixed(4)}\t\t${webVal.toFixed(4)}\t\t${diff.toFixed(2)}%`);
  }
  
  // Mass conservation check
  const totalSubstrate = finalWeb[1] + finalWeb[2] + finalWeb[3] + finalWeb[4];
  console.log(`\nTotal substrate (should be 200): ${totalSubstrate.toFixed(4)}`);
}

main().catch(console.error);
