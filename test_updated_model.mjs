import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Read the worker script from bnglService.ts
const source = fs.readFileSync(path.join(__dirname, 'services', 'bnglService.ts'), 'utf8');
const match = source.match(/const workerScript = `([\s\S]*?)`;/);
if (!match) {
  throw new Error('workerScript not found');
}

let workerScript = match[1];

const selfObj = {
  postMessage: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  console,
};

globalThis.self = selfObj;

const factory = new Function('self', `${workerScript}; return { parseBNGL, simulate };`);
const { parseBNGL, simulate } = factory(selfObj);

// Read our test BNGL file
const bnglCode = fs.readFileSync(path.join(__dirname, 'test_simple.bngl'), 'utf8');

console.log('Parsing BNGL...');
const parsed = parseBNGL(bnglCode);
console.log('Parameters:', Object.keys(parsed.parameters));
console.log('Species count:', parsed.species.length);
console.log('Reaction rules count:', parsed.reactionRules.length);

console.log('Species:');
parsed.species.forEach((s, i) => console.log(`  ${i}: ${s.name} (${s.concentration})`));

console.log('Reaction rules:');
parsed.reactionRules.forEach((r, i) => console.log(`  ${i}: ${r.reactants} -> ${r.products}`));

// Try to simulate
console.log('Simulating...');
try {
  const result = simulate(parsed, { method: 'ode', t_end: 10, n_steps: 10 });
  console.log('Simulation successful!');
  console.log('Headers:', result.headers);
  console.log('Data points:', result.data.length);
} catch (error) {
  console.error('Simulation failed:', error.message);
}