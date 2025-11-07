import type { BNGLModel } from '../../../types';

type Validator = (model: BNGLModel | null) => boolean;

export interface TutorialCheckCondition {
  validate: Validator;
  hint?: string;
  explanation?: string;
}

export interface TutorialStep {
  stepNumber: number;
  instruction: string;
  objective: string;
  check: TutorialCheckCondition;
  starterCode?: string;
  canSkip?: boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  steps: TutorialStep[];
  learningOutcomes?: string[];
}

const hasMolecule = (model: BNGLModel | null, name: string): boolean => {
  if (!model) return false;
  return (model.moleculeTypes ?? []).some((mol) => mol.name === name);
};

const hasObservable = (model: BNGLModel | null, name: string, query: RegExp): boolean => {
  if (!model) return false;
  return (model.observables ?? []).some((obs) => obs.name === name && query.test(obs.pattern));
};

const tutorialLigandReceptor: Tutorial = {
  id: 'ligand-receptor-binding',
  title: 'Ligand-Receptor Binding',
  description: 'Create a simple model where a ligand binds its receptor and monitor binding coverage.',
  difficulty: 'beginner',
  estimatedMinutes: 10,
  learningOutcomes: [
    'Define molecule types with components and states',
    'Seed initial species counts',
    'Write binding rules',
    'Add observables to track binding state',
  ],
  steps: [
    {
      stepNumber: 1,
      instruction: `### Step 1: Declare molecule types

Add a **Ligand** with one binding site and a **Receptor** with a ligand site and phosphorylation state.

\`\`\`
begin molecule types
  Ligand(r)
  Receptor(lig,phos~U~P)
end molecule types
\`\`\``,
      objective: 'Define Ligand and Receptor molecule types',
      check: {
        validate: (model) => hasMolecule(model, 'Ligand') && hasMolecule(model, 'Receptor'),
        hint: 'Ensure both molecule types appear with the expected components.',
      },
      starterCode: `begin model

begin molecule types
end molecule types

begin seed species
end seed species

begin reaction rules
end reaction rules

end model`,
    },
    {
      stepNumber: 2,
      instruction: `### Step 2: Provide seed species

Seed 100 Ligand molecules and 50 Receptor molecules in the unbound state.

\`\`\`
begin seed species
  Ligand(r) 100
  Receptor(lig,phos~U) 50
end seed species
\`\`\``,
      objective: 'Define initial species counts',
      check: {
        validate: (model) => {
          if (!model) return false;
          const lig = (model.species ?? []).find((s) => s.name.includes('Ligand'));
          const rec = (model.species ?? []).find((s) => s.name.includes('Receptor'));
          return Boolean(lig && lig.initialConcentration > 0 && rec && rec.initialConcentration > 0);
        },
        hint: 'Add Ligand(r) and Receptor(lig,phos~U) with positive counts.',
      },
    },
    {
      stepNumber: 3,
      instruction: `### Step 3: Add a binding rule

Bind Ligand to Receptor via a bond label (use !1).

\`\`\`
begin reaction rules
  LigandBind: Ligand(r) + Receptor(lig) -> Ligand(r!1).Receptor(lig!1) 1e-3
end reaction rules
\`\`\``,
      objective: 'Create the binding reaction rule',
      check: {
        validate: (model) => {
          if (!model) return false;
          return (model.reactionRules ?? []).some((rule) => {
            return (
              rule.name === 'LigandBind' &&
              rule.reactants.some((r) => r.includes('Ligand')) &&
              rule.reactants.some((r) => r.includes('Receptor')) &&
              rule.products.some((p) => p.includes('!1'))
            );
          });
        },
        hint: 'Ensure reactants are unbound and the product uses matching !1 bonds.',
      },
    },
    {
      stepNumber: 4,
      instruction: `### Step 4: Track bound and free receptors

Add observables:

- **LigandBound**: Ligand with any bond on r (\`Ligand(r!?)\`)
- **FreeReceptor**: Receptor with unbound lig site (\`Receptor(lig)\`)
`,
      objective: 'Create observables that monitor binding',
      check: {
        validate: (model) => hasObservable(model, 'LigandBound', /r!\?/i) && hasObservable(model, 'FreeReceptor', /Receptor\(lig\)/i),
        hint: 'Use \`Ligand(r!?)\` for bound ligand and \`Receptor(lig)\` for free receptor.',
      },
    },
    {
      stepNumber: 5,
      instruction: `### Step 5: Run and explore

Simulate the model and observe how bound ligand increases while free receptor decreases. Try experimenting with the binding rate or adding an unbinding rule to explore reversibility.`,
      objective: 'Simulate and explore variations',
      check: { validate: () => true },
      canSkip: true,
    },
  ],
};

const tutorialMapKCascade: Tutorial = {
  id: 'mapk-cascade',
  title: 'MAPK Cascade',
  description: 'Model a two-layer phosphorylation cascade and explore activation patterns.',
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  learningOutcomes: [
    'Model multi-step cascades with shared structure',
    'Use phosphorylation states to encode activation',
    'Capture observables that differentiate active/inactive pools',
  ],
  steps: [
    {
      stepNumber: 1,
      instruction: `### Step 1: Declare kinase molecule types

Create MAPKKK, MAPKK, and MAPK with a phosphorylation site that toggles between U and P.`,
      objective: 'Add three kinase molecule types',
      check: {
        validate: (model) => hasMolecule(model, 'MAPKKK') && hasMolecule(model, 'MAPKK') && hasMolecule(model, 'MAPK'),
        hint: 'Each molecule should declare \`phos~U~P\`.',
      },
    },
    {
      stepNumber: 2,
      instruction: `### Step 2: Seed inactive kinases

Provide initial unphosphorylated species counts for each kinase.`,
      objective: 'Seed inactive species',
      check: {
        validate: (model) => {
          if (!model) return false;
          const names = ['MAPKKK', 'MAPKK', 'MAPK'];
          return names.every((name) => (model.species ?? []).some((s) => s.name.startsWith(`${name}(`)));
        },
        hint: 'Ensure each kinase has a seed species entry.',
      },
    },
  ],
};

export const TUTORIALS: Tutorial[] = [tutorialLigandReceptor, tutorialMapKCascade];

export interface TutorialProgressState {
  currentStepIndex: number;
  completedSteps: number[];
}
