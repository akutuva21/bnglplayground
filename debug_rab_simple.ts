/**
 * Simple simulation diagnostic
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

const thisDir = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('=== RAB-GTPASE-CYCLE DIAGNOSTIC ===\n');
  
  const modelPath = resolve(thisDir, 'example-models/rab-gtpase-cycle.bngl');
  const bnglContent = readFileSync(modelPath, 'utf-8');
  
  // Parse model
  const model = parseBNGL(bnglContent);
  console.log('=== PARSED MODEL ===');
  console.log('Species count:', model.species.length);
  model.species.forEach((s, i) => console.log(`  ${i}: ${s.name} = ${s.initialConcentration}`));
  
  console.log('\nParameters:', Object.entries(model.parameters).map(([k,v]) => `${k}=${v}`).join(', '));
  
  console.log('\nObservables:');
  model.observables.forEach(o => {
    console.log(`  ${o.name}: ${o.type} ${o.patterns?.join(',') || o.pattern}`);
  });
  
  console.log('\nReaction rules:');
  model.reactionRules.forEach((r, i) => {
    console.log(`  ${i}: ${r.reactants.join(' + ')} -> ${r.products.join(' + ')} @ ${r.rate}`);
  });
  
  // Generate network using the test's approach
  const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
  const seedConcentrationMap = new Map<string, number>();
  model.species.forEach(s => {
    const g = BNGLParser.parseSpeciesGraph(s.name);
    const canonicalName = GraphCanonicalizer.canonicalize(g);
    seedConcentrationMap.set(canonicalName, s.initialConcentration);
  });
  
  const parametersMap = new Map(Object.entries(model.parameters));
  const observableNames = new Set(model.observables.map(o => o.name));
  
  // Helper to format species list
  function formatSpeciesList(species: string[]): string {
    return species.length === 0 ? '0' : species.join(' + ');
  }
  
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
    console.log(`  ${i}: rate=${rule.rate}`);
    console.log(`      reactants: ${rule.reactants.map(r => r.toString()).join(' + ')}`);
    console.log(`      products: ${rule.products.map(p => p.toString()).join(' + ')}`);
  });
  
  const generator = new NetworkGenerator({ 
    maxSpecies: 1000,
    maxIterations: 100,
    maxAgg: 100,
    maxStoich: 100
  });
  
  console.log('\n=== GENERATING NETWORK ===');
  const network = generator.generate(seedSpecies, rules);
  
  console.log(`\nGenerated ${network.species.length} species:`);
  network.species.forEach((sp, i) => {
    const conc = seedConcentrationMap.get(sp.name) || 0;
    console.log(`  ${i}: ${sp.name} = ${conc}`);
  });
  
  console.log(`\nGenerated ${network.reactions.length} reactions:`);
  network.reactions.forEach((rxn, i) => {
    const reactants = rxn.reactants.map(r => `[${r}]${network.species[r].name}`).join(' + ');
    const products = rxn.products.map(p => `[${p}]${network.species[p].name}`).join(' + ');
    console.log(`  ${i}: ${reactants} -> ${products} @ ${rxn.rate}`);
  });
  
  // Simulate
  console.log('\n=== ODE SIMULATION ===');
  
  const numSpecies = network.species.length;
  const state = new Float64Array(numSpecies);
  for (let i = 0; i < numSpecies; i++) {
    state[i] = seedConcentrationMap.get(network.species[i].name) || 0;
  }
  console.log('Initial state:', Array.from(state));
  
  // Map species name to index
  const nameToIdx = new Map<string, number>();
  network.species.forEach((sp, i) => nameToIdx.set(sp.name, i));
  
  // Define observable evaluation
  function evalObs(y: Float64Array): Record<string, number> {
    const result: Record<string, number> = {};
    for (const obs of model.observables) {
      let sum = 0;
      const patterns = obs.patterns || [obs.pattern];
      for (const pattern of patterns) {
        // Find matching species
        for (const [name, idx] of nameToIdx) {
          if (name.includes(pattern.replace('~', '~'))) {
            // Simple pattern matching - check if state matches
            const matches = speciesMatchesPattern(name, pattern);
            if (matches) {
              sum += y[idx];
            }
          }
        }
      }
      result[obs.name] = sum;
    }
    return result;
  }
  
  function speciesMatchesPattern(speciesName: string, pattern: string): boolean {
    // For this simple model, exact match or state match
    // Pattern: RAB(nucleotide~GTP) should match species RAB(nucleotide~GTP)
    // Parse both and compare
    if (speciesName === pattern) return true;
    
    // Parse pattern
    const patternMatch = pattern.match(/^(\w+)\(([^)]+)\)$/);
    const speciesMatch = speciesName.match(/^(\w+)\(([^)]+)\)$/);
    
    if (!patternMatch || !speciesMatch) return false;
    if (patternMatch[1] !== speciesMatch[1]) return false;  // Molecule name must match
    
    // Parse components
    const patternComps = patternMatch[2].split(',').map(c => c.trim());
    const speciesComps = speciesMatch[2].split(',').map(c => c.trim());
    
    // Check each pattern component
    for (const pc of patternComps) {
      const [pName, pState] = pc.includes('~') ? pc.split('~') : [pc, null];
      
      // Find matching component in species
      const found = speciesComps.some(sc => {
        const [sName, sState] = sc.includes('~') ? sc.split('~') : [sc, null];
        if (pName !== sName) return false;
        if (pState && sState && pState !== sState) return false;
        return true;
      });
      
      if (!found) return false;
    }
    
    return true;
  }
  
  // Derivatives
  const derivatives = (yIn: Float64Array, dydt: Float64Array) => {
    dydt.fill(0);
    for (const rxn of network.reactions) {
      let velocity = rxn.rate;
      for (const r of rxn.reactants) velocity *= yIn[r];
      for (const r of rxn.reactants) dydt[r] -= velocity;
      for (const p of rxn.products) dydt[p] += velocity;
    }
  };
  
  // RK4
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
  
  // Run simulation
  const t_end = 80;
  const n_steps = 160;
  const dtOut = t_end / n_steps;
  
  let y = new Float64Array(state);
  let t = 0;
  
  // Fixed step simulation
  const dt = 0.001;  // Very small step for accuracy
  
  console.log('\nSimulating with fixed step dt=0.001...');
  console.log('Time\tRAB_GTP\tActive_GEF\tActive_GAP\tEffector_On');
  
  for (let i = 0; i <= n_steps; i += 20) {
    const tTarget = i * dtOut;
    
    while (t < tTarget - 1e-12) {
      let h = Math.min(dt, tTarget - t);
      y = rk4Step(y, h);
      t += h;
    }
    
    const obs = evalObs(y);
    console.log(`${tTarget.toFixed(1)}\t${obs.RAB_GTP?.toFixed(4) || 0}\t${obs.Active_GEF?.toFixed(4) || 0}\t${obs.Active_GAP?.toFixed(4) || 0}\t${obs.Effector_On?.toFixed(4) || 0}`);
  }
  
  // Show final state
  console.log('\nFinal species concentrations:');
  network.species.forEach((sp, i) => {
    console.log(`  ${sp.name}: ${y[i].toFixed(6)}`);
  });
}

main().catch(console.error);
