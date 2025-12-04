/**
 * Debug specific species structure
 */
import { BNGLParser } from '../src/services/graph/core/BNGLParser.ts';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator.ts';
import { GraphCanonicalizer } from '../src/services/graph/core/Canonical.ts';

async function debugSpeciesStructure() {
  // Manually build the network to inspect
  const seedSpecies = [
    BNGLParser.parseSpeciesGraph('L(r,r,r)', true),
    BNGLParser.parseSpeciesGraph('R(l,l)', true)
  ];
  
  const rules = [
    BNGLParser.parseRxnRule('L(r,r,r) + R(l) -> L(r!1,r,r).R(l!1)', 1.0),
    BNGLParser.parseRxnRule('L(r,r,r!+) + R(l) -> L(r!1,r,r!+).R(l!1)', 1.0),
  ];
  
  rules[0].name = 'Rule1';
  rules[1].name = 'Rule2';

  const generator = new NetworkGenerator({
    maxSpecies: 10,
    maxReactions: 50,
    maxIterations: 5,
    maxAgg: 50,
    maxStoich: 100
  });

  console.log('=== Generating Network ===');
  const result = await generator.generate(seedSpecies, rules);

  console.log('\n=== Species Analysis ===');
  for (const species of result.species) {
    console.log(`\nSpecies ${species.index}: ${species.toString()}`);
    console.log(`  Canonical: ${GraphCanonicalizer.canonicalize(species.graph)}`);
    console.log(`  Molecules: ${species.graph.molecules.length}`);
    for (let m = 0; m < species.graph.molecules.length; m++) {
      const mol = species.graph.molecules[m];
      console.log(`    [${m}] ${mol.name}:`);
      for (let c = 0; c < mol.components.length; c++) {
        const comp = mol.components[c];
        const bondTarget = species.graph.adjacency.get(`${m}.${c}`);
        console.log(`      [${c}] ${comp.name}: bond=${bondTarget || 'none'}`);
      }
    }
    console.log(`  Adjacency map:`);
    for (const [key, value] of species.graph.adjacency.entries()) {
      console.log(`    ${key} <-> ${value}`);
    }
  }
}

debugSpeciesStructure().catch(console.error);
