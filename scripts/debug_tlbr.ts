/**
 * Debug script to trace network generation for tlbr.bngl
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator.ts';
import { BNGLParser } from '../src/services/graph/core/BNGLParser.ts';
import { parseBNGL } from '../services/parseBNGL.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugTlbr() {
  const filePath = path.resolve(__dirname, '../published-models/immune-signaling/tlbr.bngl');
  const bnglCode = fs.readFileSync(filePath, 'utf8');
  const model = parseBNGL(bnglCode);

  console.log('=== BNGL Model ===');
  console.log('Parameters:', model.parameters);
  console.log('Species:', model.species);
  console.log('Rules:', model.reactionRules);

  const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
  console.log('\n=== Seed Species ===');
  seedSpecies.forEach((s, i) => console.log(`  ${i}: ${s.toString()}`));

  const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

  const rules = model.reactionRules.flatMap(r => {
    const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
    const reverseRate = r.reverseRate ? (model.parameters[r.reverseRate] ?? parseFloat(r.reverseRate)) : rate;
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;

    try {
      const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
      forwardRule.name = r.name || (r.reactants.join('+') + '->' + r.products.join('+'));

      if (r.isBidirectional) {
        const reverseRuleStr = `${formatSpeciesList(r.products)} -> ${formatSpeciesList(r.reactants)}`;
        const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
        reverseRule.name = (r.name ? r.name + '_rev' : r.products.join('+') + '->' + r.reactants.join('+'));
        return [forwardRule, reverseRule];
      } else {
        return [forwardRule];
      }
    } catch (e) {
      console.error(`Failed to parse rule: ${ruleStr}`, e);
      return [];
    }
  });

  console.log('\n=== Parsed Rules ===');
  rules.forEach((r, i) => {
    console.log(`  ${i}: ${r.name}`);
    console.log(`      Reactants: ${r.reactants.map(p => p.toString()).join(' + ')}`);
    console.log(`      Products: ${r.products.map(p => p.toString()).join(' + ')}`);
  });

  const generator = new NetworkGenerator({
    maxSpecies: 15,
    maxReactions: 50,
    maxIterations: 10,
    maxAgg: 50,
    maxStoich: 100,
    partialReturnOnLimit: true
  });

  console.log('\n=== Generating Network ===');
  const result = await generator.generate(seedSpecies, rules, (progress) => {
    console.log(`  Iter ${progress.iteration}: S=${progress.species}, R=${progress.reactions}`);
  });

  console.log('\n=== Final Network ===');
  console.log(`Species (${result.species.length}):`);
  result.species.forEach(s => console.log(`  ${s.index}: ${s.toString()}`));
  console.log(`\nReactions (${result.reactions.length}):`);
  result.reactions.forEach(r => {
    const reactants = r.reactants.map(i => result.species[i]?.toString() || `?${i}`).join(' + ');
    const products = r.products.map(i => result.species[i]?.toString() || `?${i}`).join(' + ');
    console.log(`  ${reactants} -> ${products}  (${r.rate})`);
  });
}

debugTlbr().catch(console.error);
