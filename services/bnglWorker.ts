/// <reference lib="webworker" />

import type {
  BNGLModel,
  BNGLSpecies,
  SimulationOptions,
  SimulationResults,
  WorkerRequest,
  WorkerResponse,
  SerializedWorkerError,
  NetworkGeneratorOptions,
  GeneratorProgress,
} from '../types';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator';
import { BNGLParser } from '../src/services/graph/core/BNGLParser';
import { Species } from '../src/services/graph/core/Species';
import { Rxn } from '../src/services/graph/core/Rxn';
import { GraphCanonicalizer } from '../src/services/graph/core/Canonical';
import { parseBNGL as parseBNGLModel } from './parseBNGL';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

type JobState = {
  cancelled: boolean;
  controller?: AbortController;
};

const jobStates = new Map<number, JobState>();

// Ring buffer for logs to prevent memory blowup
class LogRingBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  private writeIndex = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  add(message: string) {
    this.buffer[this.writeIndex] = `[${new Date().toISOString()}] ${message}`;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
  }

  getAll(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.maxSize; i++) {
      const index = (this.writeIndex - 1 - i + this.maxSize) % this.maxSize;
      if (this.buffer[index]) {
        result.push(this.buffer[index]);
      } else {
        break;
      }
    }
    return result.reverse();
  }

  clear() {
    this.buffer = [];
    this.writeIndex = 0;
  }
}

const logBuffer = new LogRingBuffer(1000);

// Override console.log to use ring buffer
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  logBuffer.add(message);
  originalConsoleLog(...args); // Still log to actual console for debugging
};
const cachedModels = new Map<number, BNGLModel>();
let nextModelId = 1;
// LRU cache size limit for cached models inside the worker
const MAX_CACHED_MODELS = 8;

const touchCachedModel = (modelId: number) => {
  const m = cachedModels.get(modelId);
  if (!m) return;
  // move to the end to mark as recently used
  cachedModels.delete(modelId);
  cachedModels.set(modelId, m);
};

const registerJob = (id: number) => {
  if (typeof id !== 'number' || Number.isNaN(id)) return;
  jobStates.set(id, { cancelled: false, controller: new AbortController() });
};

const markJobComplete = (id: number) => {
  jobStates.delete(id);
};

const cancelJob = (id: number) => {
  const entry = jobStates.get(id);
  if (entry) {
    entry.cancelled = true;
    if (entry.controller) {
      entry.controller.abort();
    }
  }
};

const ensureNotCancelled = (id: number) => {
  const entry = jobStates.get(id);
  if (entry && entry.cancelled) {
    throw new DOMException('Operation cancelled by main thread', 'AbortError');
  }
};

const serializeError = (error: unknown): SerializedWorkerError => {
  if (error instanceof DOMException) {
    return { name: error.name, message: error.message, stack: error.stack ?? undefined };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack ?? undefined };
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : 'Unknown error';
    const name = 'name' in error && typeof (error as { name?: unknown }).name === 'string' ? (error as { name: string }).name : undefined;
    const stack = 'stack' in error && typeof (error as { stack?: unknown }).stack === 'string' ? (error as { stack: string }).stack : undefined;
    return { name, message, stack };
  }
  return { message: typeof error === 'string' ? error : 'Unknown error' };
};

ctx.addEventListener('error', (event) => {
  const payload: SerializedWorkerError = {
    ...serializeError(event.error ?? event.message ?? 'Unknown worker error'),
    details: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  };
  ctx.postMessage({ id: -1, type: 'worker_internal_error', payload });
  event.preventDefault();
});

ctx.addEventListener('unhandledrejection', (event) => {
  const payload: SerializedWorkerError = serializeError(event.reason ?? 'Unhandled rejection in worker');
  ctx.postMessage({ id: -1, type: 'worker_internal_error', payload });
  event.preventDefault();
});

// --- Helper: Compartment Utilities ---
const getCompartment = (s: string) => {
    const prefix = s.match(/^@([A-Za-z0-9_]+):/);
    if (prefix) return prefix[1];
    const suffix = s.match(/@([A-Za-z0-9_]+)$/);
    if (suffix) return suffix[1];
    return null;
};

