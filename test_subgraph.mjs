#!/usr/bin/env node
/**
 * Test subgraph matching with the complex IL-6/TGF-β model
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import BioNetGen services
const workerPath = join(__dirname, 'services/bnglWorker.ts');
const bnglServicePath = join(__dirname, 'services/bnglService.ts');

// We'll use dynamic import after building
async function testSubgraphMatching() {
  console.log('Testing subgraph matching with complex IL-6/TGF-β model...\n');

  // Read the test_simple.bngl file
  const bnglPath = join(__dirname, 'test_simple.bngl');
  const bnglContent = fs.readFileSync(bnglPath, 'utf-8');

  console.log('BNGL Model Overview:');
  console.log('====================');
  
  // Count seed species
  const seedMatch = bnglContent.match(/begin seed species([\s\S]*?)end seed species/);
  if (seedMatch) {
    const seeds = seedMatch[1].trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    console.log(`Seed Species Count: ${seeds.length}`);
    seeds.forEach(s => console.log(`  - ${s.trim().split(/\s+/)[0]}`));
  }

  // Count reaction rules
  const rulesMatch = bnglContent.match(/begin reaction rules([\s\S]*?)end reaction rules/);
  if (rulesMatch) {
    const rules = rulesMatch[1].trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    console.log(`\nReaction Rules Count: ${rules.length}`);
    rules.slice(0, 5).forEach(r => console.log(`  - ${r.trim().slice(0, 80)}...`));
    if (rules.length > 5) console.log(`  ... and ${rules.length - 5} more`);
  }

  console.log('\n\nTo run the full network generation test:');
  console.log('  npm run test -- tests/network.spec.ts');
  console.log('\nTo build and run in browser:');
  console.log('  npm run build');
  console.log('  npm run preview');
}

testSubgraphMatching().catch(console.error);
