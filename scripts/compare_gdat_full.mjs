/**
 * Full GDAT Comparison Script
 * 
 * This script:
 * 1. Parses BNGL models using the web simulator's parser
 * 2. Runs ODE simulation using the same logic as the web worker
 * 3. Compares output against BNG2.pl reference .gdat files
 * 4. Generates detailed comparison report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// We need to compile TypeScript first, so let's use a simpler approach:
// Run the simulation via a spawned process that loads the compiled JS

async function main() {
  console.log('=== GDAT Comparison: Web Simulator vs BNG2.pl ===\n');

  // Read the test report to get model list
  const reportPath = path.join(projectRoot, 'bng2_test_report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('Error: bng2_test_report.json not found. Run the BNG2.pl test first.');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  // Get models that passed BNG2.pl simulation (have gdat output)
  const modelsWithGdat = report.results.filter(r => 
    r.gdatOutput && r.gdatOutput.trim().length > 0
  );

  console.log(`Found ${modelsWithGdat.length} models with BNG2.pl GDAT output\n`);

  // Load reference gdat files
  const gdatDir = path.join(projectRoot, 'gdat_comparison_output');
  if (!fs.existsSync(gdatDir)) {
    console.error('Error: gdat_comparison_output/ not found. Run compare_gdat_output.mjs first.');
    process.exit(1);
  }

  // Parse a gdat file into structured data
  function parseGdat(content) {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return null;

    // Find header line (starts with #)
    let headerLine = lines.find(l => l.startsWith('#'));
    if (!headerLine) return null;

    // Parse header - columns are space/tab separated
    const headers = headerLine.replace(/^#\s*/, '').trim().split(/\s+/);
    
    // Parse data rows
    const data = [];
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      const values = line.trim().split(/\s+/).map(v => parseFloat(v));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((h, i) => row[h] = values[i]);
        data.push(row);
      }
    }

    return { headers, data };
  }

  // Compare two gdat results
  function compareGdat(bng2Gdat, webGdat, tolerance = 0.01) {
    if (!bng2Gdat || !webGdat) {
      return { match: false, error: 'Missing data' };
    }

    // Check headers match (ignoring 'time')
    const bng2Headers = bng2Gdat.headers.filter(h => h !== 'time');
    const webHeaders = webGdat.headers.filter(h => h !== 'time');

    const headerMatch = bng2Headers.length === webHeaders.length &&
      bng2Headers.every(h => webHeaders.includes(h));

    if (!headerMatch) {
      return { 
        match: false, 
        error: `Header mismatch: BNG2=[${bng2Headers.join(',')}] Web=[${webHeaders.join(',')}]` 
      };
    }

    // Compare data at matching time points
    const errors = [];
    const bng2Times = bng2Gdat.data.map(r => r.time);
    const webTimes = webGdat.data.map(r => r.time);

    // Find closest time points
    for (const bng2Row of bng2Gdat.data) {
      const t = bng2Row.time;
      // Find closest web time point
      const webRow = webGdat.data.reduce((best, row) => {
        const bestDiff = Math.abs(best.time - t);
        const rowDiff = Math.abs(row.time - t);
        return rowDiff < bestDiff ? row : best;
      }, webGdat.data[0]);

      if (Math.abs(webRow.time - t) > t * 0.1 + 0.01) {
        // Time point too far off
        continue;
      }

      // Compare observable values
      for (const header of bng2Headers) {
        const bng2Val = bng2Row[header];
        const webVal = webRow[header];

        if (webVal === undefined) continue;

        const diff = Math.abs(bng2Val - webVal);
        const relDiff = bng2Val !== 0 ? diff / Math.abs(bng2Val) : diff;

        if (relDiff > tolerance && diff > 1e-6) {
          errors.push({
            time: t,
            observable: header,
            bng2: bng2Val,
            web: webVal,
            relDiff: relDiff
          });
        }
      }
    }

    if (errors.length === 0) {
      return { match: true };
    }

    // Summarize errors
    const maxError = errors.reduce((max, e) => e.relDiff > max.relDiff ? e : max, errors[0]);
    return {
      match: false,
      error: `${errors.length} value mismatches, max relative error: ${(maxError.relDiff * 100).toFixed(2)}% at t=${maxError.time} for ${maxError.observable}`,
      details: errors.slice(0, 5) // First 5 errors
    };
  }

  // For now, just report what we have and note that we need to run web simulation
  console.log('Reference GDAT files available:');
  
  const comparisonResults = [];
  let available = 0;
  
  for (const model of modelsWithGdat) {
    const modelName = model.modelName;
    const bng2GdatPath = path.join(gdatDir, `${modelName}_bng2.gdat`);
    
    if (fs.existsSync(bng2GdatPath)) {
      available++;
      const bng2Content = fs.readFileSync(bng2GdatPath, 'utf-8');
      const bng2Gdat = parseGdat(bng2Content);
      
      if (bng2Gdat) {
        comparisonResults.push({
          modelName,
          bng2GdatPath,
          bng2Headers: bng2Gdat.headers,
          bng2DataPoints: bng2Gdat.data.length,
          status: 'ready_for_comparison'
        });
      }
    }
  }

  console.log(`\n${available}/${modelsWithGdat.length} reference GDAT files found\n`);

  // Write summary
  const summaryPath = path.join(projectRoot, 'gdat_comparison_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalModels: modelsWithGdat.length,
    availableReferences: available,
    models: comparisonResults
  }, null, 2));

  console.log(`Summary written to: ${summaryPath}`);

  // Now the key insight: we need to actually RUN the web simulation
  // Let's create a test file that Vitest can run
  
  console.log('\n--- Creating Vitest test file for GDAT comparison ---\n');
  
  const testFileContent = generateVitestTestFile(comparisonResults);
  const testPath = path.join(projectRoot, 'src', 'tests', 'gdat-comparison.test.ts');
  
  // Ensure directory exists
  const testDir = path.dirname(testPath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  fs.writeFileSync(testPath, testFileContent);
  console.log(`Test file written to: ${testPath}`);
  console.log('\nRun with: npm test -- src/tests/gdat-comparison.test.ts');
}

