import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { Header } from './components/Header';
import { exportToSBML } from './services/exportSBML';
import { StatusMessage } from './components/ui/StatusMessage';
import { AboutModal } from './components/AboutModal';
import { VisualizationConventionsModal } from './components/VisualizationConventionsModal';
import { bnglService } from './services/bnglService';
import { BNGLModel, SimulationOptions, SimulationResults, Status, ValidationWarning, EditorMarker } from './types';
import { INITIAL_BNGL_CODE } from './constants';
import SimulationModal from './components/SimulationModal';
import { validateBNGLModel, validationWarningsToMarkers } from './services/modelValidation';
import { TutorialModal } from './components/modals/TutorialModal';
import { TUTORIALS, type TutorialProgressState } from './src/data/tutorials';

function App() {
  const PANEL_MAX_HEIGHT = 'calc(100vh - 220px)';
  const [code, setCode] = useState<string>(INITIAL_BNGL_CODE);
  const [model, setModel] = useState<BNGLModel | null>(null);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [progressStats, setProgressStats] = useState<{ species: number; reactions: number; iteration: number }>({ species: 0, reactions: 0, iteration: 0 });
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [aboutFocus, setAboutFocus] = useState<string | null>(null);
  const [isVizModalOpen, setIsVizModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [activeVizTab, setActiveVizTab] = useState<number>(0);
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [tutorialProgress, setTutorialProgress] = useState<Record<string, TutorialProgressState>>({});
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [editorMarkers, setEditorMarkers] = useState<EditorMarker[]>([]);
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null);

  const [editorSelection, setEditorSelection] = useState<{ startLineNumber: number; endLineNumber: number } | undefined>(undefined);

  const parseAbortRef = useRef<AbortController | null>(null);
  const simulateAbortRef = useRef<AbortController | null>(null);

  // Ensure the worker is terminated if the app component is ever unmounted (e.g. during HMR or tab close)
  useEffect(() => {
    return () => {
      try {
        bnglService.terminate('App unmounted');
      } catch (err) {
        // swallow errors during teardown
        // eslint-disable-next-line no-console
        console.warn('Error terminating bnglService on App unmount', err);
      }
    };
  }, []);

  const findRuleLine = useCallback((code: string, ruleIndex: number, rule: any): number => {
    const lines = code.split('\n');
    let rulesBlockStart = -1;

    // Find begin reaction rules
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('begin reaction rules')) {
        rulesBlockStart = i;
        break;
      }
    }

    if (rulesBlockStart === -1) return -1;

    // Simple heuristic: assume rules are in order after the block start
    // Skip comments and empty lines
    let currentRuleIndex = 0;
    for (let i = rulesBlockStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('end reaction rules')) break;
      if (!line || line.startsWith('#')) continue;

      if (currentRuleIndex === ruleIndex) {
        return i + 1; // 1-based line number
      }
      currentRuleIndex++;
    }

    return -1;
  }, []);

  const handleSelectRule = useCallback((ruleId: string) => {
    if (!model) return;

    // Extract index from "rule_N"
    const match = ruleId.match(/rule_(\d+)/);
    if (match) {
      const index = parseInt(match[1], 10);
      if (!isNaN(index) && index >= 0 && index < model.reactions.length) {
        const line = findRuleLine(code, index, model.reactions[index]);
        if (line !== -1) {
          setEditorSelection({
            startLineNumber: line,
            endLineNumber: line,
          });
        }
      }
    }
  }, [code, model, findRuleLine]);

  const handleParse = useCallback(async () => {
    setResults(null);
    if (parseAbortRef.current) {
      parseAbortRef.current.abort('Parse request replaced.');
    }
    const controller = new AbortController();
    parseAbortRef.current = controller;
    try {
      const parsedModel = await bnglService.parse(code, {
        signal: controller.signal,
        description: 'Parse BNGL model',
      });
      setModel(parsedModel);
      const warnings = validateBNGLModel(parsedModel);
      setValidationWarnings(warnings);
      setEditorMarkers(validationWarningsToMarkers(code, warnings));
      const hasErrors = warnings.some((warning) => warning.severity === 'error');
      setStatus({ type: hasErrors ? 'warning' : 'success', message: hasErrors ? 'Model parsed with validation issues. Review the warnings panel.' : 'Model parsed successfully!' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setModel(null);
      setValidationWarnings([]);
      setEditorMarkers([]);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatus({ type: 'error', message: `Parsing failed: ${message}` });
    } finally {
      if (parseAbortRef.current === controller) {
        parseAbortRef.current = null;
      }
    }
  }, [code]);

  const handleSimulate = useCallback(async (options: SimulationOptions) => {
    if (!model) {
      setStatus({ type: 'warning', message: 'Please parse a model before simulating.' });
      return;
    }
    // Estimate complexity and warn user for large models
    const estimateComplexity = (m: BNGLModel): number => {
      const ruleCount = m.reactions?.length ?? 0;
      const seedCount = m.species?.length ?? 0;
      const molTypeCount = m.moleculeTypes?.length ?? 0;
      // Heuristic: seeds × rules^1.5 × molTypes
      return seedCount * Math.pow(Math.max(1, ruleCount), 1.5) * Math.max(1, molTypeCount);
    };

    const complexity = estimateComplexity(model);
    if (complexity > 150) {
      const proceed = window.confirm(
        `⚠️ Large Model Detected\n\n` +
        `Complexity score: ${Math.round(complexity)}\n` +
        `• ${model.reactions.length} rules\n` +
        `• ${model.species.length} seed species\n` +
        `• ${model.moleculeTypes.length} molecule types\n\n` +
        `Network generation may take 30-60 seconds. Continue?`
      );
      if (!proceed) return;
    }
    if (simulateAbortRef.current) {
      simulateAbortRef.current.abort('Simulation replaced.');
    }
    const controller = new AbortController();
    simulateAbortRef.current = controller;
    setIsSimulating(true);
    try {
      const simResults = await bnglService.simulate(model, options, {
        signal: controller.signal,
        description: `Simulation (${options.method})`,
      });
      setResults(simResults);
      setStatus({
        type: 'success', message: (
          <span>
            Simulation ({options.method}) completed.&nbsp;
            Explore: <button className="underline" onClick={() => setActiveVizTab(0)}>Time Courses</button>,{' '}
            <button className="underline" onClick={() => setActiveVizTab(1)}>Regulatory</button>,{' '}
            <button className="underline" onClick={() => setActiveVizTab(4)}>FIM</button>,{' '}
            <button className="underline" onClick={() => setActiveVizTab(5)}>Steady State</button>
          </span>
        )
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User cancelled - status already set by handleCancelSimulation
        // Just ensure results are cleared
        setResults(null);
        return;
      }
      setResults(null);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatus({ type: 'error', message: `Simulation failed: ${message}` });
    } finally {
      if (simulateAbortRef.current === controller) {
        simulateAbortRef.current = null;
      }
      setIsSimulating(false);
    }
  }, [model]);

  const handleCancelSimulation = useCallback(() => {
    if (simulateAbortRef.current) {
      simulateAbortRef.current.abort('Simulation cancelled by user.');
      simulateAbortRef.current = null;
    }
    // Force reset state immediately when user cancels
    setIsSimulating(false);
    setGenerationProgress('');
    setProgressStats({ species: 0, reactions: 0, iteration: 0 });
    setStatus({ type: 'info', message: 'Simulation cancelled.' });
  }, []);

  const ensureTutorialEntry = useCallback((tutorialId: string, prev: Record<string, TutorialProgressState>): TutorialProgressState => {
    return prev[tutorialId] ?? { currentStepIndex: 0, completedSteps: [] };
  }, []);

  const handleSelectTutorial = useCallback((tutorialId: string) => {
    setActiveTutorialId(tutorialId);
    setTutorialProgress((prev) => {
      if (prev[tutorialId]) {
        return prev;
      }
      return {
        ...prev,
        [tutorialId]: { currentStepIndex: 0, completedSteps: [] },
      };
    });
  }, []);

  const handleSetTutorialStep = useCallback((tutorialId: string, stepIndex: number) => {
    setTutorialProgress((prev) => {
      const entry = ensureTutorialEntry(tutorialId, prev);
      const sanitizedIndex = Math.max(0, stepIndex);
      return {
        ...prev,
        [tutorialId]: {
          ...entry,
          currentStepIndex: sanitizedIndex,
        },
      };
    });
  }, [ensureTutorialEntry]);

  const handleCompleteTutorialStep = useCallback((tutorialId: string, stepNumber: number) => {
    setTutorialProgress((prev) => {
      const entry = ensureTutorialEntry(tutorialId, prev);
      if (entry.completedSteps.includes(stepNumber)) {
        return prev;
      }
      return {
        ...prev,
        [tutorialId]: {
          ...entry,
          completedSteps: [...entry.completedSteps, stepNumber],
        },
      };
    });
  }, [ensureTutorialEntry]);

  const handleResetTutorial = useCallback((tutorialId: string) => {
    setTutorialProgress((prev) => ({
      ...prev,
      [tutorialId]: { currentStepIndex: 0, completedSteps: [] },
    }));
  }, []);

  useEffect(() => {
    if (!isTutorialModalOpen) return;
    if (!activeTutorialId && TUTORIALS.length > 0) {
      setActiveTutorialId(TUTORIALS[0].id);
    }
  }, [isTutorialModalOpen, activeTutorialId]);

  // Subscribe to worker progress/warning notifications while simulating
  useEffect(() => {
    if (!isSimulating) {
      // Reset progress stats when not simulating
      setProgressStats({ species: 0, reactions: 0, iteration: 0 });
      setGenerationProgress('');
      return undefined;
    }
    const onProgress = (payload: any) => {
      if (!payload) return;
      // Update progress stats from generate_network_progress payload
      const speciesCount = payload.species ?? payload.speciesCount ?? 0;
      const reactionCount = payload.reactions ?? payload.reactionCount ?? 0;
      const iteration = payload.iteration ?? 0;
      setProgressStats({ species: speciesCount, reactions: reactionCount, iteration });
      const msg = payload.message ?? `Generated ${speciesCount} species, ${reactionCount} reactions`;
      setGenerationProgress(String(msg));
    };
    const onWarning = (payload: any) => {
      if (!payload) return;
      setGenerationProgress(`⚠️ ${String(payload.message ?? 'Warning during generation')}`);
    };

    const unsubP = bnglService.onProgress(onProgress);
    const unsubW = bnglService.onWarning(onWarning);
    return () => {
      unsubP();
      unsubW();
    };
  }, [isSimulating]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setModel(null);
    setResults(null);
    setValidationWarnings([]);
    setEditorMarkers([]);
  };

  const handleStatusClose = () => {
    setStatus(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Header
        onAboutClick={(focus?: string) => {
          if (focus === 'viz') {
            setIsVizModalOpen(true);
            return;
          }
          setAboutFocus(focus ?? null);
          setIsAboutModalOpen(true);
        }}
        onTutorialsClick={() => setIsTutorialModalOpen(true)}
        tutorialPill={
          activeTutorialId
            ? `Tutorial: ${TUTORIALS.find((t) => t.id === activeTutorialId)?.title ?? ''} ${((tutorialProgress[activeTutorialId]?.currentStepIndex ?? 0) + 1)}/${TUTORIALS.find((t) => t.id === activeTutorialId)?.steps.length ?? 0}`
            : null
        }
        onExportSBML={() => {
          if (!model) {
            setStatus({ type: 'warning', message: 'No model to export. Parse or load a model first.' });
            return;
          }
          try {
            const xml = exportToSBML(model);
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bngl_export.sbml';
            a.click();
            URL.revokeObjectURL(url);
            setStatus({ type: 'success', message: 'SBML export generated.' });
          } catch (e) {
            setStatus({ type: 'error', message: 'Failed to export SBML.' });
            console.warn('SBML export failed', e);
          }
        }}
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="container mx-auto flex h-full min-h-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <div className="fixed top-20 right-8 z-50 w-full max-w-sm">
            {status && <StatusMessage status={status} onClose={handleStatusClose} />}
          </div>

          <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 items-start lg:grid-cols-2">
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" style={{ maxHeight: PANEL_MAX_HEIGHT }}>
              <EditorPanel
                code={code}
                onCodeChange={handleCodeChange}
                onParse={handleParse}
                onSimulate={handleSimulate}
                onCancelSimulation={handleCancelSimulation}
                isSimulating={isSimulating}
                modelExists={!!model}
                validationWarnings={validationWarnings}
                editorMarkers={editorMarkers}
                loadedModelName={loadedModelName}
                onModelNameChange={setLoadedModelName}
                selection={editorSelection}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <VisualizationPanel
                model={model}
                results={results}
                onSimulate={handleSimulate}
                isSimulating={isSimulating}
                onCancelSimulation={handleCancelSimulation}
                activeTabIndex={activeVizTab}
                onActiveTabIndexChange={setActiveVizTab}
                onSelectRule={handleSelectRule}
              />
            </div>
          </div>
          <SimulationModal
            isGenerating={isSimulating}
            progressMessage={generationProgress}
            onCancel={handleCancelSimulation}
            speciesCount={progressStats.species}
            reactionCount={progressStats.reactions}
            iteration={progressStats.iteration}
            maxSpecies={10000}
            maxReactions={100000}
          />
          <TutorialModal
            isOpen={isTutorialModalOpen}
            onClose={() => setIsTutorialModalOpen(false)}
            activeTutorialId={activeTutorialId}
            onSelectTutorial={handleSelectTutorial}
            progressMap={tutorialProgress}
            onSetStep={handleSetTutorialStep}
            onCompleteStep={handleCompleteTutorialStep}
            onResetTutorial={handleResetTutorial}
            model={model}
            onCodeChange={handleCodeChange}
            onParse={handleParse}
          />
        </div>
      </main>
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} focus={aboutFocus} />
      <VisualizationConventionsModal isOpen={isVizModalOpen} onClose={() => setIsVizModalOpen(false)} />
    </div>
  );
}

export default App;
