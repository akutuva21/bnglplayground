/**
 * Deep diagnostic for rab-gtpase-cycle ODE accuracy issue
 * Compare step by step with BNG2 output
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

const thisDir = dirname(fileURLToPath(import.meta.url));

// Run BNG2.pl and get the .net file to compare reaction network
function runBNG2(bnglPath: string): { gdat: string, net: string } | null {
  const perlCmd = 'perl';
  const bng2Path = resolve(thisDir, 'BioNetGen-2.9.2/BNG2.pl');
  
  const result = spawnSync(perlCmd, [bng2Path, bnglPath], {
    cwd: dirname(bnglPath),
    encoding: 'utf8',
    timeout: 60000,
  });
  
  if (result.status !== 0) {
    console.error('BNG2 error:', result.stderr);
    return null;
  }
  
  const gdatPath = bnglPath.replace('.bngl', '.gdat');
  const netPath = bnglPath.replace('.bngl', '.net');
  
  if (!require('fs').existsSync(gdatPath)) return null;
  
  const gdat = readFileSync(gdatPath, 'utf8');
  const net = require('fs').existsSync(netPath) ? readFileSync(netPath, 'utf8') : '';
  
  return { gdat, net };
}

// Parse GDAT output
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

async function main() {
  console.log('=== RAB-GTPASE-CYCLE ODE ACCURACY DIAGNOSTIC ===\n');
  
  const modelPath = resolve(thisDir, 'example-models/rab-gtpase-cycle.bngl');
  const bnglContent = readFileSync(modelPath, 'utf-8');
  
  console.log('Model content:');
  console.log(bnglContent);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Run BNG2 first
  console.log('Running BNG2.pl...');
  const bng2Result = runBNG2(modelPath);
  if (!bng2Result) {
    console.error('BNG2 failed');
    return;
  }
  
  const bng2Gdat = parseGdat(bng2Result.gdat);
  console.log('BNG2 Headers:', bng2Gdat.headers.join(', '));
  console.log(`BNG2 has ${bng2Gdat.data.length} time points`);
  
  // Show .net file to see exact network
  console.log('\n=== BNG2 .NET FILE ===');
  console.log(bng2Result.net);
  
  // Parse model
  const model = parseBNGL(bnglContent);
  console.log('\n=== PARSED MODEL ===');
  console.log('Species:', model.species.map(s => `${s.name}=${s.initialConcentration}`).join(', '));
  console.log('Parameters:', Object.entries(model.parameters).map(([k,v]) => `${k}=${v}`).join(', '));
  console.log('Observables:', model.observables.map(o => `${o.name}:${o.patterns?.join(',')||o.pattern}`).join(', '));
  
  console.log('\nReaction rules:');
  model.reactionRules.forEach((r, i) => {
    console.log(`  ${i}: ${r.reactants.join('+')} -> ${r.products.join('+')} @ ${r.rate}`);
  });
  
  // Generate network
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
    const ruleStr = `${r.reactants.join('.')} -> ${r.products.join('.')}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    
    if (r.isBidirectional && r.reverseRate) {
      const reverseRate = BNGLParser.evaluateExpression(r.reverseRate, parametersMap, observableNames);
      const reverseRuleStr = `${r.products.join('.')} -> ${r.reactants.join('.')}`;
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
  
  console.log('\nGenerating network...');
  const network = generator.generate(seedSpecies, rules);
  
  console.log('\n=== GENERATED NETWORK ===');
  console.log(`Species (${network.species.length}):`);
  network.species.forEach((sp, i) => {
    const conc = seedConcentrationMap.get(sp.name) || 0;
    console.log(`  ${i}: ${sp.name} = ${conc}`);
  });
  
  console.log(`\nReactions (${network.reactions.length}):`);
  network.reactions.forEach((rxn, i) => {
    const reactants = rxn.reactants.map(r => network.species[r].name).join(' + ');
    const products = rxn.products.map(p => network.species[p].name).join(' + ');
    console.log(`  ${i}: ${reactants} -> ${products} @ ${rxn.rate}`);
  });
  
  // Now simulate with detailed output
  console.log('\n=== ODE SIMULATION ===');
  
  const t_end = 80;
  const n_steps = 160;
  const numSpecies = network.species.length;
  
  // Initial state
  const state = new Float64Array(numSpecies);
  for (let i = 0; i < numSpecies; i++) {
    state[i] = seedConcentrationMap.get(network.species[i].name) || 0;
  }
  console.log('Initial state:', Array.from(state));
  
  // Derivatives function
  const derivatives = (yIn: Float64Array, dydt: Float64Array) => {
    dydt.fill(0);
    for (const rxn of network.reactions) {
      let velocity = rxn.rate;
      for (const r of rxn.reactants) velocity *= yIn[r];
      for (const r of rxn.reactants) dydt[r] -= velocity;
      for (const p of rxn.products) dydt[p] += velocity;
    }
  };
  
  // RK4 step
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
  
  // Simple fixed-step simulation
  let y = new Float64Array(state);
  let t = 0;
  const dtOut = t_end / n_steps;
  const dt = 0.01;  // Fixed small step
  
  const webData: number[][] = [];
  webData.push([0, ...evaluateObs(y)]);
  
  function evaluateObs(y: Float64Array): number[] {
    // RAB_GTP, Active_GEF, Active_GAP, Effector_On
    const speciesNameToIdx = new Map<string, number>();
    network.species.forEach((sp, i) => speciesNameToIdx.set(sp.name, i));
    
    // Find indices - need to match observable patterns
    const RAB_GTP = y[speciesNameToIdx.get('RAB(nucleotide~GTP)') ?? -1] || 0;
    const GEF_active = y[speciesNameToIdx.get('GEF(state~active)') ?? -1] || 0;
    const GAP_active = y[speciesNameToIdx.get('GAP(state~active)') ?? -1] || 0;
    const Effector_on = y[speciesNameToIdx.get('Effector(state~on)') ?? -1] || 0;
    
    return [RAB_GTP, GEF_active, GAP_active, Effector_on];
  }
  
  for (let i = 1; i <= n_steps; i++) {
    const tTarget = i * dtOut;
    
    while (t < tTarget - 1e-12) {
      let h = dt;
      if (t + h > tTarget) h = tTarget - t;
      y = rk4Step(y, h);
      t += h;
    }
    
    webData.push([tTarget, ...evaluateObs(y)]);
  }
  
  // Compare at specific time points
  console.log('\n=== COMPARISON ===');
  console.log('Time\tBNG2_RAB_GTP\tWeb_RAB_GTP\tDiff%');
  
  for (let i = 0; i < Math.min(20, webData.length); i += 10) {
    const webTime = webData[i][0];
    const webRabGtp = webData[i][1];
    
    // Find matching BNG2 time
    const bng2Row = bng2Gdat.data.find(row => Math.abs(row[0] - webTime) < 0.1);
    if (bng2Row) {
      const bng2RabGtp = bng2Row[1];  // RAB_GTP is first observable after time
      const diff = Math.abs(bng2RabGtp - webRabGtp) / Math.max(bng2RabGtp, 1) * 100;
      console.log(`${webTime.toFixed(1)}\t${bng2RabGtp.toFixed(4)}\t\t${webRabGtp.toFixed(4)}\t\t${diff.toFixed(2)}%`);
    }
  }
  
  // Final values
  const lastWeb = webData[webData.length - 1];
  const lastBng2 = bng2Gdat.data[bng2Gdat.data.length - 1];
  
  console.log('\n=== FINAL VALUES (t=80) ===');
  console.log('Observable\tBNG2\t\tWeb\t\tDiff%');
  const obsNames = ['RAB_GTP', 'Active_GEF', 'Active_GAP', 'Effector_On'];
  for (let i = 0; i < 4; i++) {
    const bng2Val = lastBng2[i + 1];
    const webVal = lastWeb[i + 1];
    const diff = Math.abs(bng2Val - webVal) / Math.max(bng2Val, 1) * 100;
    console.log(`${obsNames[i]}\t${bng2Val.toFixed(4)}\t\t${webVal.toFixed(4)}\t\t${diff.toFixed(2)}%`);
  }
}

main().catch(console.error);
