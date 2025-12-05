/**
 * Debug script to trace multi-site bond creation in rules
 */
import { BNGLParser } from './src/services/graph/core/BNGLParser';

function main() {
  console.log('=== Multi-site Bond Test ===\n');
  
  // Parse the product pattern directly to check
  console.log('=== Direct pattern parse ===');
  const productStr = 'NFkB(Activation!0!1,Location~Cytoplasm).IkB(Phos~No,p65!0,p50!1,Degrade~No)';
  console.log('Pattern:', productStr);
  const productGraph = BNGLParser.parseSpeciesGraph(productStr);
  console.log('Parsed graph:');
  for (let molIdx = 0; molIdx < productGraph.molecules.length; molIdx++) {
    const mol = productGraph.molecules[molIdx];
    console.log(`  Molecule ${molIdx}: ${mol.name}`);
    for (let compIdx = 0; compIdx < mol.components.length; compIdx++) {
      const comp = mol.components[compIdx];
      const adj = productGraph.adjacency.get(`${molIdx}.${compIdx}`);
      console.log(`    Comp ${compIdx}: ${comp.name}, state=${comp.state || '-'}, edges=${JSON.stringify([...comp.edges])}, adj=${JSON.stringify(adj)}`);
    }
  }
  console.log('Adjacency map:');
  for (const [k, v] of productGraph.adjacency) {
    console.log(`  ${k} -> ${JSON.stringify(v)}`);
  }
  console.log('Graph toString:', productGraph.toString());
  
  // Now let's test another pattern - the NFkB with single bond
  console.log('\n\n=== Second pattern - single bond ===');
  const singleBondStr = 'NFkB(Activation!0,Location~Cytoplasm).IkB(Phos~No,p65!0,p50,Degrade~No)';
  console.log('Pattern:', singleBondStr);
  const singleBondGraph = BNGLParser.parseSpeciesGraph(singleBondStr);
  console.log('Adjacency map:');
  for (const [k, v] of singleBondGraph.adjacency) {
    console.log(`  ${k} -> ${JSON.stringify(v)}`);
  }
  console.log('Graph toString:', singleBondGraph.toString());
}

main();
