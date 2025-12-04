// Test network generation for Barua_2013
import { readFileSync } from 'fs';
import { parseBNGL } from './services/parseBNGL.ts';
import { BNGLParser } from './src/services/graph/core/BNGLParser.ts';
import { NetworkGenerator } from './src/services/graph/NetworkGenerator.ts';
import { GraphCanonicalizer } from './src/services/graph/core/Canonical.ts';

const bnglContent = readFileSync('./published-models/cell-regulation/Barua_2013.bngl', 'utf-8');
const model = parseBNGL(bnglContent);

console.log('Parsed model:');
console.log('  Species:', model.species.length);
console.log('  ReactionRules:', model.reactionRules.length);

// Show the CK1a phosphorylation rule
const ck1aRule = model.reactionRules.find(r => r.reactants.some(s => s.includes('CK1a')));
if (ck1aRule) {
  console.log('\nCK1a phosphorylation rule:');
  console.log('  Reactants:', ck1aRule.reactants);
  console.log('  Products:', ck1aRule.products);
  console.log('  Rate:', ck1aRule.rate);
}

// Run network generation
const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
const observableNames = new Set(model.observables.map(o => o.name));
const parametersMap = new Map(Object.entries(model.parameters));

const formatSpeciesList = (list) => (list.length > 0 ? list.join(' + ') : '0');

const rules = model.reactionRules.flatMap(r => {
  const rate = BNGLParser.evaluateExpression(r.rate, parametersMap, observableNames);
  const reverseRate = r.reverseRate 
    ? BNGLParser.evaluateExpression(r.reverseRate, parametersMap, observableNames)
    : rate;
  
  const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
  const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
  forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');

  if (r.constraints && r.constraints.length > 0) {
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

console.log('\nParsed', rules.length, 'rules');

// Show the CK1a rule pattern
const ck1aParsedRule = rules.find(r => r.name && r.name.includes('CK1a'));
if (ck1aParsedRule) {
  console.log('CK1a rule parsed:');
  console.log('  Reactant molecules:', ck1aParsedRule.reactants.map(sg => sg.molecules.map(m => m.name)));
  console.log('  Rate:', ck1aParsedRule.rateConstant);
}

const generator = new NetworkGenerator({ maxSpecies: 500, maxIterations: 100 });
console.log('\nGenerating network...');

try {
  const result = await generator.generate(seedSpecies, rules);
  console.log('Generated', result.species.length, 'species,', result.reactions.length, 'reactions');
  
  // Check for phosphorylated bCat species
  const phosphoSpecies = result.species.filter(s => {
    const canonical = GraphCanonicalizer.canonicalize(s.graph);
    return canonical.includes('s45~P') || canonical.includes('s33s37~P');
  });
  console.log('Species with phosphorylated bCat:', phosphoSpecies.length);
  
  // Check if any reactions involve CK1a
  const ck1aReactions = result.reactions.filter(r => r.name && r.name.includes('CK1a'));
  console.log('Reactions involving CK1a rule:', ck1aReactions.length);
  
} catch (err) {
  console.error('Network generation failed:', err);
}

console.log('\nDone.');
