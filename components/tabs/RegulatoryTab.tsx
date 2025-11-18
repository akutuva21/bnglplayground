import React, { useEffect, useMemo, useState } from 'react';
import { BNGLModel, SimulationResults } from '../../types';
import { ContactMapViewer } from '../ContactMapViewer';
import { ARGraphViewer } from '../ARGraphViewer';
import { RuleFlowViewer } from '../RuleFlowViewer';
import { ResultsChart } from '../ResultsChart';
import { buildContactMap } from '../../services/visualization/contactMapBuilder';
import { buildAtomRuleGraph } from '../../services/visualization/arGraphBuilder';
import { buildRuleFlowGraph } from '../../services/visualization/ruleFlowBuilder';
import { buildRegulatoryInsights } from '../../services/visualization/regulatoryInsights';
import { classifyRuleChanges } from '../../services/ruleAnalysis/ruleChangeClassifier';
import type { RuleChangeSummary } from '../../services/ruleAnalysis/ruleChangeTypes';
import { RuleChangeBadges, renderHumanSummary } from '../RuleChangeBadges';

interface RegulatoryTabProps {
  model: BNGLModel | null;
  results: SimulationResults | null;
  selectedRuleId?: string | null;
  onSelectRule?: (ruleId: string) => void;
}

const getRuleId = (rule: { name?: string }, index: number): string => rule.name ?? `rule_${index + 1}`;
const getRuleLabel = (rule: { name?: string }, index: number): string => rule.name ?? `Rule ${index + 1}`;

type ViewMode = 'graph' | 'time';

