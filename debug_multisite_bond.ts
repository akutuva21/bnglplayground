/**
 * Debug script to trace multi-site bond creation in rules
 */
import { bnglService } from './services/bnglService';

const MODEL = `
begin model
begin parameters
  NFkB_IkB_Bind 1.0
  NFkB_IkB_Unbind 0.1
end parameters

begin molecule types
  NFkB(Activation,Location~Cytoplasm~Nucleus)
  IkB(Phos~No~Yes,p65,p50,Degrade~No~Yes)
end molecule types

begin seed species
  NFkB(Activation,Location~Cytoplasm) 1000
  IkB(Phos~No,p65,p50,Degrade~No) 1000
end seed species

begin reaction rules
  # This rule creates TWO bonds simultaneously:
  # NFkB.Activation binds to BOTH IkB.p65 AND IkB.p50
  NFkB_IkB_Bind: NFkB(Location~Cytoplasm,Activation)+IkB(Phos~No,p65,p50,Degrade~No)<->NFkB(Activation!0!1,Location~Cytoplasm).IkB(Phos~No,p65!0,p50!1,Degrade~No) NFkB_IkB_Bind,NFkB_IkB_Unbind
end reaction rules
end model

generate_network({max_iter=>100,max_stoich=>{NFkB=>1,IkB=>1}});
`;

async function main() {
  console.log('=== Multi-site Bond Test ===\n');
  
  const result = await bnglService.parseAndValidate(MODEL);
  if (!result.success || !result.model) {
    console.error('Parse failed:', result.errors);
    return;
  }
  
  const model = result.model;
  console.log('Parsed model successfully');
  console.log('Rules:', model.rules.length);
  
  // Print the rule details
  for (const rule of model.rules) {
    console.log(`\nRule: ${rule.name || 'unnamed'}`);
    console.log(`  Forward: ${rule.rateConstants.forward}`);
    
    // Access the parsed rule
    const parsedRule = rule as any;
    if (parsedRule.reactants) {
      console.log('  Reactants:');
      for (const r of parsedRule.reactants) {
        console.log(`    ${r.toString()}`);
        if (r.molecules) {
          for (const mol of r.molecules) {
            console.log(`      Molecule: ${mol.name}`);
            for (const comp of mol.components) {
              const edges = Array.from(comp.edges.entries());
              console.log(`        Component: ${comp.name}, state=${comp.state || '-'}, edges=${JSON.stringify(edges)}`);
            }
          }
        }
      }
    }
    if (parsedRule.products) {
      console.log('  Products:');
      for (const p of parsedRule.products) {
        console.log(`    ${p.toString()}`);
        if (p.molecules) {
          for (const mol of p.molecules) {
            console.log(`      Molecule: ${mol.name}`);
            for (const comp of mol.components) {
              const edges = Array.from(comp.edges.entries());
              const adj = p.adjacency?.get(`${p.molecules.indexOf(mol)}.${mol.components.indexOf(comp)}`);
              console.log(`        Component: ${comp.name}, state=${comp.state || '-'}, edges=${JSON.stringify(edges)}, adj=${JSON.stringify(adj)}`);
            }
          }
        }
      }
    }
  }
  
  // Generate network
  console.log('\n=== Generating Network ===\n');
  const network = await bnglService.generateNetwork(model, { maxSpecies: 100, maxReactions: 500 });
  
  console.log('\n=== Generated Species ===\n');
  for (const [idx, sp] of network.species.entries()) {
    console.log(`${idx}: ${sp.label}`);
  }
  
  console.log('\n=== Generated Reactions ===\n');
  for (const [idx, rxn] of network.reactions.entries()) {
    console.log(`${idx}: ${rxn.reactantIndices.join('+')} -> ${rxn.productIndices.join('+')} (${rxn.rateLaw})`);
  }
}

main().catch(console.error);
