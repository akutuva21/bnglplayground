/**
 * Deep diagnostic for mapk-signaling-cascade network generation
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator';

const thisDir = dirname(fileURLToPath(import.meta.url));

async function main() {
  const modelPath = resolve(thisDir, 'example-models/mapk-signaling-cascade.bngl');
  const bnglContent = readFileSync(modelPath, 'utf-8');
  
  console.log('=== MAPK-SIGNALING-CASCADE NETWORK GENERATION DIAGNOSTIC ===\n');
  console.log('Model content:');
  console.log(bnglContent);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Parse the model
  const model = parseBNGL(bnglContent);
  console.log('Parsed model:');
  console.log(`  Parameters: ${model.parameters?.length || 0}`);
  console.log(`  Molecule types: ${model.moleculeTypes?.length || 0}`);
  console.log(`  Seed species: ${model.seedSpecies?.length || 0}`);
  console.log(`  Reaction rules: ${model.reactionRules?.length || 0}`);
  
  console.log('\nMolecule types:');
  model.moleculeTypes?.forEach((mt, i) => {
    console.log(`  ${i}: ${mt.name}(${(mt.components || []).map(c => c.name + (c.states ? '~' + c.states.join('~') : '')).join(',')})`);
  });
  
  console.log('\nSeed species:');
  model.seedSpecies?.forEach((ss, i) => {
    console.log(`  ${i}: ${ss.species} = ${ss.concentration}`);
  });
  
  console.log('\nReaction rules:');
  model.reactionRules?.forEach((rr, i) => {
    console.log(`  ${i}: ${rr.original || 'unknown'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('Starting network generation with detailed logging...');
  console.log('='.repeat(60) + '\n');
  
  // Create network generator
  const generator = new NetworkGenerator(
    model.moleculeTypes || [],
    model.parameters || [],
    model.reactionRules || [],
    model.seedSpecies || []
  );
  
  let iterCount = 0;
  const MAX_ITER = 20;
  const startTime = Date.now();
  
  generator.onProgress = (progress) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${elapsed}s] Iter ${progress.iteration}: ${progress.species} species, ${progress.reactions} reactions`);
    iterCount = progress.iteration;
    
    // Stop if taking too long
    if (iterCount >= MAX_ITER) {
      console.log(`\n⚠️ Stopping at iteration ${MAX_ITER} - seems stuck in infinite loop`);
      throw new Error('Max iterations exceeded');
    }
  };
  
  try {
    const network = generator.generate();
    console.log(`\n✅ Network generation completed!`);
    console.log(`Final: ${network.species.length} species, ${network.reactions.length} reactions`);
    
    console.log('\nSpecies:');
    network.species.forEach((sp, i) => {
      console.log(`  ${i}: ${sp.name} (conc=${sp.concentration})`);
    });
  } catch (err) {
    console.log(`\n❌ Network generation failed: ${err}`);
  }
}

main().catch(console.error);