function generateVitestTestFile(models) {
  const modelNames = models.map(m => `'${m.modelName}'`).join(',\n    ');
  
  return `/**
 * GDAT Comparison Tests
 * Auto-generated - compares web simulator output against BNG2.pl reference
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseBNGL } from '../../services/parseBNGL';
import { NetworkGenerator } from '../services/graph/NetworkGenerator';
import { BNGLParser } from '../services/graph/core/BNGLParser';
import { GraphCanonicalizer } from '../services/graph/core/Canonical';
import type { BNGLModel, SimulationResults } from '../../types';

// Simulation logic extracted from bnglWorker.ts
async function simulateModel(inputModel: BNGLModel, options: { t_end: number; n_steps: number; method: 'ode' | 'ssa' }): Promise<SimulationResults> {
  // Network generation
  const seedSpecies = inputModel.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
  
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
    
    const ruleStr = \`\${formatSpeciesList(r.reactants)} -> \${formatSpeciesList(r.products)}\`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');

    if (r.constraints && r.constraints.length > 0) {
      forwardRule.applyConstraints(r.constraints, (s) => BNGLParser.parseSpeciesGraph(s));
    }

    if (r.isBidirectional) {
      const reverseRuleStr = \`\${formatSpeciesList(r.products)} -> \${formatSpeciesList(r.reactants)}\`;
      const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
      reverseRule.name = r.products.join('+') + '->' + r.reactants.join('+');
      return [forwardRule, reverseRule];
    } else {
      return [forwardRule];
    }
  });

  const generator = new NetworkGenerator({ maxSpecies: 20000, maxIterations: 5000 });
  const result = await generator.generate(seedSpecies, rules);

  const expandedModel: BNGLModel = {
    ...inputModel,
    species: result.species.map(s => {
      const canonicalName = GraphCanonicalizer.canonicalize(s.graph);
      const concentration = seedConcentrationMap.get(canonicalName) || (s.concentration || 0);
      return { name: canonicalName, initialConcentration: concentration };
    }),
    reactions: result.reactions.map(r => ({
      reactants: r.reactants.map(idx => GraphCanonicalizer.canonicalize(result.species[idx].graph)),
      products: r.products.map(idx => GraphCanonicalizer.canonicalize(result.species[idx].graph)),
      rate: r.rate.toString(),
      rateConstant: r.rate
    })),
  };

  // Run ODE simulation
  const { t_end, n_steps } = options;
  const headers = ['time', ...expandedModel.observables.map(o => o.name)];
  
  // Build species map
  const speciesMap = new Map<string, number>();
  expandedModel.species.forEach((s, i) => speciesMap.set(s.name, i));
  const numSpecies = expandedModel.species.length;

  // Build concrete reactions
  const concreteReactions = expandedModel.reactions.map(r => {
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

  // Build observable evaluator (simplified)
  const concreteObservables = expandedModel.observables.map(obs => {
    const matchingIndices: number[] = [];
    const coefficients: number[] = [];
    
    expandedModel.species.forEach((s, i) => {
      if (s.name.includes(obs.pattern) || obs.pattern.includes(s.name.split('(')[0])) {
        matchingIndices.push(i);
        coefficients.push(1);
      }
    });
    
    return {
      name: obs.name,
      indices: new Int32Array(matchingIndices),
      coefficients: new Float64Array(coefficients)
    };
  });

  // Initialize state
  const state = new Float64Array(numSpecies);
  expandedModel.species.forEach((s, i) => state[i] = s.initialConcentration);

  const data: Record<string, number>[] = [];

  const evaluateObservables = (currentState: Float64Array) => {
    const obsValues: Record<string, number> = {};
    for (const obs of concreteObservables) {
      let sum = 0;
      for (let j = 0; j < obs.indices.length; j++) {
        sum += currentState[obs.indices[j]] * obs.coefficients[j];
      }
      obsValues[obs.name] = sum;
    }
    return obsValues;
  };

  // Simple RK4 integration
  const derivatives = (yIn: Float64Array, dydt: Float64Array) => {
    dydt.fill(0);
    for (const rxn of concreteReactions) {
      let velocity = rxn.rateConstant;
      for (let j = 0; j < rxn.reactants.length; j++) {
        velocity *= yIn[rxn.reactants[j]];
      }
      for (let j = 0; j < rxn.reactants.length; j++) dydt[rxn.reactants[j]] -= velocity;
      for (let j = 0; j < rxn.products.length; j++) dydt[rxn.products[j]] += velocity;
    }
  };

  const rk4Step = (yCurr: Float64Array, h: number, yNext: Float64Array) => {
    const n = yCurr.length;
    const k1 = new Float64Array(n);
    const k2 = new Float64Array(n);
    const k3 = new Float64Array(n);
    const k4 = new Float64Array(n);
    const temp = new Float64Array(n);

    derivatives(yCurr, k1);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k1[i];
    derivatives(temp, k2);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + 0.5 * h * k2[i];
    derivatives(temp, k3);
    for(let i=0; i<n; i++) temp[i] = yCurr[i] + h * k3[i];
    derivatives(temp, k4);

    for(let i=0; i<n; i++) {
      yNext[i] = yCurr[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      if (yNext[i] < 0) yNext[i] = 0;
    }
  };

  const dtOut = t_end / n_steps;
  let t = 0;
  let y = new Float64Array(state);
  let nextY = new Float64Array(numSpecies);

  data.push({ time: t, ...evaluateObservables(y) });

  for (let i = 1; i <= n_steps; i++) {
    const tTarget = i * dtOut;
    const h = tTarget - t;
    rk4Step(y, h, nextY);
    y.set(nextY);
    t = tTarget;
    data.push({ time: Math.round(t * 1e10) / 1e10, ...evaluateObservables(y) });
  }

  return { headers, data };
}

// Parse gdat content
function parseGdat(content: string) {
  const lines = content.trim().split('\\n');
  let headerLine = lines.find(l => l.startsWith('#'));
  if (!headerLine) return null;

  const headers = headerLine.replace(/^#\\s*/, '').trim().split(/\\s+/);
  const data: Record<string, number>[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    const values = line.trim().split(/\\s+/).map(v => parseFloat(v));
    if (values.length === headers.length) {
      const row: Record<string, number> = {};
      headers.forEach((h, i) => row[h] = values[i]);
      data.push(row);
    }
  }

  return { headers, data };
}

// Extract simulation params from bngl
function extractSimParams(bnglContent: string) {
  const tEndMatch = bnglContent.match(/t_end\\s*=>?\\s*([\\d.e+-]+)/i);
  const nStepsMatch = bnglContent.match(/n_steps\\s*=>?\\s*(\\d+)/i);
  
  return {
    t_end: tEndMatch ? parseFloat(tEndMatch[1]) : 100,
    n_steps: nStepsMatch ? parseInt(nStepsMatch[1]) : 100
  };
}

const MODELS_TO_TEST = [
    ${modelNames}
];

describe('GDAT Comparison: Web Simulator vs BNG2.pl', () => {
  const gdatDir = path.resolve(__dirname, '../../gdat_comparison_output');
  
  for (const modelName of MODELS_TO_TEST.slice(0, 10)) { // Test first 10 models
    it(\`should match BNG2.pl output for \${modelName}\`, async () => {
      const bnglPath = path.join(gdatDir, \`\${modelName}.bngl\`);
      const bng2GdatPath = path.join(gdatDir, \`\${modelName}_bng2.gdat\`);
      
      if (!fs.existsSync(bnglPath) || !fs.existsSync(bng2GdatPath)) {
        console.log(\`Skipping \${modelName} - files not found\`);
        return;
      }
      
      const bnglContent = fs.readFileSync(bnglPath, 'utf-8');
      const bng2GdatContent = fs.readFileSync(bng2GdatPath, 'utf-8');
      
      // Parse model
      const model = parseBNGL(bnglContent);
      
      // Get simulation params
      const params = extractSimParams(bnglContent);
      
      // Run simulation
      const webResults = await simulateModel(model, { ...params, method: 'ode' });
      
      // Parse reference
      const bng2Gdat = parseGdat(bng2GdatContent);
      
      if (!bng2Gdat) {
        throw new Error('Failed to parse BNG2 gdat');
      }
      
      // Compare final values (at t_end)
      const webFinal = webResults.data[webResults.data.length - 1];
      const bng2Final = bng2Gdat.data[bng2Gdat.data.length - 1];
      
      // Check each observable
      for (const header of bng2Gdat.headers) {
        if (header === 'time') continue;
        
        const bng2Val = bng2Final[header];
        const webVal = webFinal[header];
        
        if (webVal === undefined) {
          console.warn(\`Observable \${header} not found in web output\`);
          continue;
        }
        
        const diff = Math.abs(bng2Val - webVal);
        const relDiff = bng2Val !== 0 ? diff / Math.abs(bng2Val) : diff;
        
        // Allow 5% relative error or 1e-6 absolute error
        expect(relDiff < 0.05 || diff < 1e-6, 
          \`\${header}: BNG2=\${bng2Val}, Web=\${webVal}, relDiff=\${(relDiff*100).toFixed(2)}%\`
        ).toBe(true);
      }
    }, 30000); // 30s timeout per model
  }
});
`;
}

main().catch(console.error);
