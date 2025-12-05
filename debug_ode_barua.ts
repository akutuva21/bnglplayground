/**
 * Debug: Test ODE simulation for Barua_2013
 */
import { readFileSync } from 'node:fs';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical';

const bnglPath = './bng_compare_output/Barua_2013.bngl';
const bnglContent = readFileSync(bnglPath, 'utf-8');

async function main() {
  console.log('=== Barua_2013 ODE Simulation Debug ===');
  console.log('Model: t_end=250000, n_steps=2500');
  
  const model = parseBNGL(bnglContent);
  
  // Setup
  const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
  const parametersMap = new Map(Object.entries(model.parameters));
  const observableNames = new Set(model.observables.map(o => o.name));
  
  const rules = model.reactionRules.flatMap(r => {
    const rate = BNGLParser.evaluateExpression(r.rate, parametersMap, observableNames);
    const reverseRate = r.reverseRate 
      ? BNGLParser.evaluateExpression(r.reverseRate, parametersMap, observableNames)
      : rate;
    
    const ruleStr = `${r.reactants.join('+')} -> ${r.products.join('+')}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    
    if (r.constraints?.length) {
      forwardRule.applyConstraints(r.constraints, (s: string) => BNGLParser.parseSpeciesGraph(s));
    }
    
    if (r.isBidirectional) {
      const reverseRuleStr = `${r.products.join('+')} -> ${r.reactants.join('+')}`;
      const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
      return [forwardRule, reverseRule];
    }
    return [forwardRule];
  });
  
  const generator = new NetworkGenerator({ maxSpecies: 5000, maxIterations: 5000, maxAgg: 500 });
  
  console.log('\n--- Network Generation ---');
  const netStart = Date.now();
  const result = await generator.generate(seedSpecies, rules);
  console.log(`Network: ${((Date.now() - netStart) / 1000).toFixed(2)}s`);
  console.log(`Species: ${result.species.length}, Reactions: ${result.reactions.length}`);
  
  // Build simulation structures
  const seedConcentrationMap = new Map<string, number>();
  model.species.forEach(s => {
    const g = BNGLParser.parseSpeciesGraph(s.name);
    seedConcentrationMap.set(GraphCanonicalizer.canonicalize(g), s.initialConcentration);
  });
  
  const expandedSpecies = result.species.map(s => {
    const canonicalName = GraphCanonicalizer.canonicalize(s.graph);
    return { name: canonicalName, conc: seedConcentrationMap.get(canonicalName) || 0 };
  });
  
  const speciesMap = new Map<string, number>();
  expandedSpecies.forEach((s, i) => speciesMap.set(s.name, i));
  const numSpecies = expandedSpecies.length;
  
  const concreteReactions = result.reactions.map(r => {
    const reactantIndices = r.reactants.map(idx => idx);
    const productIndices = r.products.map(idx => idx);
    return { reactants: reactantIndices, products: productIndices, rateConstant: r.rate };
  });
  
  // Initialize state
  const state = new Float64Array(numSpecies);
  expandedSpecies.forEach((s, i) => state[i] = s.conc);
  
  console.log(`\nInitial state: ${state.slice(0, 10).join(', ')}...`);
  console.log(`Total initial concentration: ${state.reduce((a, b) => a + b, 0)}`);
  
  // ODE solver functions
  const derivatives = (yIn: Float64Array, dydt: Float64Array) => {
    dydt.fill(0);
    for (const rxn of concreteReactions) {
      let velocity = rxn.rateConstant;
      for (const idx of rxn.reactants) velocity *= yIn[idx];
      for (const idx of rxn.reactants) dydt[idx] -= velocity;
      for (const idx of rxn.products) dydt[idx] += velocity;
    }
  };
  
  const rk4Step = (yCurr: Float64Array, h: number) => {
    const n = yCurr.length;
    const k1 = new Float64Array(n), k2 = new Float64Array(n);
    const k3 = new Float64Array(n), k4 = new Float64Array(n);
    const temp = new Float64Array(n), yNext = new Float64Array(n);
    
    derivatives(yCurr, k1);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k1[i];
    derivatives(temp, k2);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k2[i];
    derivatives(temp, k3);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + h * k3[i];
    derivatives(temp, k4);
    
    for(let i=0; i<n; i++) {
      yNext[i] = yCurr[i] + (h / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]);
    }
    return yNext;
  };
  
  console.log('\n--- ODE Simulation ---');
  const t_end = 250000;
  const n_steps = 2500;  // Same as BNGL file
  const dtOut = t_end / n_steps;
  
  console.log(`t_end: ${t_end}, n_steps: ${n_steps}, dtOut: ${dtOut}`);
  
  let y = new Float64Array(state);
  let t = 0;
  const dydt = new Float64Array(numSpecies);
  
  const odeStart = Date.now();
  let totalInternalSteps = 0;
  
  for (let i = 1; i <= n_steps; i++) {
    const tTarget = i * dtOut;
    let stepsThisInterval = 0;
    
    while (t < tTarget - 1e-12) {
      derivatives(y, dydt);
      
      let h = tTarget - t;
      const maxChange = 0.2;
      const minConc = 1e-9;
      const minStep = 1e-10;
      
      for (let k = 0; k < numSpecies; k++) {
        const deriv = dydt[k];
        const absderiv = Math.abs(deriv);
        if (absderiv > 1e-12) {
          const conc = y[k];
          if (conc < minConc && deriv > 0) continue;
          const limit = Math.max(conc, minConc) * maxChange;
          const maxStep = limit / absderiv;
          if (maxStep < h) h = maxStep;
        }
      }
      
      if (h < minStep) h = minStep;
      if (t + h > tTarget) h = tTarget - t;
      
      y = rk4Step(y, h);
      t += h;
      stepsThisInterval++;
      totalInternalSteps++;
    }
    
    if (i % 100 === 0 || i === 1 || i === n_steps) {
      const elapsed = (Date.now() - odeStart) / 1000;
      console.log(`Step ${i}/${n_steps}: t=${t.toFixed(2)}, internal_steps=${stepsThisInterval}, elapsed=${elapsed.toFixed(2)}s, total_internal=${totalInternalSteps}`);
    }
  }
  
  const odeTime = (Date.now() - odeStart) / 1000;
  console.log(`\nODE simulation: ${odeTime.toFixed(2)}s`);
  console.log(`Total internal RK4 steps: ${totalInternalSteps}`);
  console.log(`Avg internal steps per output step: ${(totalInternalSteps / n_steps).toFixed(1)}`);
  console.log(`Final state sum: ${y.reduce((a, b) => a + b, 0).toFixed(4)}`);
}

main().catch(console.error);
