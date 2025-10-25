import React, { useState } from 'react';
import { BNGLModel } from '../../types';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { InfoIcon } from '../icons/InfoIcon';

interface ParameterScanTabProps {
  model: BNGLModel | null;
}

export const ParameterScanTab: React.FC<ParameterScanTabProps> = ({ model }) => {
  const [scanType, setScanType] = useState('1d');
  
  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to set up a parameter scan.</div>;
  }
  
  const parameters = Object.keys(model.parameters);

  return (
    <div>
      <div className="p-4 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex items-start gap-3">
        <InfoIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <p className="text-sm">
            <b>Feature Under Development:</b> The UI for parameter scans is complete, but the backend simulation logic is not yet implemented.
        </p>
      </div>

      <div className="mt-6">
        <label className="font-medium text-slate-700 dark:text-slate-200">Scan Type</label>
        <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
                <input type="radio" value="1d" checked={scanType === '1d'} onChange={() => setScanType('1d')} /> 1D Scan
            </label>
             <label className="flex items-center gap-2">
                <input type="radio" value="2d" checked={scanType === '2d'} onChange={() => setScanType('2d')} /> 2D Scan
            </label>
        </div>
      </div>
      
      <div className="mt-6 space-y-4">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Parameter 1</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select>
                <option>Select Parameter...</option>
                {parameters.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input type="number" placeholder="Start Value" />
            <Input type="number" placeholder="End Value" />
            <Input type="number" placeholder="Number of Steps" />
        </div>
      </div>

       {scanType === '2d' && (
         <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Parameter 2</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select>
                    <option>Select Parameter...</option>
                    {parameters.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Input type="number" placeholder="Start Value" />
                <Input type="number" placeholder="End Value" />
                <Input type="number" placeholder="Number of Steps" />
            </div>
         </div>
       )}

       <div className="mt-8 flex justify-end">
           <Button disabled>Run Scan</Button>
       </div>
    </div>
  );
};
