import { describe, it, expect } from 'vitest';
import { EXAMPLES } from '../constants';
import { parseBNGL } from '../services/parseBNGL';
import { BNGLParser } from '../src/services/graph/core/BNGLParser';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator';
import { GraphCanonicalizer } from '../src/services/graph/core/Canonical';
import type { BNGLModel } from '../types';

const MAX_SPECIES = 1500;
const MAX_REACTIONS = 20000;
const MAX_ITERATIONS = 150;
const MAX_COMPLEX_SIZE = 500;

const RUNAWAY_EXAMPLE_IDS = new Set<string>();

const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

async function generateNetworkForModel(model: BNGLModel) {
  const seedSpecies = model.species.map((s) => BNGLParser.parseSpeciesGraph(s.name));

  const rules = model.reactionRules.flatMap((r) => {
    const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forward = BNGLParser.parseRxnRule(ruleStr, rate, `${r.reactants.join('+')}->${r.products.join('+')}`);

    if (r.isBidirectional) {
      const reverseRate = r.reverseRate ? model.parameters[r.reverseRate] ?? parseFloat(r.reverseRate) : rate;
      const reverseStr = `${formatSpeciesList(r.products)} -> ${formatSpeciesList(r.reactants)}`;
      const reverse = BNGLParser.parseRxnRule(reverseStr, reverseRate, `${r.products.join('+')}->${r.reactants.join('+')}`);
      return [forward, reverse];
    }

    return [forward];
  });

  const generator = new NetworkGenerator({
    maxSpecies: MAX_SPECIES,
    maxReactions: MAX_REACTIONS,
    maxIterations: MAX_ITERATIONS,
    maxAgg: MAX_COMPLEX_SIZE,
    maxStoich: MAX_COMPLEX_SIZE,
    checkInterval: 250,
    memoryLimit: 5e8,
  });

  return generator.generate(seedSpecies, rules);
}

describe('Example gallery models', () => {
  EXAMPLES.forEach((example) => {
    it(`generates a finite network for ${example.name}`, async () => {
      const model = parseBNGL(example.code);
      expect(model.species.length).toBeGreaterThan(0);
      expect(model.reactionRules.length).toBeGreaterThan(0);

      const resultPromise = generateNetworkForModel(model);
      const isRunaway = RUNAWAY_EXAMPLE_IDS.has(example.id);

      if (isRunaway) {
        await expect(resultPromise).rejects.toMatchObject({
          name: 'NetworkGenerationLimitError',
          message: expect.stringContaining('rule "'),
        });
        return;
      }

      const result = await resultPromise;

      expect(result.species.length).toBeGreaterThan(0);
      expect(result.reactions.length).toBeGreaterThan(0);
      expect(result.species.length).toBeLessThan(MAX_SPECIES);
      expect(result.reactions.length).toBeLessThan(MAX_REACTIONS);

      const canonicalSeen = new Set<string>();
      for (const species of result.species) {
        const canonical = GraphCanonicalizer.canonicalize(species.graph);
        expect(canonicalSeen.has(canonical)).toBe(false);
        canonicalSeen.add(canonical);

        expect(species.graph.molecules.length).toBeLessThanOrEqual(MAX_COMPLEX_SIZE);

        const rendered = BNGLParser.speciesGraphToString(species.graph);
        expect(rendered.includes('undefined')).toBe(false);
        expect(rendered.includes('[object')).toBe(false);
      }

      for (const reaction of result.reactions) {
        expect(Number.isFinite(reaction.rate)).toBe(true);
      }
    }, 20000);
  });
});
