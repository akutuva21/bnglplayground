import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { UploadIcon } from './icons/UploadIcon';
import { ExampleGalleryModal } from './ExampleGalleryModal';
import { RadioGroup } from './ui/RadioGroup';
import MonacoEditor from './MonacoEditor';
import { SimulationOptions } from '../types';

interface EditorPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  onParse: () => void;
  onSimulate: (options: SimulationOptions) => void;
  isSimulating: boolean;
  modelExists: boolean;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  code,
  onCodeChange,
  onParse,
  onSimulate,
  isSimulating,
  modelExists,
}) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [simulationMethod, setSimulationMethod] = useState<'ode' | 'ssa'>('ode');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onCodeChange(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadExample = (exampleCode: string) => {
    onCodeChange(exampleCode);
    setIsGalleryOpen(false);
  };
  
  return (
    <Card className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100">BNGL Model Editor</h2>
      <div className="flex-grow relative">
        <MonacoEditor
          language="bngl"
          value={code}
          onChange={(value) => onCodeChange(value || '')}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
         <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsGalleryOpen(true)}>
              Examples
            </Button>
            <Button variant="subtle" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Load BNGL
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".bngl"
            />
         </div>
         <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={onParse}>Parse Model</Button>
            <div className="flex items-center gap-3 pl-2 border-l border-stone-300 dark:border-slate-600">
                <RadioGroup
                    name="simulationMethod"
                    value={simulationMethod}
                    onChange={(val) => setSimulationMethod(val as 'ode' | 'ssa')}
                    options={[
                        { label: 'ODE', value: 'ode' },
                        { label: 'SSA', value: 'ssa' },
                    ]}
                />
                <Button
                  onClick={() => onSimulate({ method: simulationMethod, t_end: 100, n_steps: 100 })}
                  disabled={isSimulating || !modelExists}
                  variant="primary"
                >
                  {isSimulating && <LoadingSpinner className="w-4 h-4 mr-2" />}
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </Button>
            </div>
        </div>
      </div>
       <ExampleGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelect={handleLoadExample}
      />
    </Card>
  );
};