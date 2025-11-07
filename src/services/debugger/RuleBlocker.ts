import type { BNGLModel, BNGLObservable, ReactionRule } from '../../../types';
import type { Atom, DebuggerNetwork, RuleBlockerReport, RuleBlockerDetails, RuleBlockerSuggestion } from './types';

const COMPONENT_REGEX = /(\w+)(?:~([A-Za-z0-9_]+))?(?:!([0-9+?]+))?/;

const dedupeAtoms = (atoms: Atom[]): Atom[] => {
  const seen = new Map<string, Atom>();
  for (const atom of atoms) {
    const key = JSON.stringify(atom);
    if (!seen.has(key)) {
      seen.set(key, atom);
    }
  }
  return Array.from(seen.values());
};

const describeAtom = (atom: Atom): string => {
  switch (atom.kind) {
    case 'molecule':
      return `Molecule ${atom.molecule}`;
    case 'componentState':
      return atom.state ? `${atom.molecule}.${atom.component}~${atom.state}` : `${atom.molecule}.${atom.component}`;
    case 'bond':
      return `${atom.molecule}.${atom.component} bound`;
    default:
      return atom.molecule;
  }
};

const atomExample = (atom: Atom): string => {
  switch (atom.kind) {
    case 'molecule':
      return `${atom.molecule}()`;
    case 'componentState':
      return atom.state ? `${atom.molecule}(${atom.component}~${atom.state})` : `${atom.molecule}(${atom.component})`;
    case 'bond':
      return `${atom.molecule}(${atom.component}!1).Partner(site!1)`;
    default:
      return atom.molecule;
  }
};

const atomQueryString = (atom: Atom): string => {
  switch (atom.kind) {
    case 'molecule':
      return `${atom.molecule}(`;
    case 'componentState':
      return atom.state ? `${atom.molecule}(${atom.component}~${atom.state}` : `${atom.molecule}(${atom.component}`;
    case 'bond':
      return `${atom.molecule}(${atom.component}!`;
    default:
      return atom.molecule;
  }
};

const collectAtomsFromPattern = (pattern: string): Atom[] => {
  const atoms: Atom[] = [];
  const molecules = pattern.split('+').map((segment) => segment.trim()).filter(Boolean);

  for (const molecule of molecules) {
    const match = molecule.match(/(\w+)\(([^)]*)\)/);
    if (!match) {
      atoms.push({ kind: 'molecule', molecule: molecule });
      continue;
    }
    const [, moleculeName, rawComponents] = match;
    atoms.push({ kind: 'molecule', molecule: moleculeName });

    const componentParts = rawComponents.split(',').map((part) => part.trim()).filter(Boolean);

    for (const component of componentParts) {
      const compMatch = component.match(COMPONENT_REGEX);
      if (!compMatch) {
        continue;
      }
      const [, componentName, state, bond] = compMatch;
      atoms.push({
        kind: 'componentState',
        molecule: moleculeName,
        component: componentName,
        state: state,
      });
      if (bond && bond !== '?' && bond !== '+') {
        atoms.push({
          kind: 'bond',
          molecule: moleculeName,
          component: componentName,
          bondLabel: bond,
        });
      }
    }
  }

  return dedupeAtoms(atoms);
};

const speciesContainsAtom = (speciesName: string, atom: Atom): boolean => {
  if (!speciesName) {
    return false;
  }
  switch (atom.kind) {
    case 'molecule':
      return speciesName.includes(`${atom.molecule}(`) || speciesName === atom.molecule;
    case 'componentState': {
      if (!atom.component) {
        return false;
      }
      if (atom.state) {
        const regex = new RegExp(`${atom.molecule}\\([^)]*${atom.component}~${atom.state}`);
        return regex.test(speciesName);
      }
      const regex = new RegExp(`${atom.molecule}\\([^)]*${atom.component}(?![!~])`);
      return regex.test(speciesName);
    }
    case 'bond': {
      if (!atom.component) {
        return false;
      }
      const regex = new RegExp(`${atom.molecule}\\([^)]*${atom.component}!\\d`);
      return regex.test(speciesName);
    }
    default:
      return false;
  }
};

const atomExistsInNetwork = (network: DebuggerNetwork, atom: Atom): boolean => {
  return network.asModel.species.some((species) => speciesContainsAtom(species.name, atom));
};

const buildReportRow = (reactantPattern: string, reactantIndex: number, network: DebuggerNetwork): RuleBlockerDetails => {
  const requiredAtoms = collectAtomsFromPattern(reactantPattern);
  const missing = requiredAtoms.filter((atom) => !atomExistsInNetwork(network, atom));
  return {
    reactantIndex,
    pattern: reactantPattern,
    missing,
  };
};

const collectSuggestions = (
  blockers: RuleBlockerDetails[],
  allRules: ReactionRule[],
  observables: BNGLObservable[]
): RuleBlockerSuggestion[] => {
  const suggestions: RuleBlockerSuggestion[] = [];
  const seen = new Set<string>();

  for (const blocker of blockers) {
    for (const atom of blocker.missing) {
      const description = describeAtom(atom);
      if (seen.has(description)) {
        continue;
      }
      seen.add(description);

      const query = atomQueryString(atom);
      const createdByRules = allRules
        .filter((rule) => rule.products.some((product) => product.includes(query)))
        .map((rule, index) => resolveRuleName(rule, index));

      const mentionedInObservables = observables.some((observable) => observable.pattern.includes(query));

      suggestions.push({
        atomDescription: description,
        createdByRules,
        mentionedInObservables,
      });
    }
  }

  return suggestions;
};

const resolveRuleName = (rule: ReactionRule, index: number): string => {
  if (rule.name && rule.name.trim()) {
    return rule.name.trim();
  }
  const lhs = rule.reactants.join(' + ');
  const rhs = rule.products.join(' + ');
  if (lhs && rhs) {
    return `${lhs}->${rhs}`;
  }
  return `rule_${index + 1}`;
};

export class RuleBlocker {
  static explain(
    rule: ReactionRule,
    context: {
      expandedNetwork: DebuggerNetwork;
      model: BNGLModel;
    }
  ): RuleBlockerReport {
    const reactants = rule.reactants ?? [];
    const blockers = reactants.map((pattern, index) => buildReportRow(pattern, index, context.expandedNetwork));

    const flattened = blockers.flatMap((entry) => entry.missing);

    const suggestions = flattened.length
      ? collectSuggestions(blockers, context.model.reactionRules ?? [], context.model.observables ?? [])
      : [];

    return {
      ruleName: resolveRuleName(rule, 0),
      blockers,
      suggestions,
    };
  }
}
