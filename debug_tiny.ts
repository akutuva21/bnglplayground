/**
 * Tiny diagnostic for parameter evaluation
 */
import { parseBNGL } from './services/parseBNGL';
import { BNGLParser } from './src/services/graph/core/BNGLParser';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));

const modelPath = resolve(thisDir, 'example-models/rab-gtpase-cycle.bngl');
const bnglContent = readFileSync(modelPath, 'utf-8');

const model = parseBNGL(bnglContent);

console.log('model.parameters:', model.parameters);
console.log('Type of model.parameters:', typeof model.parameters);

const parametersMap = new Map(Object.entries(model.parameters));
console.log('parametersMap:', parametersMap);
console.log('parametersMap.get("k_gef"):', parametersMap.get('k_gef'));

const rateExpr = model.reactionRules[0].rate;
console.log('Rate expression:', rateExpr, '(type:', typeof rateExpr, ')');

const evaluatedRate = BNGLParser.evaluateExpression(rateExpr, parametersMap);
console.log('Evaluated rate:', evaluatedRate);

// Now create a rule
const r = model.reactionRules[0];
const ruleStr = `${r.reactants.join(' + ')} -> ${r.products.join(' + ')}`;
console.log('Rule string:', ruleStr);
console.log('Rate for rule:', evaluatedRate);

const rule = BNGLParser.parseRxnRule(ruleStr, evaluatedRate);
console.log('Parsed rule rate:', rule.rate);
console.log('Parsed rule reactants:', rule.reactants.length);
console.log('Parsed rule products:', rule.products.length);
