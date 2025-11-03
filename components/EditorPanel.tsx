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
  onCancelSimulation: () => void;
  isSimulating: boolean;
  modelExists: boolean;
}

type ParsedSimulateOptions = {
  t_end?: number;
  n_steps?: number;
};

const SIMULATE_REGEX = /simulate(?:_(ode|ssa))?\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;

const DEFAULT_SIMULATION: Record<'ode' | 'ssa', { t_end: number; n_steps: number }> = {
  ode: { t_end: 100, n_steps: 100 },
  ssa: { t_end: 100, n_steps: 100 },
};

function extractSimulateOptions(source: string, preferredMethod: 'ode' | 'ssa'): ParsedSimulateOptions {
  const matches: Array<{ method?: 'ode' | 'ssa'; options: ParsedSimulateOptions }> = [];

  SIMULATE_REGEX.lastIndex = 0;
  let simulateMatch: RegExpExecArray | null;
  while ((simulateMatch = SIMULATE_REGEX.exec(source)) !== null) {
    const [, methodSuffixRaw, block] = simulateMatch;
    const entry: { method?: 'ode' | 'ssa'; options: ParsedSimulateOptions } = {
      method: methodSuffixRaw ? (methodSuffixRaw.toLowerCase() as 'ode' | 'ssa') : undefined,
      options: {},
    };

    const keyValueRegex = /(\w+)\s*=>\s*(?:"([^"]*)"|'([^']*)'|([^,\s}]+))/g;
    let kvMatch: RegExpExecArray | null;
    while ((kvMatch = keyValueRegex.exec(block)) !== null) {
      const key = kvMatch[1];
      const rawValue = kvMatch[2] ?? kvMatch[3] ?? kvMatch[4] ?? '';
      if (key === 'method' && rawValue) {
        const normalized = rawValue.toLowerCase();
        if (normalized === 'ode' || normalized === 'ssa') {
          entry.method = normalized;
        }
      } else if (key === 't_end') {
        const num = Number(rawValue);
        if (!Number.isNaN(num)) {
          entry.options.t_end = num;
        }
      } else if (key === 'n_steps') {
        const num = Number(rawValue);
        if (!Number.isNaN(num)) {
          entry.options.n_steps = num;
        }
      }
    }

    matches.push(entry);
  }

  if (matches.length === 0) {
    return {};
  }

  const exact = matches.find((entry) => entry.method === preferredMethod);
  const methodless = matches.find((entry) => entry.method === undefined);
  const chosen = exact ?? methodless ?? matches[0];

  return chosen.options;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  code,
  onCodeChange,
  onParse,
  onSimulate,
  onCancelSimulation,
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
    <Card className="flex h-full flex-col overflow-hidden">
      <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100">BNGL Model Editor</h2>
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <MonacoEditor
          language="bngl"
          value={code}
          onChange={(value) => onCodeChange(value || '')}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
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
                  onClick={() => {
                    const parsed = extractSimulateOptions(code, simulationMethod);
                    const defaults = DEFAULT_SIMULATION[simulationMethod];
                    onSimulate({
                      method: simulationMethod,
                      t_end: parsed.t_end ?? defaults.t_end,
                      n_steps: parsed.n_steps ?? defaults.n_steps,
                    });
                  }}
                  disabled={isSimulating || !modelExists}
                  variant="primary"
                >
                  {isSimulating && <LoadingSpinner className="w-4 h-4 mr-2" />}
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </Button>
                {isSimulating && (
                  <Button variant="danger" onClick={onCancelSimulation}>
                    Cancel
                  </Button>
                )}
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