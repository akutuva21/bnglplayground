/**
 * Diagnostic script to test specific models that should be fast
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBNGL } from './services/parseBNGL';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';

const thisDir = dirname(fileURLToPath(import.meta.url));

const MODELS_TO_TEST = [
  'example-models/mapk-signaling-cascade.bngl',
  'example-models/rab-gtpase-cycle.bngl',
  'example-models/dual-site-phosphorylation.bngl',
];

async function testModel(modelPath: string) {
  const fullPath = resolve(thisDir, modelPath);
  const bnglContent = readFileSync(fullPath, 'utf-8');
  const modelName = modelPath.split('/').pop()!.replace('.bngl', '');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${modelName}`);
  console.log('='.repeat(60));
  
  // Parse
  const parseStart = performance.now();
  const model = parseBNGL(bnglContent);
  const parseTime = performance.now() - parseStart;
  console.log(`Parse time: ${parseTime.toFixed(1)}ms`);
  console.log(`  Molecule types: ${model.moleculeTypes?.length || 0}`);
  console.log(`  Seed species: ${model.seedSpecies?.length || 0}`);
  console.log(`  Reaction rules: ${model.reactionRules?.length || 0}`);
  
  // Network generation
  const genStart = performance.now();
  const generator = new NetworkGenerator(
    model.moleculeTypes || [],
    model.parameters || [],
    model.reactionRules || [],
    model.seedSpecies || []
  );
  
  let lastLog = Date.now();
  let lastSpecies = 0;
  
  generator.onProgress = (progress) => {
    const now = Date.now();
    if (now - lastLog > 2000 || progress.species - lastSpecies > 50) {  // Log every 2s or 50 species
      console.log(`  Progress: ${progress.species} species, ${progress.reactions} rxns, iter ${progress.iteration}`);
      lastLog = now;
      lastSpecies = progress.species;
    }
  };
  
  const network = generator.generate();
  const genTime = performance.now() - genStart;
  console.log(`Network generation time: ${genTime.toFixed(1)}ms`);
  console.log(`  Final species: ${network.species.length}`);
  console.log(`  Final reactions: ${network.reactions.length}`);
  
  return { modelName, parseTime, genTime, species: network.species.length, reactions: network.reactions.length };
}

async function main() {
  console.log('Model Speed Diagnostic');
  console.log('='.repeat(60));
  
  const results = [];
  for (const modelPath of MODELS_TO_TEST) {
    try {
      const result = await testModel(modelPath);
      results.push(result);
    } catch (err) {
      console.error(`Error testing ${modelPath}:`, err);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    console.log(`${r.modelName}: ${r.species} species, ${r.reactions} rxns - Gen time: ${r.genTime.toFixed(0)}ms`);
  }
}

main().catch(console.error);
