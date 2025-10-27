import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { Header } from './components/Header';
import { StatusMessage } from './components/ui/StatusMessage';
import { AboutModal } from './components/AboutModal';
import { bnglService } from './services/bnglService';
import { BNGLModel, SimulationOptions, SimulationResults, Status } from './types';
import { INITIAL_BNGL_CODE } from './constants';
import SimulationModal from './components/SimulationModal';

function App() {
  const [code, setCode] = useState<string>(INITIAL_BNGL_CODE);
  const [model, setModel] = useState<BNGLModel | null>(null);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

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
      setStatus({ type: 'success', message: 'Model parsed successfully!' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setModel(null);
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
      setStatus({ type: 'success', message: `Simulation (${options.method}) completed.` });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (error.message.includes('cancelled by user')) {
          setStatus({ type: 'info', message: 'Simulation cancelled.' });
          setResults(null);
        }
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
  }, []);

  // Subscribe to worker progress/warning notifications while simulating
  useEffect(() => {
    if (!isSimulating) return undefined;
    const onProgress = (payload: any) => {
      if (!payload) return;
      const msg = payload.message ?? `Generated ${payload.speciesCount ?? 0} species, ${payload.reactionCount ?? 0} reactions`;
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
      setGenerationProgress('');
    };
  }, [isSimulating]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setModel(null);
    setResults(null);
  };

  const handleStatusClose = () => {
    setStatus(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <Header onAboutClick={() => setIsAboutModalOpen(true)} />
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="fixed top-20 right-8 z-50 w-full max-w-sm">
            {status && <StatusMessage status={status} onClose={handleStatusClose} />}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <div className="lg:h-[calc(100vh-120px)]">
            <EditorPanel
                    code={code}
                    onCodeChange={handleCodeChange}
                    onParse={handleParse}
                    onSimulate={handleSimulate}
              onCancelSimulation={handleCancelSimulation}
                    isSimulating={isSimulating}
                    modelExists={!!model}
                />
            </div>
            <div className="lg:h-[calc(100vh-120px)] overflow-y-auto">
            <VisualizationPanel 
                    model={model} 
                    results={results}
                    onSimulate={handleSimulate}
                    isSimulating={isSimulating}
              onCancelSimulation={handleCancelSimulation}
                 />
            </div>
        </div>
        <SimulationModal isGenerating={isSimulating} progressMessage={generationProgress} onCancel={handleCancelSimulation} />
      </main>
       <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}

export default App;
