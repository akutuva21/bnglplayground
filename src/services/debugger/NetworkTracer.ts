import { BNGLParser } from '../graph/core/BNGLParser';
import { NetworkGenerator, type RuleApplicationEvent } from '../graph/NetworkGenerator';
import type { BNGLModel, ReactionRule } from '../../../types';
import { type DebuggerNetwork, type ExpansionEvent, type MatchProjection, type NetworkTrace, type TraceResult, type RuleMultiplicity } from './types';

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const asMultiplicity = (count: number): RuleMultiplicity => {
  if (count <= 1) return 'unimolecular';
  if (count === 2) return 'bimolecular';
  return 'multimolecular';
};

const toMatchProjection = (event: RuleApplicationEvent): MatchProjection[] => {
  if (!event.matches.length) {
    return [];
  }

  return event.matches.map((match) => {
    const projection: MatchProjection = {
      patternMolecule: -1,
      targetMolecule: -1,
      componentMappings: [],
    };

    for (const [patternMol, targetMol] of match.moleculeMap.entries()) {
      projection.patternMolecule = patternMol;
      projection.targetMolecule = targetMol;
      break;
    }

    for (const [key, value] of match.componentMap.entries()) {
      const [patternMolStr, patternCompStr] = key.split('.');
      const [targetMolStr, targetCompStr] = value.split('.');
      const patternComp = Number(patternCompStr);
      const targetComp = Number(targetCompStr);
      if (Number.isNaN(patternComp) || Number.isNaN(targetComp)) {
        continue;
      }
      projection.componentMappings.push({
        patternComponent: patternComp,
        targetComponent: targetComp,
      });
      if (projection.patternMolecule === -1) {
        projection.patternMolecule = Number(patternMolStr);
      }
      if (projection.targetMolecule === -1) {
        projection.targetMolecule = Number(targetMolStr);
      }
    }

    return projection;
  });
};

const toExpandedEvent = (event: RuleApplicationEvent, timestamp: number): ExpansionEvent => {
  const reactantSpeciesNames = event.reactants.map((species) => species.toString());
  const productSpeciesNames = event.products.map((species) => species.toString());

  return {
    stepId: event.stepId,
    timestamp,
    ruleId: event.rule.name,
    ruleName: event.rule.name,
    ruleMultiplicity: asMultiplicity(event.reactants.length),
    reactantSpeciesIds: event.reactants.map((species) => species.index),
    reactantSpeciesNames,
    productSpeciesIds: event.products.map((species) => species.index),
    productSpeciesNames,
    matches: toMatchProjection(event),
    degeneracy: event.degeneracy,
    propensityFactor: event.propensityFactor,
    effectiveRate: event.effectiveRate,
    newSpeciesIds: event.newSpecies.map((species) => species.index),
    totalSpeciesAfter: event.totalSpecies,
    totalReactionsAfter: event.totalReactions,
  };
};

const resolveRuleName = (rule: ReactionRule, index: number): string => {
  if (rule.name && rule.name.trim().length > 0) {
    return rule.name.trim();
  }
  const lhs = rule.reactants.join(' + ');
  const rhs = rule.products.join(' + ');
  return lhs && rhs ? `${lhs}->${rhs}` : `rule_${index + 1}`;
};

const cloneExpandedModel = (model: BNGLModel, generatorOutput: ReturnType<NetworkGenerator['generate']> extends Promise<infer R> ? R : never): BNGLModel => {
  const expandedSpecies = generatorOutput.species.map((species) => ({
    name: BNGLParser.speciesGraphToString(species.graph),
    initialConcentration: species.concentration ?? 0,
  }));

  const expandedReactions = generatorOutput.reactions.map((reaction) => ({
    reactants: reaction.reactants.map((idx) => BNGLParser.speciesGraphToString(generatorOutput.species[idx].graph)),
    products: reaction.products.map((idx) => BNGLParser.speciesGraphToString(generatorOutput.species[idx].graph)),
    rate: reaction.rate.toString(),
    rateConstant: reaction.rate,
  }));

  return {
    ...model,
    species: expandedSpecies,
    reactions: expandedReactions,
  };
};

