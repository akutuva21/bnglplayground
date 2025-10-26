import React, { useState, useCallback, useRef } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { Header } from './components/Header';
import { StatusMessage } from './components/ui/StatusMessage';
import { AboutModal } from './components/AboutModal';
import { bnglService } from './services/bnglService';
import { BNGLModel, SimulationOptions, SimulationResults, Status } from './types';
import { INITIAL_BNGL_CODE } from './constants';

function App() {
  const [code, setCode] = useState<string>(INITIAL_BNGL_CODE);
  const [model, setModel] = useState<BNGLModel | null>(null);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const parseAbortRef = useRef<AbortController | null>(null);
  const simulateAbortRef = useRef<AbortController | null>(null);

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
      </main>
       <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}

export default App;
