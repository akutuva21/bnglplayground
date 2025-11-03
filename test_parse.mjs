import fs from 'fs';
import { parseBNGL } from './services/bnglWorker.ts';

const bnglCode = fs.readFileSync('test_simple.bngl', 'utf8');
console.log('Testing BNGL parsing...');

try {
  const result = parseBNGL(bnglCode);
  console.log('Parsed successfully');
  console.log('Number of reaction rules:', result.reactionRules.length);
  result.reactionRules.forEach((rule, i) => {
    console.log(`Rule ${i+1}:`, rule.reactants.join(' + '), '->', rule.products.join(' + '));
  });
} catch (err) {
  console.error('Parse error:', err);
}