const removeCompartment = (s: string) => {
    return s.replace(/^@[A-Za-z0-9_]+:/, '').replace(/@[A-Za-z0-9_]+$/, '');
};

// --- Helper: Match Single Molecule Pattern ---
function matchMolecule(patMol: string, specMol: string): boolean {
    // patMol and specMol are "Name(components)" strings, no compartments.
    
    const patMatch = patMol.match(/^([A-Za-z0-9_]+)(?:\(([^)]*)\))?$/);
    const specMatch = specMol.match(/^([A-Za-z0-9_]+)(?:\(([^)]*)\))?$/);

    if (!patMatch || !specMatch) return false;

    const patName = patMatch[1];
    const specName = specMatch[1];

    if (patName !== specName) return false;

    // If pattern has no component list (e.g. "A"), it matches any A.
    if (patMatch[2] === undefined) return true;

    const patCompsStr = patMatch[2];
    const specCompsStr = specMatch[2] || "";

    const patComps = patCompsStr.split(',').map(s => s.trim()).filter(Boolean);
    const specComps = specCompsStr.split(',').map(s => s.trim()).filter(Boolean);

    // Every component in pattern must be satisfied by species
    return patComps.every(pCompStr => {
        const pM = pCompStr.match(/^([A-Za-z0-9_]+)(?:~([A-Za-z0-9_]+))?(?:!([0-9]+|\+|\?))?$/);
        if (!pM) return false;
        const [_, pName, pState, pBond] = pM;

        const sCompStr = specComps.find(s => {
            const sName = s.split(/[~!]/)[0];
            return sName === pName;
        });

        if (!sCompStr) return false;

        const sM = sCompStr.match(/^([A-Za-z0-9_]+)(?:~([A-Za-z0-9_]+))?(?:!([0-9]+))?$/);
        if (!sM) return false;
        const [__, sName, sState, sBond] = sM;

        if (pState && pState !== sState) return false;

        if (pBond) {
            if (pBond === '?') {
                // !? matches anything
            } else if (pBond === '+') {
                if (!sBond) return false;
            } else {
                // Specific bond ID (e.g. !1) - treat as "must be bound" for simple matching
                if (!sBond) return false;
            }
        } else {
            // No bond specified in pattern means "must be unbound"
            if (sBond) return false;
        }

        return true;
    });
}

// --- Helper: Check if Species Matches Pattern (Boolean) ---
function isSpeciesMatch(speciesStr: string, pattern: string): boolean {
    const patComp = getCompartment(pattern);
    const specComp = getCompartment(speciesStr);

    if (patComp && patComp !== specComp) return false;

    const cleanPat = removeCompartment(pattern);
    const cleanSpec = removeCompartment(speciesStr);

    if (cleanPat.includes('.')) {
         const patternMolecules = cleanPat.split('.').map(s => s.trim());
         const speciesMolecules = cleanSpec.split('.').map(s => s.trim());
         
         // Sort both to handle order independence for complexes
         patternMolecules.sort();
         speciesMolecules.sort();

         if (patternMolecules.length !== speciesMolecules.length) return false;
         
         return patternMolecules.every((patMol, idx) => {
             return matchMolecule(patMol, speciesMolecules[idx]);
         });
    } else {
        // Single molecule pattern matching against potentially complex species
        // If pattern is "A", it matches "A.B"
        // If pattern is "A.B", it matches "A.B"
        
        // If pattern is single molecule, check if ANY molecule in species matches
        const specMols = cleanSpec.split('.');
        return specMols.some(sMol => matchMolecule(cleanPat, sMol));
    }
}

// --- Helper: Count Matches for Molecules Observable ---
function countPatternMatches(speciesStr: string, patternStr: string): number {
    const patComp = getCompartment(patternStr);
    const specComp = getCompartment(speciesStr);

    if (patComp && patComp !== specComp) return 0;

    const cleanPat = removeCompartment(patternStr);
    const cleanSpec = removeCompartment(speciesStr);

    if (cleanPat.includes('.')) {
        // Complex pattern: fallback to boolean match (1 or 0)
        // Exact counting of subgraph isomorphisms is expensive here
        return isSpeciesMatch(speciesStr, patternStr) ? 1 : 0;
    } else {
        // Single molecule pattern: count occurrences in species string
        const specMols = cleanSpec.split('.');
        let count = 0;
        for (const sMol of specMols) {
            if (matchMolecule(cleanPat, sMol)) {
                count++;
            }
        }
        return count;
    }
}

