import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, '..', 'services', 'bnglService.ts'), 'utf8');
const rawMarker = 'const workerScript = String.raw`';
const legacyMarker = 'const workerScript = `';
let workerStart = source.indexOf(rawMarker);
let markerLength = rawMarker.length;
if (workerStart === -1) {
  workerStart = source.indexOf(legacyMarker);
  markerLength = legacyMarker.length;
}
if (workerStart === -1) {
  throw new Error('workerScript not found');
}

const endMarker = '`;\n\nclass BnglService';
const end = source.indexOf(endMarker, workerStart + markerLength);
if (end === -1) {
  throw new Error('workerScript end marker not found');
}

const workerScript = source.slice(workerStart + markerLength, end);

const selfObj = {
  postMessage: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  console,
};

const factory = new Function('self', `${workerScript}; return { parseBNGL, simulate, generateNetwork };`);
const { parseBNGL, simulate, generateNetwork } = factory(selfObj);

const constants = fs.readFileSync(path.join(__dirname, '..', 'constants.ts'), 'utf8');
const start = constants.indexOf("id: 'quorum-sensing'");
const snippet = constants.slice(start, start + 1500);
const codeMatch = snippet.match(/code: `([\s\S]*?)`,\n    tags/);
if (!codeMatch) {
  throw new Error('quorum code not found');
}
const code = codeMatch[1];

const parsed = parseBNGL(code);
console.log('parameters', parsed.parameters);
console.log('species', parsed.species);
console.log('observables', parsed.observables);
console.log('reactionRules', parsed.reactionRules);

const expanded = generateNetwork(parsed);
console.log('expanded reactions', expanded.reactions);
console.log('expanded species', expanded.species);

const res = simulate(parsed, { method: 'ode', t_end: 2, n_steps: 4 });
console.log('headers', res.headers);
console.log('data', res.data);

try {
  const longRes = simulate(parsed, { method: 'ode', t_end: 120, n_steps: 240 });
  console.log('long horizon final', longRes.data.at(-1));
} catch (err) {
  console.error('long horizon error', err);
}

const simpleDecay = `begin model
begin parameters
  k 1.0
end parameters
begin molecule types
  A()
end molecule types
begin seed species
  A() 10
end seed species
begin observables
  Molecules A_obs A()
end observables
begin reaction rules
  A() -> 0 k
end reaction rules
end model`;

const decayParsed = parseBNGL(simpleDecay);
try {
  const decayRes = simulate(decayParsed, { method: 'ode', t_end: 120, n_steps: 240 });
  console.log('decay final', decayRes.data.at(-1));
} catch (err) {
  console.error('decay simulate error', err);
}

const getBlockContent = (blockName, bnglCode) => {
    const escapeRegex = (value) => {
      const ESCAPE_CODES = new Set([92, 94, 36, 42, 43, 63, 46, 40, 41, 124, 91, 93, 123, 125]);
      let result = '';
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (ESCAPE_CODES.has(code)) {
          result += '\\';
        }
        result += value[i];
      }
      return result;
    };

    const escapedBlock = escapeRegex(blockName);
    const beginPattern = new RegExp('^\\s*begin\\s+' + escapedBlock + '\\b', 'i');
    const endPattern = new RegExp('^\\s*end\\s+' + escapedBlock + '\\b', 'i');

  const lines = bnglCode.split(/\r?\n/);
  const collected = [];
  let inBlock = false;

  for (const rawLine of lines) {
    const lineWithoutComments = rawLine.split('#')[0];
    if (!inBlock) {
      if (beginPattern.test(lineWithoutComments)) {
        inBlock = true;
      }
      continue;
    }

    if (endPattern.test(lineWithoutComments)) {
      break;
    }

    collected.push(rawLine);
  }

  return collected.join('\n').trim();
};

const cleanLine = (line) => line.trim().split('#')[0].trim();

const manualParamsContent = getBlockContent('parameters', code);
console.log('manual params content', JSON.stringify(manualParamsContent));
manualParamsContent.split(/\r?\n/).forEach(line => {
  const cleaned = cleanLine(line);
  if (cleaned) {
    console.log('manual param parts', cleaned.split(/\s+/));
  }
});