export const RegulatoryTab: React.FC<RegulatoryTabProps> = ({ model, results, selectedRuleId, onSelectRule }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [overlaySpecies, setOverlaySpecies] = useState<Set<string>>(new Set());
  const [highlightedSeries, setHighlightedSeries] = useState<string[]>([]);

  const insights = useMemo(() => buildRegulatoryInsights(model), [model]);

  const ruleClassifications = useMemo(() => {
    if (!model) {
      return {} as Record<string, RuleChangeSummary>;
    }
    return model.reactionRules.reduce((acc, rule, index) => {
      const ruleId = getRuleId(rule, index);
      const ruleName = getRuleLabel(rule, index);
      try {
        acc[ruleId] = classifyRuleChanges(rule, { ruleId, ruleName });
      } catch (error) {
        console.warn('Failed to classify rule', ruleId, error);
      }
      return acc;
    }, {} as Record<string, RuleChangeSummary>);
  }, [model]);

  const contactMap = useMemo(() => {
    if (!model) {
      return { nodes: [], edges: [] };
    }
    return buildContactMap(model.reactionRules, {
      getRuleId,
      getRuleLabel,
    });
  }, [model]);

  const atomRuleGraph = useMemo(() => {
    if (!model) {
      return { nodes: [], edges: [] };
    }
    return buildAtomRuleGraph(model.reactionRules, {
      getRuleId,
      getRuleLabel,
    });
  }, [model]);

  const ruleFlowGraph = useMemo(() => {
    if (!model) {
      return { nodes: [], edges: [] };
    }
    return buildRuleFlowGraph(model.reactionRules, {
      getRuleId,
      getRuleLabel,
    });
  }, [model]);

  useEffect(() => {
    if (!insights || !selectedRuleId) {
      setSelectedAtomId(null);
      return;
    }

    const impact = insights.ruleImpacts[selectedRuleId];
    if (!impact) {
      setSelectedAtomId(null);
      return;
    }

    const priority = [...impact.produces, ...impact.modifies, ...impact.consumes];
    if (priority.length === 0) {
      setSelectedAtomId(null);
      return;
    }

    setSelectedAtomId((current) => {
      if (current && priority.includes(current)) {
        return current;
      }
      return priority[0];
    });
  }, [insights, selectedRuleId]);

  useEffect(() => {
    if (!results) {
      setOverlaySpecies(new Set());
      setHighlightedSeries([]);
      return;
    }

    const initial = new Set(results.headers.filter((header) => header !== 'time'));
    setOverlaySpecies(initial);
  }, [results]);

  const atomObservables = useMemo(() => {
    if (!insights || !selectedAtomId) {
      return [] as string[];
    }
    return insights.atomToObservables[selectedAtomId] ?? [];
  }, [insights, selectedAtomId]);

  const observablesKey = atomObservables.join('|');

  useEffect(() => {
    if (!results) {
      setHighlightedSeries([]);
      return;
    }

    setHighlightedSeries(atomObservables);
    if (atomObservables.length === 0) {
      return;
    }

    setOverlaySpecies((prev) => {
      const next = new Set(prev);
      atomObservables.forEach((observable) => {
        if (results.headers.includes(observable)) {
          next.add(observable);
        }
      });
      const sanitized = new Set(Array.from(next).filter((name) => name !== 'time' && results.headers.includes(name)));
      const unchanged = sanitized.size === prev.size && Array.from(sanitized).every((name) => prev.has(name));
      return unchanged ? prev : sanitized;
    });
  }, [observablesKey, results]);

  const selectedRuleImpact = selectedRuleId && insights ? insights.ruleImpacts[selectedRuleId] : null;
  const selectedRuleClassification = selectedRuleId ? ruleClassifications[selectedRuleId] : null;
  const selectedRuleComment = selectedRuleId && model ? model.reactionRules.find((r, i) => getRuleId(r, i) === selectedRuleId)?.comment : null;
  const selectedAtomMeta = selectedAtomId && insights ? insights.atomMetadata[selectedAtomId] : null;
  const atomSpecies = selectedAtomId && insights ? insights.atomToSpecies[selectedAtomId] ?? [] : [];
  const atomUsage = selectedAtomId && insights ? insights.atomRuleUsage[selectedAtomId] : undefined;

  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to inspect regulatory structure.</div>;
  }

  if (model.reactionRules.length === 0) {
    return <div className="text-slate-500 dark:text-slate-400">This model has no reaction rules to analyse.</div>;
  }

  const renderAtomList = (atoms: string[], label: string, accent: string) => (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {atoms.map((atom) => (
          <button
            key={atom}
            type="button"
            onClick={() => setSelectedAtomId(atom)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              selectedAtomId === atom
                ? `${accent} border-transparent text-white`
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {insights?.atomMetadata[atom]?.label ?? atom}
          </button>
        ))}
        {atoms.length === 0 && <span className="text-xs text-slate-400">—</span>}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selectedRuleImpact ? selectedRuleImpact.label : 'Select a rule'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Follow how a rule manipulates structural atoms, then inspect their time courses.
            </p>
            {selectedRuleClassification && (
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <RuleChangeBadges summary={selectedRuleClassification} size="xs" />
                <p className="mt-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300">
                  {renderHumanSummary(selectedRuleClassification)}
                </p>
              </div>
            )}
            {selectedRuleComment && (
              <div className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">{selectedRuleComment}</div>
            )}
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`rounded-md px-3 py-1 ${viewMode === 'graph' ? 'bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Regulatory Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('time')}
              className={`rounded-md px-3 py-1 ${viewMode === 'time' ? 'bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Time-Course Overlay
            </button>
          </div>
        </div>

        {selectedRuleImpact && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {renderAtomList(selectedRuleImpact.produces, 'Produces', 'bg-emerald-500')}
            {renderAtomList(selectedRuleImpact.modifies, 'Modifies', 'bg-sky-500')}
            {renderAtomList(selectedRuleImpact.consumes, 'Consumes', 'bg-amber-500')}
          </div>
        )}

        {selectedAtomMeta && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Focused atom:</span>
              <span className="rounded bg-sky-100 px-2 py-0.5 font-mono text-[11px] text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                {selectedAtomMeta.label}
              </span>
              {atomSpecies.length > 0 && (
                <span className="text-slate-500 dark:text-slate-400">Seen in {atomSpecies.length} species</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
              {atomObservables.length > 0 ? (
                <span>
                  Linked observables:{' '}
                  {atomObservables.map((obs) => (
                    <span key={obs} className="ml-1 rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                      {obs}
                    </span>
                  ))}
                </span>
              ) : (
                <span>No observables track this atom yet.</span>
              )}
              {atomUsage && (
                <span>
                  Influenced by rules:{' '}
                  {[...atomUsage.produces, ...atomUsage.modifies, ...atomUsage.consumes]
                    .slice(0, 6)
                    .map((ruleId) => (
                      <button
                        key={ruleId}
                        type="button"
                        onClick={() => onSelectRule?.(ruleId)}
                        className="ml-1 rounded border border-slate-300 px-2 py-0.5 font-medium text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                      >
                        {insights?.ruleImpacts[ruleId]?.label ?? ruleId}
                      </button>
                    ))}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {viewMode === 'graph' ? (
        <div className="space-y-8">
          <section>
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contact Map</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Molecule types that can interact. Click an edge to jump to a representative rule.</p>
            </div>
            <ContactMapViewer contactMap={contactMap} selectedRuleId={selectedRuleId} onSelectRule={onSelectRule} />
          </section>
          <section className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Atom–Rule Graph</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bipartite graph linking structural atoms to the rules that consume, modify, or produce them.</p>
              </div>
              <ARGraphViewer
                arGraph={atomRuleGraph}
                selectedRuleId={selectedRuleId}
                selectedAtomId={selectedAtomId}
                onSelectRule={onSelectRule}
                onSelectAtom={setSelectedAtomId}
              />
            </div>
            <div>
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rule Flow</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Layered DAG connecting rules when one produces structures the next rule needs.</p>
              </div>
              <RuleFlowViewer graph={ruleFlowGraph} selectedRuleId={selectedRuleId} onSelectRule={onSelectRule} />
            </div>
          </section>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {results ? (
              atomObservables.length > 0 ? (
                <p>
                  Highlighting observables that involve <span className="font-mono text-xs">{selectedAtomMeta?.label ?? selectedAtomId}</span>.
                  Lines remain toggleable so you can compare with other observables.
                </p>
              ) : (
                <p>
                  No observables currently report this atom. Add an observable containing its molecules/states to see it in the time-course overlay.
                </p>
              )
            ) : (
              <p>Run a simulation to populate time courses and compare them against the regulatory graph.</p>
            )}
          </div>
          {results ? (
            <ResultsChart
              results={results}
              model={model}
              visibleSpecies={overlaySpecies}
              onVisibleSpeciesChange={setOverlaySpecies}
              highlightedSeries={highlightedSeries}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Run a simulation to enable the time-course overlay.
            </div>
          )}
        </section>
      )}
    </div>
  );
};
