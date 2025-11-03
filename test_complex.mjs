import { readFileSync } from 'fs';

// Simple BNGL parser (similar to the one in bnglWorker.ts)
function parseBNGL(bnglCode) {
  const model = {
    parameters: {},
    moleculeTypes: [],
    species: [],
    observables: [],
    reactions: [],
    reactionRules: [],
  };

  const getBlockContent = (blockName, code) => {
    const escapedBlock = blockName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const beginPattern = new RegExp(`^\\s*begin\\s+${escapedBlock}\\b`, 'i');
    const endPattern = new RegExp(`^\\s*end\\s+${escapedBlock}\\b`, 'i');

    const lines = code.split(/\r?\n/);
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

  const paramsContent = getBlockContent('parameters', bnglCode);
  if (paramsContent) {
    for (const line of paramsContent.split(/\r?\n/)) {
      const cleaned = cleanLine(line);
      if (cleaned) {
        const parts = cleaned.split(/\s+/);
        if (parts.length >= 2) {
          model.parameters[parts[0]] = parseFloat(parts[1]);
        }
      }
    }
  }

  const molTypesContent = getBlockContent('molecule types', bnglCode);
  if (molTypesContent) {
    for (const line of molTypesContent.split(/\r?\n/)) {
      const cleaned = cleanLine(line);
      if (cleaned) {
        const match = cleaned.match(/(\w+)\((.*?)\)/);
        if (match) {
          const name = match[1];
          const components = match[2].split(',').map(c => c.trim()).filter(Boolean);
          model.moleculeTypes.push({ name, components });
        }
      }
    }
  }

  const speciesContent = getBlockContent('seed species', bnglCode);
  if (speciesContent) {
    for (const line of speciesContent.split(/\r?\n/)) {
      const cleaned = cleanLine(line);
      if (cleaned) {
        const parts = cleaned.split(/\s+/);
        const concentrationStr = parts.pop();
        const name = parts.join(' ');
        const concentration = concentrationStr in model.parameters ?
          model.parameters[concentrationStr] : parseFloat(concentrationStr);
        if (name && !isNaN(concentration)) {
          model.species.push({ name, initialConcentration: concentration });
        }
      }
    }
  }

  const rulesContent = getBlockContent('reaction rules', bnglCode);
  if (rulesContent) {
    const statements = [];
    let current = '';

    for (const line of rulesContent.split(/\r?\n/)) {
      const cleaned = cleanLine(line);
      if (!cleaned) continue;

      if (cleaned.endsWith('\\')) {
        current += cleaned.slice(0, -1).trim() + ' ';
      } else {
        current += cleaned;
        statements.push(current.trim());
        current = '';
      }
    }

    statements.forEach((statement) => {
      let ruleLine = statement;
      const labelMatch = ruleLine.match(/^[^:]+:\s*(.*)$/);
      if (labelMatch) {
        ruleLine = labelMatch[1];
      }

      const isBidirectional = ruleLine.includes('<->');
      const parts = ruleLine.split(isBidirectional ? '<->' : '->');
      if (parts.length < 2) return;

      const reactantsPart = parts[0].trim();
      const productsAndRatesPart = parts[1].trim();

      const reactants = reactantsPart.split('+').map(r => r.trim()).filter(Boolean);
      if (reactants.length === 0) return;

      const productsAndRates = productsAndRatesPart.split(',');
      const products = productsAndRates[0].split('+').map(p => p.trim()).filter(Boolean);
      const rateConstants = productsAndRates.slice(1).map(r => r.trim()).filter(Boolean);

      if (products.length === 0 || rateConstants.length === 0) return;

      const forwardRateLabel = rateConstants[0];
      const reverseRateLabel = rateConstants[1];

      const rule = {
        reactants,
        products,
        rate: forwardRateLabel,
        isBidirectional,
        reverseRate: isBidirectional ? reverseRateLabel : undefined,
      };
      model.reactionRules.push(rule);
    });
  }

  return model;
}

const bnglContent = readFileSync('./test_simple.bngl', 'utf8');

console.log('Testing complex model parsing...');

try {
    const parsedModel = parseBNGL(bnglContent);
    console.log('BNGL parsing successful!');
    console.log('Parameters:', Object.keys(parsedModel.parameters).length);
    console.log('Molecule types:', parsedModel.moleculeTypes.length);
    console.log('Seed species:', parsedModel.species.length);
    console.log('Reaction rules:', parsedModel.reactionRules.length);

    // Now try to import and use NetworkGenerator
    const { NetworkGenerator } = await import('./src/services/graph/NetworkGenerator.js');
    const generator = new NetworkGenerator();
    console.log('NetworkGenerator imported successfully');

    // Convert to the format expected by NetworkGenerator
    const seedSpecies = parsedModel.species.map(s => {
        // This would need BNGLParser.parseSpeciesGraph - let's skip for now
        return s;
    });

    console.log('Test completed - parsing works, NetworkGenerator imports');

} catch (error) {
    console.error('Error:', error);
    console.error('Stack trace:', error.stack);
}