const buildDebuggerNetwork = (expandedModel: BNGLModel, generatorOutput: ReturnType<NetworkGenerator['generate']> extends Promise<infer R> ? R : never): DebuggerNetwork => {
  const species = generatorOutput.species.map((entry, index) => ({
    id: index,
    name: expandedModel.species[index]?.name ?? entry.toString(),
    concentration: expandedModel.species[index]?.initialConcentration ?? 0,
  }));

  const reactions = generatorOutput.reactions.map((rxn, index) => ({
    id: index,
    ruleName: rxn.name,
    reactantIds: [...rxn.reactants],
    productIds: [...rxn.products],
    rateConstant: rxn.rate,
    degeneracy: rxn.degeneracy,
    propensityFactor: rxn.propensityFactor,
  }));

  return {
    species,
    reactions,
    asModel: expandedModel,
  };
};

export interface TraceOptions {
  maxSpecies?: number;
  maxReactions?: number;
  maxIterations?: number;
}

export class NetworkTracer {
  async trace(model: BNGLModel, options: TraceOptions = {}): Promise<TraceResult> {
    if (!model) {
      throw new Error('BNGL model is required for tracing');
    }

    const traceStart = now();
    const events: ExpansionEvent[] = [];

    const seedSpeciesGraphs = (model.species ?? []).map((species) => BNGLParser.parseSpeciesGraph(species.name));

    const rules = (model.reactionRules ?? []).flatMap((rule, index) => {
      const rate = this.resolveRateConstant(model, rule.rate);
      const name = resolveRuleName(rule, index);
      const forward = BNGLParser.parseRxnRule(`${rule.reactants.join(' + ')} -> ${rule.products.join(' + ')}`, rate);
      forward.name = name;
      forward.allowsIntramolecular = rule.allowsIntramolecular ?? false;

      if (rule.constraints && rule.constraints.length > 0) {
        forward.applyConstraints(rule.constraints, (s) => BNGLParser.parseSpeciesGraph(s));
      }

      if (!rule.isBidirectional) {
        return [forward];
      }

      const reverseRateConstant = this.resolveRateConstant(model, rule.reverseRate ?? rule.rate);
      const reverse = BNGLParser.parseRxnRule(`${rule.products.join(' + ')} -> ${rule.reactants.join(' + ')}`, reverseRateConstant);
      reverse.name = `${name} (reverse)`;
      reverse.allowsIntramolecular = rule.allowsIntramolecular ?? false;
      return [forward, reverse];
    });

    const generator = new NetworkGenerator({
      maxSpecies: options.maxSpecies ?? 10_000,
      maxReactions: options.maxReactions ?? 100_000,
      maxIterations: options.maxIterations ?? 100,
    });

    const eventReporter = (event: RuleApplicationEvent): void => {
      events.push(toExpandedEvent(event, now()));
    };

    const output = await generator.generate(seedSpeciesGraphs, rules, undefined, undefined, eventReporter);

    const expandedModel = cloneExpandedModel(model, output);
    const network = buildDebuggerNetwork(expandedModel, output);

    const traceFinished = now();
    const eventsByRule = events.reduce<Record<string, ExpansionEvent[]>>((acc, event) => {
      acc[event.ruleName] = acc[event.ruleName] ?? [];
      acc[event.ruleName].push(event);
      return acc;
    }, {});

    const firedRuleNames = new Set(Object.keys(eventsByRule));
    const rulesNeverFired = (model.reactionRules ?? [])
      .map((rule, idx) => resolveRuleName(rule, idx))
      .filter((ruleName) => !firedRuleNames.has(ruleName));

    const trace: NetworkTrace = {
      startedAt: traceStart,
      finishedAt: traceFinished,
      durationMs: traceFinished - traceStart,
      events,
      eventsByRule,
      totalEvents: events.length,
      totalSpeciesGenerated: output.species.length,
      totalReactionsGenerated: output.reactions.length,
      rulesNeverFired,
    };

    return {
      network,
      trace,
    };
  }

  private resolveRateConstant(model: BNGLModel, raw: string | undefined): number {
    if (!raw) {
      return 0;
    }
    const fromParams = model.parameters?.[raw];
    if (typeof fromParams === 'number' && !Number.isNaN(fromParams)) {
      return fromParams;
    }
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
    return 0;
  }
}
