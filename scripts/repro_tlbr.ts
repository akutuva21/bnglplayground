
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator.ts';
import { BNGLParser } from '../src/services/graph/core/BNGLParser.ts';
import { parseBNGL } from '../services/parseBNGL.ts';

const tlbrBNGL = `
begin parameters
t_end		1000
n_steps     	1000
Fx		1.0
Lig_tot		4200/Fx
Rec_tot		300/Fx
kp1		Fx*3.0e-07
km1		0.01
kp2		Fx*3.0e-03
km2		0.01
end parameters

begin molecule types
L(r,r,r)
R(l,l)
end molecule types

begin species
L(r,r,r)	Lig_tot
R(l,l)		Rec_tot
end species

begin reaction rules
L(r,r,r) + R(l) <-> L(r!1,r,r).R(l!1) kp1,km1
L(r,r,r!+) + R(l) <-> L(r!1,r,r!+).R(l!1) kp2,km2
L(r,r!+,r!+) + R(l) <-> L(r!1,r!+,r!+).R(l!1) kp2,km2
end reaction rules
`;

async function run() {
    console.log("Parsing BNGL...");
    const model = parseBNGL(tlbrBNGL);
    
    const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
    console.log(`Parsed ${seedSpecies.length} seed species`);

    const rules = model.reactionRules.flatMap(r => {
        const rate = 1.0; // Dummy rate
        const ruleStr = `${r.reactants.join(' + ')} -> ${r.products.join(' + ')}`;
        try {
            const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
            forwardRule.name = r.name || ruleStr;
            if (r.isBidirectional) {
                const revRuleStr = `${r.products.join(' + ')} -> ${r.reactants.join(' + ')}`;
                const reverseRule = BNGLParser.parseRxnRule(revRuleStr, rate);
                reverseRule.name = (r.name ? r.name + '_rev' : revRuleStr);
                return [forwardRule, reverseRule];
            }
            return [forwardRule];
        } catch (e) {
            console.error("Failed to parse rule:", ruleStr, e);
            return [];
        }
    });

    console.log(`Parsed ${rules.length} rules`);

    const generator = new NetworkGenerator({
        maxSpecies: 100,
        maxReactions: 100,
        maxIterations: 10
    });

    try {
        console.log("Generating network...");
        const result = await generator.generate(seedSpecies, rules, (p) => {
            console.log(`Iter: ${p.iteration}, S: ${p.species}, R: ${p.reactions}`);
        });
        console.log("Success!");
        console.log(`Generated ${result.species.length} species and ${result.reactions.length} reactions.`);
    } catch (e: any) {
        console.error("Generation failed:", e);
        if (e.stack) console.error(e.stack);
    }
}

run();
