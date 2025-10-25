
import React, { useState, useCallback } from 'react';
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

  const handleParse = useCallback(async () => {
    setResults(null);
    try {
      const parsedModel = await bnglService.parse(code);
      setModel(parsedModel);
      setStatus({ type: 'success', message: 'Model parsed successfully!' });
    } catch (error) {
      setModel(null);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatus({ type: 'error', message: `Parsing failed: ${message}` });
    }
  }, [code]);

  const handleSimulate = useCallback(async (options: SimulationOptions) => {
    if (!model) {
      setStatus({ type: 'warning', message: 'Please parse a model before simulating.' });
      return;
    }
    setIsSimulating(true);
    try {
      const simResults = await bnglService.simulate(model, options);
      setResults(simResults);
      setStatus({ type: 'success', message: `Simulation (${options.method}) completed.` });
    } catch (error) {
      setResults(null);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatus({ type: 'error', message: `Simulation failed: ${message}` });
    } finally {
      setIsSimulating(false);
    }
  }, [model]);

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