function parseBNGL(jobId: number, bnglCode: string): BNGLModel {
  return parseBNGLModel(bnglCode, {
    checkCancelled: () => ensureNotCancelled(jobId),
  });
}

function generateNetwork(jobId: number, inputModel: BNGLModel): BNGLModel {
  return inputModel; 
}

async function generateExpandedNetwork(jobId: number, inputModel: BNGLModel): Promise<BNGLModel> {
  console.log('[Worker] Starting network generation for model with', inputModel.species.length, 'species and', inputModel.reactionRules.length, 'rules');

  // Convert BNGLModel to graph structures
  const seedSpecies = inputModel.species.map(s => {
    const graph = BNGLParser.parseSpeciesGraph(s.name);
    return graph;
  });

  // FIX: Create a map of CANONICAL seed species names to concentrations
  const seedConcentrationMap = new Map<string, number>();
  inputModel.species.forEach(s => {
      const g = BNGLParser.parseSpeciesGraph(s.name);
      const canonicalName = GraphCanonicalizer.canonicalize(g);
      seedConcentrationMap.set(canonicalName, s.initialConcentration);
  });

  const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

  const rules = inputModel.reactionRules.flatMap(r => {
    const parametersMap = new Map(Object.entries(inputModel.parameters));
    const rate = BNGLParser.evaluateExpression(r.rate, parametersMap);
    const reverseRate = r.reverseRate ? BNGLParser.evaluateExpression(r.reverseRate, parametersMap) : rate;
    
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');

    if (r.constraints && r.constraints.length > 0) {
      forwardRule.applyConstraints(r.constraints, (s) => BNGLParser.parseSpeciesGraph(s));
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

  // INCREASED LIMITS for complex models
  const generator = new NetworkGenerator({ maxSpecies: 20000, maxIterations: 5000 });
  const result = await generator.generate(seedSpecies, rules);

  console.log('[Worker] Network generation complete. Generated', result.species.length, 'species and', result.reactions.length, 'reactions');

  const generatedModel: BNGLModel = {
    ...inputModel,
    species: result.species.map((s: Species) => {
      // Use canonical string for the generated species name
      const canonicalName = GraphCanonicalizer.canonicalize(s.graph);
      // Look up concentration using canonical name
      const concentration = seedConcentrationMap.get(canonicalName) || (s.concentration || 0);
      return { name: canonicalName, initialConcentration: concentration };
    }),
    reactions: result.reactions.map((r: Rxn) => {
      const reaction = {
        reactants: r.reactants.map((idx: number) => GraphCanonicalizer.canonicalize(result.species[idx].graph)),
        products: r.products.map((idx: number) => GraphCanonicalizer.canonicalize(result.species[idx].graph)),
        rate: r.rate.toString(),
        rateConstant: r.rate
      };
      return reaction;
    }),
  };

  return generatedModel;
}

async function simulate(jobId: number, inputModel: BNGLModel, options: SimulationOptions): Promise<SimulationResults> {
  ensureNotCancelled(jobId);
  console.log('[Worker] Starting simulation with', inputModel.species.length, 'species and', inputModel.reactions.length, 'reactions');

  const expandedModel = await generateExpandedNetwork(jobId, inputModel);
  console.log('[Worker] After network expansion:', expandedModel.species.length, 'species and', expandedModel.reactions.length, 'reactions');

  const model: BNGLModel = JSON.parse(JSON.stringify(expandedModel));
  const { t_end, n_steps, method } = options;
  const headers = ['time', ...model.observables.map((observable) => observable.name)];

  // --- OPTIMIZATION: Pre-process Network for Fast Simulation ---
  
  // 1. Map Species Names to Indices
  const speciesMap = new Map<string, number>();
  model.species.forEach((s, i) => speciesMap.set(s.name, i));
  const numSpecies = model.species.length;

  // DEBUG: Log initial species
  console.log('[Worker] Total species:', numSpecies);
  model.species.slice(0, 5).forEach((s, i) => console.log(`[Worker] Species ${i}: ${s.name} (conc=${s.initialConcentration})`));

  // 2. Pre-process Reactions into Concrete Indices
  const concreteReactions = model.reactions.map(r => {
      const reactantIndices = r.reactants.map(name => speciesMap.get(name));
      const productIndices = r.products.map(name => speciesMap.get(name));
      
      if (reactantIndices.some(i => i === undefined) || productIndices.some(i => i === undefined)) {
          return null;
      }

      return {
          reactants: new Int32Array(reactantIndices as number[]),
          products: new Int32Array(productIndices as number[]),
          rateConstant: r.rateConstant
      };
  }).filter(r => r !== null) as { reactants: Int32Array, products: Int32Array, rateConstant: number }[];

  // DEBUG: Log reactions
  console.log('[Worker] Total reactions:', concreteReactions.length);
  concreteReactions.slice(0, 5).forEach((r, i) => console.log(`[Worker] Rxn ${i}: k=${r.rateConstant} reactants=[${r.reactants}] products=[${r.products}]`));

  // 3. Pre-process Observables (Cache matching species indices and coefficients)
  const concreteObservables = model.observables.map(obs => {
      // Split pattern by whitespace to handle multiple patterns (e.g. "A B")
      const patterns = obs.pattern.split(/\s+/).filter(p => p.length > 0);
      const matchingIndices: number[] = [];
      const coefficients: number[] = [];
      
      model.species.forEach((s, i) => {
          let count = 0;
          for (const pat of patterns) {
              if (obs.type === 'species') {
                  if (isSpeciesMatch(s.name, pat)) {
                      count = 1;
                      break; // Species matches once
                  }
              } else {
                  // Molecules observable: count occurrences
                  count += countPatternMatches(s.name, pat);
              }
          }
          
          if (count > 0) {
              matchingIndices.push(i);
              coefficients.push(count);
          }
      });
      return {
          name: obs.name,
          indices: new Int32Array(matchingIndices),
          coefficients: new Float64Array(coefficients)
      };
  });

  // DEBUG: Log observables
  concreteObservables.forEach(obs => {
      console.log(`[Worker] Observable ${obs.name} matches ${obs.indices.length} species`);
      if (obs.indices.length === 0) console.warn(`[Worker] WARNING: Observable ${obs.name} matches NO species`);
  });

  // 4. Initialize State Vector (Float64Array for speed)
  const state = new Float64Array(numSpecies);
  model.species.forEach((s, i) => state[i] = s.initialConcentration);

  // DEBUG: Check initial state
  let totalConc = 0;
  for(let i=0; i<numSpecies; i++) totalConc += state[i];
  console.log('[Worker] Total initial concentration:', totalConc);

  const data: Record<string, number>[] = [];

  // --- Fast Observable Evaluator ---
  const evaluateObservablesFast = (currentState: Float64Array) => {
      const obsValues: Record<string, number> = {};
      for (let i = 0; i < concreteObservables.length; i++) {
          const obs = concreteObservables[i];
          let sum = 0;
          for (let j = 0; j < obs.indices.length; j++) {
              sum += currentState[obs.indices[j]] * obs.coefficients[j];
          }
          obsValues[obs.name] = sum;
      }
      return obsValues;
  };

  // Define checkCancelled helper
  const checkCancelled = () => ensureNotCancelled(jobId);

  if (method === 'ssa') {
    // SSA Implementation using Typed Arrays
    // Round initial state for SSA
    for(let i=0; i<numSpecies; i++) state[i] = Math.round(state[i]);
    
    const dtOut = t_end / n_steps;
    let t = 0;
    let nextTOut = 0;

    data.push({ time: t, ...evaluateObservablesFast(state) });

    while (t < t_end) {
      checkCancelled();
      
      // Calculate propensities
      let aTotal = 0;
      const propensities = new Float64Array(concreteReactions.length);
      
      for (let i = 0; i < concreteReactions.length; i++) {
          const rxn = concreteReactions[i];
          let a = rxn.rateConstant;
          for (let j = 0; j < rxn.reactants.length; j++) {
              a *= state[rxn.reactants[j]];
          }
          propensities[i] = a;
          aTotal += a;
      }

      if (aTotal === 0) break;

      const r1 = Math.random();
      const tau = (1 / aTotal) * Math.log(1 / r1);
      t += tau;

      const r2 = Math.random() * aTotal;
      let sumA = 0;
      let reactionIndex = propensities.length - 1;
      
      for (let i = 0; i < propensities.length; i++) {
          sumA += propensities[i];
          if (r2 <= sumA) {
              reactionIndex = i;
              break;
          }
      }

      const firedRxn = concreteReactions[reactionIndex];
      for (let j = 0; j < firedRxn.reactants.length; j++) state[firedRxn.reactants[j]]--;
      for (let j = 0; j < firedRxn.products.length; j++) state[firedRxn.products[j]]++;

      while (t >= nextTOut && nextTOut <= t_end) {
        checkCancelled();
        data.push({ time: Math.round(nextTOut * 1e10) / 1e10, ...evaluateObservablesFast(state) });
        nextTOut += dtOut;
      }
    }
    
    // Fill remaining steps
    while (nextTOut <= t_end) {
        data.push({ time: Math.round(nextTOut * 1e10) / 1e10, ...evaluateObservablesFast(state) });
        nextTOut += dtOut;
    }

    return { headers, data } satisfies SimulationResults;
  }

  if (method === 'ode') {
    // OPTIMIZATION: JIT Compile Derivative Function
    // This avoids array iteration overhead in the hot loop
    const buildDerivativesFunction = () => {
        const lines: string[] = [];
        lines.push('var v;');
        
        for (let i = 0; i < concreteReactions.length; i++) {
            const rxn = concreteReactions[i];
            let term = `${rxn.rateConstant}`;
            for (let j = 0; j < rxn.reactants.length; j++) {
                term += ` * y[${rxn.reactants[j]}]`;
            }
            lines.push(`v = ${term};`);
            
            for (let j = 0; j < rxn.reactants.length; j++) {
                lines.push(`dydt[${rxn.reactants[j]}] -= v;`);
            }
            for (let j = 0; j < rxn.products.length; j++) {
                lines.push(`dydt[${rxn.products[j]}] += v;`);
            }
        }
        
        return new Function('y', 'dydt', lines.join('\n'));
    };

    // Fallback to loop if too many reactions (to avoid stack overflow or huge function size)
    let derivatives: (y: Float64Array, dydt: Float64Array) => void;
    if (concreteReactions.length < 2000) {
        try {
            // @ts-ignore
            derivatives = buildDerivativesFunction();
        } catch (e) {
            console.warn('[Worker] JIT compilation failed, falling back to loop', e);
            derivatives = (yIn: Float64Array, dydt: Float64Array) => {
                dydt.fill(0);
                for (let i = 0; i < concreteReactions.length; i++) {
                    const rxn = concreteReactions[i];
                    let velocity = rxn.rateConstant;
                    for (let j = 0; j < rxn.reactants.length; j++) {
                        velocity *= yIn[rxn.reactants[j]];
                    }
                    for (let j = 0; j < rxn.reactants.length; j++) dydt[rxn.reactants[j]] -= velocity;
                    for (let j = 0; j < rxn.products.length; j++) dydt[rxn.products[j]] += velocity;
                }
            };
        }
    } else {
        derivatives = (yIn: Float64Array, dydt: Float64Array) => {
            dydt.fill(0);
            for (let i = 0; i < concreteReactions.length; i++) {
                const rxn = concreteReactions[i];
                let velocity = rxn.rateConstant;
                for (let j = 0; j < rxn.reactants.length; j++) {
                    velocity *= yIn[rxn.reactants[j]];
                }
                for (let j = 0; j < rxn.reactants.length; j++) dydt[rxn.reactants[j]] -= velocity;
                for (let j = 0; j < rxn.products.length; j++) dydt[rxn.products[j]] += velocity;
            }
        };
    }

    const rk4Step = (yCurr: Float64Array, h: number, yNext: Float64Array) => {
        const n = yCurr.length;
        // Allocate temp arrays once outside if possible, but here inside is safer for now
        // Optimization: reuse buffers passed in context if we refactor
        const k1 = new Float64Array(n);
        const k2 = new Float64Array(n);
        const k3 = new Float64Array(n);
        const k4 = new Float64Array(n);
        const temp = new Float64Array(n);

        // k1
        dydt.fill(0); // Reset global dydt buffer if used, but here we use local k1
        derivatives(yCurr, k1);
        
        // k2
        for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k1[i];
        derivatives(temp, k2);

        // k3
        for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k2[i];
        derivatives(temp, k3);

        // k4
        for(let i=0; i<n; i++) temp[i] = yCurr[i] + h * k3[i];
        derivatives(temp, k4);

        for(let i=0; i<n; i++) {
            yNext[i] = yCurr[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
            if (yNext[i] < 0) yNext[i] = 0; // Clamp to 0
        }
    };

    const dtOut = t_end / n_steps;
    let t = 0;
    
    data.push({ time: t, ...evaluateObservablesFast(state) });

    const tolerance = options.steadyStateTolerance ?? 1e-6;
    const window = options.steadyStateWindow ?? 5;
    const enforceSteadyState = !!options.steadyState;
    let consecutiveStable = 0;
    let shouldStop = false;

    // Reusable arrays for RK4
    let y = new Float64Array(state);
    let nextY = new Float64Array(numSpecies);
    // Dummy dydt for JIT function if it expects a second arg (it does)
    let dydt = new Float64Array(numSpecies); 

    // DEBUG: Check derivatives at t=0
    derivatives(y, dydt);
    let maxDeriv = 0;
    for(let i=0; i<numSpecies; i++) maxDeriv = Math.max(maxDeriv, Math.abs(dydt[i]));
    console.log('[Worker] Max derivative at t=0:', maxDeriv);

    // OPTIMIZATION: Relative Change Limiter for Step Size
    // Instead of complex adaptive schemes, we limit step size so no species changes by >20%
    
    for (let i = 1; i <= n_steps && !shouldStop; i += 1) {
      checkCancelled();
      const tTarget = i * dtOut;
      
      while (t < tTarget - 1e-12) {
          // Calculate derivatives at current state to estimate step size
          derivatives(y, dydt); // dydt is reused buffer

          // Relative Change Limiter
          let h = tTarget - t; // Default to finishing the step
          const maxChange = 0.2; // 20%
          const minConc = 1e-9; // Threshold below which we allow faster relative changes
          const minStep = 1e-12;

          for (let k = 0; k < numSpecies; k++) {
              const deriv = Math.abs(dydt[k]);
              if (deriv > 1e-12) { // Ignore negligible rates
                  const conc = y[k];
                  // If concentration is significant, limit relative change
                  // If concentration is tiny, limit absolute change (e.g. don't jump from 0 to 100 in one step)
                  const limit = Math.max(conc, minConc) * maxChange;
                  const maxStep = limit / deriv;
                  if (maxStep < h) h = maxStep;
              }
          }

          // Clamp step size
          if (h < minStep) h = minStep;
          
          // Don't overshoot
          if (t + h > tTarget) h = tTarget - t;

          // Perform step
          rk4Step(y, h, nextY);
          
          // Update
          y.set(nextY);
          t += h;
          
          // Check steady state
          if (enforceSteadyState) {
              let maxDelta = 0;
              for(let k=0; k<numSpecies; k++) {
                  const d = Math.abs(nextY[k] - y[k]);
                  if (d > maxDelta) maxDelta = d;
              }
              if (maxDelta <= tolerance) {
                  consecutiveStable++;
                  if (consecutiveStable >= window) {
                      shouldStop = true;
                      break;
                  }
              } else {
                  consecutiveStable = 0;
              }
          }
      }

      data.push({ time: Math.round(t * 1e10) / 1e10, ...evaluateObservablesFast(y) });
      
      if (shouldStop) break;
    }

    return { headers, data } satisfies SimulationResults;
  }

  throw new Error(`Unsupported simulation method: ${method}`);
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message || typeof message !== 'object') {
    console.warn('[Worker] Received malformed message', message);
    return;
  }

  const { id, type, payload } = message;

  if (typeof id !== 'number' || typeof type !== 'string') {
    console.warn('[Worker] Missing id or type on message', message);
    return;
  }

  if (type === 'cancel') {
    const targetId = payload && typeof payload === 'object' ? (payload as { targetId?: unknown }).targetId : undefined;
    if (typeof targetId === 'number') {
      cancelJob(targetId);
    }
    return;
  }

  if (type === 'parse') {
    registerJob(id);
    try {
      const code = typeof payload === 'string' ? payload : '';
      const model = parseBNGL(id, code);
      const response: WorkerResponse = { id, type: 'parse_success', payload: model };
      ctx.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = { id, type: 'parse_error', payload: serializeError(error) };
      ctx.postMessage(response);
    } finally {
      markJobComplete(id);
    }
    return;
  }

  if (type === 'simulate') {
    registerJob(id);
    const jobEntry = jobStates.get(id);
    if (!jobEntry) return; // Should not happen
    (async () => {
      try {
        if (!payload || typeof payload !== 'object') {
          throw new Error('Simulation payload missing');
        }

        // Backwards-compatible: payload can be { model, options } or { modelId, parameterOverrides?, options }
        const p = payload as any;
        let model: BNGLModel | undefined = undefined;
        const options: SimulationOptions | undefined = p.options;

        if (p.model) {
          model = p.model as BNGLModel;
        } else if (typeof p.modelId === 'number') {
          const cached = cachedModels.get(p.modelId);
          if (!cached) throw new Error('Cached model not found in worker');
          // mark as recently used
          touchCachedModel(p.modelId);
          // If there are parameter overrides, create a shallow copy and update rate constants
          if (!p.parameterOverrides || Object.keys(p.parameterOverrides).length === 0) {
            model = cached;
          } else {
            const overrides: Record<string, number> = p.parameterOverrides;
            const nextModel: BNGLModel = {
              ...cached,
              parameters: { ...(cached.parameters || {}), ...overrides },
              reactions: [],
            } as BNGLModel;

            // Update reaction rate constants using new parameters
            (cached.reactions || []).forEach((r) => {
              const rateConst = nextModel.parameters[r.rate] ?? parseFloat(r.rate as unknown as string);
              nextModel.reactions.push({ ...r, rateConstant: rateConst });
            });
            model = nextModel;
          }
        }

        if (!model || !options) {
          throw new Error('Simulation payload incomplete');
        }

        const results = await simulate(id, model, options);
        const response: WorkerResponse = { id, type: 'simulate_success', payload: results };
        ctx.postMessage(response);
      } catch (error) {
        const response: WorkerResponse = { id, type: 'simulate_error', payload: serializeError(error) };
        ctx.postMessage(response);
      } finally {
        markJobComplete(id);
      }
    })();
    return;
  }

  if (type === 'cache_model') {
    registerJob(id);
    try {
      const p = payload as any;
      const model = p && p.model ? (p.model as BNGLModel) : undefined;
      if (!model) throw new Error('Cache model payload missing');
      const modelId = nextModelId++;
      // Store a shallow clone to avoid accidental mutation from main thread
      const stored: BNGLModel = {
        ...model,
        parameters: { ...(model.parameters || {}) },
        moleculeTypes: (model.moleculeTypes || []).map((m) => ({ ...m })),
        species: (model.species || []).map((s) => ({ ...s })),
        observables: (model.observables || []).map((o) => ({ ...o })),
        reactions: (model.reactions || []).map((r) => ({ ...r })),
        reactionRules: (model.reactionRules || []).map((r) => ({ ...r })),
      };
      cachedModels.set(modelId, stored);
      // Enforce LRU eviction if we exceed the cache size
      try {
        if (cachedModels.size > MAX_CACHED_MODELS) {
          const it = cachedModels.keys();
          const oldest = it.next().value as number | undefined;
          if (typeof oldest === 'number') {
            cachedModels.delete(oldest);
            // best-effort notification
            // eslint-disable-next-line no-console
            console.warn('[Worker] Evicted cached model (LRU) id=', oldest);
          }
        }
      } catch (e) {
        // ignore eviction errors
      }
      const response: WorkerResponse = { id, type: 'cache_model_success', payload: { modelId } };
      ctx.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = { id, type: 'cache_model_error', payload: serializeError(error) };
      ctx.postMessage(response);
    } finally {
      markJobComplete(id);
    }
    return;
  }

  if (type === 'release_model') {
    registerJob(id);
    try {
      const p = payload as any;
      const modelId = p && typeof p === 'object' ? (p as { modelId?: unknown }).modelId : undefined;
      if (typeof modelId !== 'number') throw new Error('release_model payload missing modelId');
      const existed = cachedModels.delete(modelId);
      const response: WorkerResponse = { id, type: 'release_model_success', payload: { modelId } };
      ctx.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = { id, type: 'release_model_error', payload: serializeError(error) };
      ctx.postMessage(response);
    } finally {
      markJobComplete(id);
    }
    return;
  }

  if (type === 'generate_network') {
    registerJob(id);
    const jobEntry = jobStates.get(id);
    if (!jobEntry) return; // Should not happen
    (async () => {
      try {
        if (!payload || typeof payload !== 'object') {
          throw new Error('Generate network payload missing');
        }

        const p = payload as { model: BNGLModel; options?: NetworkGeneratorOptions };
        const { model, options } = p;

        if (!model) {
          throw new Error('Model missing in generate_network payload');
        }

        // Convert BNGLModel to graph structures (instrumented)
        console.log('[generate_network handler] seed species raw:', model.species.map(s => s.name));
        const seedSpecies = model.species.map(s => {
          console.log('[generate_network handler] parsing seed:', s.name);
          const graph = BNGLParser.parseSpeciesGraph(s.name);
          console.log('[generate_network handler] parsed graph =>', BNGLParser.speciesGraphToString(graph));
          return graph;
        });
        ensureNotCancelled(id);

        const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

        const rules = model.reactionRules.map(r => {
          const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
          const ruleStr = `${formatSpeciesList(r.reactants)} ${r.isBidirectional ? '<->' : '->'} ${formatSpeciesList(r.products)}`;
          return BNGLParser.parseRxnRule(ruleStr, rate);
        });
        ensureNotCancelled(id);

        // Use the controller from jobStates
        const controller = jobEntry.controller!;

        // Set up progress callback to stream to main thread (throttled to 4Hz)
        let lastProgressTime = 0;
        const progressCallback = (progress: GeneratorProgress) => {
          const now = Date.now();
          if (now - lastProgressTime >= 250) { // 250ms = 4Hz
            lastProgressTime = now;
            ctx.postMessage({ id, type: 'generate_network_progress', payload: progress });
          }
        };

        // Instantiate NetworkGenerator with options
        const generatorOptions = {
          maxSpecies: options?.maxSpecies ?? 10000,
          maxReactions: options?.maxReactions ?? 100000,
          maxIterations: options?.maxIterations ?? 100,
          maxAgg: options?.maxAgg ?? 500,
          maxStoich: options?.maxStoich ?? 500,
          checkInterval: options?.checkInterval ?? 500,
          memoryLimit: options?.memoryLimit ?? 1e9,
        } satisfies NetworkGeneratorOptions;

        const generator = new NetworkGenerator(generatorOptions);

        // Generate network
        const result = await generator.generate(seedSpecies, rules, progressCallback, controller.signal);
        ensureNotCancelled(id);

        // Convert result back to BNGLModel
        const generatedModel: BNGLModel = {
          ...model,
          species: result.species.map(s => ({ name: BNGLParser.speciesGraphToString(s.graph), initialConcentration: s.concentration || 0 })),
          reactions: result.reactions.map(r => ({
            reactants: r.reactants.map(idx => BNGLParser.speciesGraphToString(result.species[idx].graph)),
            products: r.products.map(idx => BNGLParser.speciesGraphToString(result.species[idx].graph)),
            rate: r.rate.toString(),
            rateConstant: r.rate
          })),
        };
        ensureNotCancelled(id);

        const response: WorkerResponse = { id, type: 'generate_network_success', payload: generatedModel };
        ctx.postMessage(response);
      } catch (error) {
        const response: WorkerResponse = { id, type: 'generate_network_error', payload: serializeError(error) };
        ctx.postMessage(response);
      } finally {
        markJobComplete(id);
      }
    })();
    return;
  }

  console.warn('[Worker] Unknown message type received:', type);
});

export {};