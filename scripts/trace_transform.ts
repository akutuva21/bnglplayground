/**
 * Detailed trace of a single rule 2 transformation
 */
import { BNGLParser } from '../src/services/graph/core/BNGLParser.ts';
import { GraphMatcher } from '../src/services/graph/core/Matcher.ts';
import { SpeciesGraph } from '../src/services/graph/core/SpeciesGraph.ts';
import { Molecule } from '../src/services/graph/core/Molecule.ts';
import { Component } from '../src/services/graph/core/Component.ts';

console.log('=== Tracing Rule 2 Transformation ===\n');

// Rule 2: L(r,r,r!+) + R(l) -> L(r!1,r,r!+).R(l!1)
const rule = BNGLParser.parseRxnRule(
  'L(r,r,r!+) + R(l) -> L(r!1,r,r!+).R(l!1)',
  1.0
);

const reactant1 = BNGLParser.parseSpeciesGraph('L(r!1,r,r).R(l!1,l)', true);
const reactant2 = BNGLParser.parseSpeciesGraph('R(l,l)', true);

console.log('Reactant 1:', reactant1.toString());
console.log('  Adjacency:', Array.from(reactant1.adjacency.entries()));
console.log('  Molecules:');
reactant1.molecules.forEach((m, i) => {
  console.log(`    [${i}] ${m.name}: ${m.components.map(c => c.name + (c.wildcard ? '!' + c.wildcard : '')).join(', ')}`);
});

console.log('\nReactant 2:', reactant2.toString());
console.log('  Adjacency:', Array.from(reactant2.adjacency.entries()));
console.log('  Molecules:');
reactant2.molecules.forEach((m, i) => {
  console.log(`    [${i}] ${m.name}: ${m.components.map(c => c.name + (c.wildcard ? '!' + c.wildcard : '')).join(', ')}`);
});

// Get matches
const pattern1 = rule.reactants[0]; // L(r,r,r!+)
const pattern2 = rule.reactants[1]; // R(l)

console.log('\n=== Pattern Matching ===');
console.log('Pattern 1:', pattern1.toString());
pattern1.molecules.forEach((m, i) => {
  console.log(`  [${i}] ${m.name}: ${m.components.map(c => c.name + (c.wildcard ? '!' + c.wildcard : '')).join(', ')}`);
});

const matches1 = GraphMatcher.findAllMaps(pattern1, reactant1);
console.log('\nMatch 1 (pattern1 vs reactant1):');
matches1.forEach((m, i) => {
  console.log(`  Match ${i}:`);
  console.log(`    Molecule map: ${JSON.stringify(Array.from(m.moleculeMap.entries()))}`);
  console.log(`    Component map: ${JSON.stringify(Array.from(m.componentMap.entries()))}`);
});

console.log('\nPattern 2:', pattern2.toString());
pattern2.molecules.forEach((m, i) => {
  console.log(`  [${i}] ${m.name}: ${m.components.map(c => c.name + (c.wildcard ? '!' + c.wildcard : '')).join(', ')}`);
});

const matches2 = GraphMatcher.findAllMaps(pattern2, reactant2);
console.log('\nMatch 2 (pattern2 vs reactant2):');
matches2.forEach((m, i) => {
  console.log(`  Match ${i}:`);
  console.log(`    Molecule map: ${JSON.stringify(Array.from(m.moleculeMap.entries()))}`);
  console.log(`    Component map: ${JSON.stringify(Array.from(m.componentMap.entries()))}`);
});

// Now manually trace the transformation
console.log('\n=== Manual Transformation Trace ===');

const productPattern = rule.products[0]; // L(r!1,r,r!+).R(l!1)
console.log('Product pattern:', productPattern.toString());
console.log('  Adjacency:', Array.from(productPattern.adjacency.entries()));
productPattern.molecules.forEach((m, i) => {
  console.log(`  [${i}] ${m.name}:`);
  m.components.forEach((c, ci) => {
    console.log(`    [${ci}] ${c.name}: wildcard=${c.wildcard}, edges=${JSON.stringify(Array.from(c.edges.entries()))}`);
  });
});

console.log('\n--- Step 1: Determine included molecules ---');
const match1 = matches1[0];
const match2 = matches2[0];

// Reactant 1: Include matched molecule and connected
console.log('Reactant 1 matched molecules:', Array.from(match1.moleculeMap.values()));
console.log('  After expansion (connected component): mol 0 (L), mol 1 (R)');

// Reactant 2: Include matched molecule
console.log('Reactant 2 matched molecules:', Array.from(match2.moleculeMap.values()));
console.log('  After expansion: mol 0 (R)');

console.log('\n--- Step 2: Clone molecules ---');
console.log('From reactant 1: Clone mol 0 (L) -> product mol 0');
console.log('From reactant 1: Clone mol 1 (R) -> product mol 1');
console.log('From reactant 2: Clone mol 0 (R) -> product mol 2');

console.log('\n--- Step 3: Map product pattern molecules ---');
console.log('Product pattern mol 0 (L) should map from reactant pattern 0 (L) -> matches reactant 1 mol 0 -> product mol 0');
console.log('Product pattern mol 1 (R) should map from reactant pattern 1 (R) -> matches reactant 2 mol 0 -> product mol 2');

console.log('\n--- Step 4: Recreate bonds from reactants ---');
console.log('Reactant 1 has bond: 0.0 <-> 1.0 (L.r to R.l)');
console.log('This becomes: product mol 0 comp 0 <-> product mol 1 comp 0');
console.log('Result: L(r!...).R(l!...).R(l,l) with bond between mol 0 and mol 1');

console.log('\n--- Step 5: Map components ---');
console.log('Product pattern mol 0 (L) has components:');
console.log('  [0] r with edge 1 (new bond) -> should find unbound r in product mol 0');
console.log('  [1] r (unbound) -> should find unbound r in product mol 0');
console.log('  [2] r!+ (preserve existing) -> should find bound r in product mol 0');
console.log('Product pattern mol 1 (R) has components:');
console.log('  [0] l with edge 1 (new bond) -> should find unbound l in product mol 2');

console.log('\n--- Step 6: Create new bonds ---');
console.log('Bond label 1 connects:');
console.log('  Product pattern mol 0 comp 0 (L.r!1) -> componentIndexMap lookup');
console.log('  Product pattern mol 1 comp 0 (R.l!1) -> componentIndexMap lookup');

// The key question: what component indices are in componentIndexMap?
// If pattern L.r!1 (index 0) maps to product mol 0's ALREADY BOUND r, 
// then we would be overwriting the existing bond!

console.log('\n=== The Bug ===');
console.log('The problem is in Step 5 component mapping.');
console.log('Pattern L has components: r!1, r, r!+');
console.log('Product mol 0 has components: r (bound at idx 0), r (unbound at idx 1), r (unbound at idx 2)');
console.log('');
console.log('When mapping pattern components:');
console.log('  - Pattern r!1 (new bond) should map to an UNBOUND component (idx 1 or 2)');
console.log('  - Pattern r (unbound) should map to another UNBOUND component');
console.log('  - Pattern r!+ (preserve) should map to the BOUND component (idx 0)');
console.log('');
console.log('But the current code may be mapping them wrong!');
