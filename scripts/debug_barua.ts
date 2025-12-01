
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator';
import { BNGLParser } from '../src/services/graph/core/BNGLParser';
import { parseBNGL } from '../services/parseBNGL';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set debug flag for NetworkGenerator
process.env.DEBUG_NETWORK_GENERATOR = 'true';
process.env.DEBUG_BARUA = 'true';

async function runDebug() {
  // Use process.cwd() to be safe when running bundled script from root
  const bnglPath = path.resolve(process.cwd(), 'published-models/complex-models/Barua_2007.bngl');
  console.log('Reading BNGL from:', bnglPath);
  const code = fs.readFileSync(bnglPath, 'utf8');
  const model = parseBNGL(code);

  console.log(`Parsed ${model.species.length} seed species.`);
  console.log(`Parsed ${model.reactionRules.length} rules.`);

  const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));

  const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

  const rules = model.reactionRules.flatMap(r => {
    const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
    const reverseRate = r.reverseRate ? (model.parameters[r.reverseRate] ?? parseFloat(r.reverseRate)) : rate;
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');

    if (r.constraints && r.constraints.length > 0) {
      console.log(`[DEBUG] Applying constraints to rule ${r.name}`);
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

  console.log(`Generated ${rules.length} rule objects.`);

  const generator = new NetworkGenerator({
    maxSpecies: 50,
    maxReactions: 1000,
    maxIterations: 10,
    maxAgg: 10,
    checkInterval: 10,
    partialReturnOnLimit: true
  });

  try {
    console.log('Starting generation...');
    const result = await generator.generate(seedSpecies, rules, (progress) => {
      // Use process.stderr.write for immediate output
      process.stderr.write(`Progress: Iter ${progress.iteration}, Species ${progress.species}, Rxns ${progress.reactions}, Mem ${(progress.memoryUsed / 1024 / 1024).toFixed(1)}MB\n`);
    });
    console.log('Generation complete.');
    console.log(`Species: ${result.species.length}`);
    console.log(`Reactions: ${result.reactions.length}`);
  } catch (e: any) {
    console.error('Generation failed:', e.message);
    if (e.stack) console.error(e.stack);
  }
}

runDebug();
