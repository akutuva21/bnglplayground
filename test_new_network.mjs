import { parseBNGL, simulate } from './services/bnglService.ts';
import fs from 'fs';

const testCode = fs.readFileSync('./test_simple.bngl', 'utf8');

console.log('Testing simple BNGL model...');

try {
  const parsed = parseBNGL(testCode);
  console.log('Parsed successfully!');
  console.log('Species:', parsed.species.length);
  console.log('Reaction rules:', parsed.reactionRules.length);

  const result = simulate(parsed, { method: 'ode', t_end: 10, n_steps: 20 });
  console.log('Simulation successful!');
  console.log('Headers:', result.headers);
  console.log('Data points:', result.data.length);
  console.log('Final values:', result.data[result.data.length - 1]);
} catch (error) {
  console.error('Error:', error);
}