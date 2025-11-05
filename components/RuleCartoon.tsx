import React, { useMemo } from 'react';
import type {
  VisualizationComponentRole,
  VisualizationMolecule,
  VisualizationRule,
} from '../types/visualization';

interface MoleculeVisualizerProps {
  molecule: VisualizationMolecule;
  showBondLabels?: boolean;
}

const roleClasses: Record<VisualizationComponentRole, string> = {
  context: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200',
  transformed: 'border-orange-400 bg-orange-100 text-orange-900 dark:border-orange-400 dark:bg-orange-900/40 dark:text-orange-200',
  created: 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-200',
};

const MoleculeVisualizer: React.FC<MoleculeVisualizerProps> = ({ molecule, showBondLabels = true }) => (
  <div className="flex w-44 flex-col items-center gap-2 rounded-lg border-2 border-slate-300 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-slate-800">
    <div className="w-full border-b border-slate-200 pb-1 text-center text-sm font-semibold text-primary dark:border-slate-700 dark:text-primary-300">
      {molecule.name}
    </div>
    <div className="flex flex-wrap items-center justify-center gap-1">
      {molecule.components.map((component, index) => {
        const hasState = Boolean(component.state);
        const role = component.role ?? 'context';
        const baseClass = roleClasses[role];

        return (
          <div key={`${component.name}-${index}`} className={`rounded-md border px-2 py-1 text-xs ${baseClass}`}>
            <span className="font-semibold">{component.name}</span>
            {hasState && <span className="ml-1 text-slate-600 dark:text-slate-300">~{component.state}</span>}
            {showBondLabels && component.bondLabel && (
              <span className="ml-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">{component.bondLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

interface ComplexVisualizerProps {
  complex: VisualizationMolecule[];
  showBondLabels?: boolean;
}

const ComplexVisualizer: React.FC<ComplexVisualizerProps> = ({ complex, showBondLabels }) => (
  <div className="flex flex-wrap items-center gap-2">
    {complex.map((molecule, index) => (
      <React.Fragment key={`${molecule.name}-${index}`}>
        <MoleculeVisualizer molecule={molecule} showBondLabels={showBondLabels} />
        {index < complex.length - 1 && <span className="text-xl text-slate-400">•</span>}
      </React.Fragment>
    ))}
  </div>
);

type AnnotatedVisualization = {
  reactants: VisualizationMolecule[][];
  products: VisualizationMolecule[][];
};

const cloneMolecule = (
  molecule: VisualizationMolecule,
  defaultRole: VisualizationComponentRole
): VisualizationMolecule => ({
  ...molecule,
  components: molecule.components.map((component) => ({
    ...component,
    role: component.role ?? defaultRole,
  })),
});

const annotateRule = (rule: VisualizationRule): AnnotatedVisualization => {
  const annotatedReactants = rule.reactants.map((complex) =>
    complex.map((molecule) => cloneMolecule(molecule, 'context'))
  );
  const annotatedProducts = rule.products.map((complex) =>
    complex.map((molecule) => cloneMolecule(molecule, 'created'))
  );

  annotatedReactants.forEach((complex, complexIdx) => {
    const productComplex = annotatedProducts[complexIdx] ?? [];
    const productUsage = new Set<number>();

    complex.forEach((molecule, moleculeIdx) => {
      const annotatedReactant = annotatedReactants[complexIdx][moleculeIdx];
      const productMatchIdx = productComplex.findIndex((candidate, candidateIdx) => {
        if (productUsage.has(candidateIdx)) {
          return false;
        }
        return candidate.name === molecule.name;
      });

      if (productMatchIdx === -1) {
        annotatedReactant.components = annotatedReactant.components.map((component) => ({
          ...component,
          role: 'transformed',
        }));
        return;
      }

      productUsage.add(productMatchIdx);
      const annotatedProduct = productComplex[productMatchIdx];
      const productComponentUsage = new Set<number>();

      annotatedReactant.components = annotatedReactant.components.map((component) => {
        const candidateIdx = annotatedProduct.components.findIndex((candidate, idx) => {
          if (productComponentUsage.has(idx)) {
            return false;
          }
          return candidate.name === component.name;
        });

        if (candidateIdx === -1) {
          return { ...component, role: 'transformed' };
        }

        productComponentUsage.add(candidateIdx);
        const productComponent = annotatedProduct.components[candidateIdx];
        const stateChanged = (component.state ?? '') !== (productComponent.state ?? '');
        const bondChanged = (component.bondLabel ?? '') !== (productComponent.bondLabel ?? '');
        const role: VisualizationComponentRole = stateChanged || bondChanged ? 'transformed' : 'context';

        annotatedProduct.components[candidateIdx] = {
          ...productComponent,
          role: role === 'context' ? 'context' : 'transformed',
        };

        return { ...component, role };
      });

      annotatedProduct.components = annotatedProduct.components.map((component, idx) => {
        if (!productComponentUsage.has(idx)) {
          return { ...component, role: component.role ?? 'created' };
        }
        if (component.role === 'transformed') {
          return component;
        }
        return { ...component, role: component.role ?? 'context' };
      });
    });
  });

  return {
    reactants: annotatedReactants,
    products: annotatedProducts,
  };
};

interface RuleCartoonProps {
  ruleId: string;
  displayName: string;
  rule: VisualizationRule;
  isSelected?: boolean;
  onSelect?: (ruleId: string) => void;
  showBondLabels?: boolean;
}

export const RuleCartoon: React.FC<RuleCartoonProps> = ({
  ruleId,
  displayName,
  rule,
  isSelected = false,
  onSelect,
  showBondLabels = true,
}) => {
  const annotated = useMemo(() => annotateRule(rule), [rule]);

  const containerClasses = `w-full rounded-lg border bg-slate-50 p-4 text-left transition dark:bg-slate-900 ${
    isSelected
      ? 'border-sky-500 ring-2 ring-offset-2 ring-sky-500 dark:border-sky-400 dark:ring-offset-slate-900'
      : 'border-stone-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
  }`;

  const handleSelect = () => {
    onSelect?.(ruleId);
  };

  return (
    <button type="button" className={containerClasses} onClick={handleSelect}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayName}</span>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{rule.rate}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {annotated.reactants.map((complex, index) => (
            <React.Fragment key={`reactant-${index}`}>
              <ComplexVisualizer complex={complex} showBondLabels={showBondLabels} />
              {index < annotated.reactants.length - 1 && (
                <span className="text-2xl font-light text-slate-400">+</span>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400">
          <svg className="h-6 w-16" viewBox="0 0 64 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 12H60M60 12L52 4M60 12L52 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {rule.isBidirectional && rule.reverseRate && (
            <>
              <svg className="h-6 w-16 rotate-180" viewBox="0 0 64 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M2 12H60M60 12L52 4M60 12L52 20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{rule.reverseRate}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {annotated.products.map((complex, index) => (
            <React.Fragment key={`product-${index}`}>
              <ComplexVisualizer complex={complex} showBondLabels={showBondLabels} />
              {index < annotated.products.length - 1 && (
                <span className="text-2xl font-light text-slate-400">+</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </button>
  );
};

export const EnhancedRuleCartoon = RuleCartoon;
