
import React from 'react';
import { BNGLModel, SimulationOptions } from '../../types';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { InfoIcon } from '../icons/InfoIcon';

interface SteadyStateTabProps {
  model: BNGLModel | null;
  onSimulate: (options: SimulationOptions) => void;
  onCancelSimulation: () => void;
  isSimulating: boolean;
}

export const SteadyStateTab: React.FC<SteadyStateTabProps> = ({ model, onSimulate, onCancelSimulation, isSimulating }) => {

  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to run a steady-state analysis.</div>;
  }
  
  const handleRun = () => {
    onSimulate({
      method: 'ode',
      t_end: 2000,
      n_steps: 800,
      steadyState: true,
      steadyStateTolerance: 1e-6,
      steadyStateWindow: 12,
    });
  }

  return (
    <div className="space-y-4">
       <div className="p-4 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex items-start gap-3">
        <InfoIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <p className="text-sm">
            <b>Steady-state finder:</b> Runs an adaptive ODE sweep until consecutive RK4 sub-steps change by less than 1e-6 (12 times in a row). The final point in the "Time Course" tab is the detected steady state.
        </p>
      </div>

       <div className="mt-6 flex gap-2">
           <Button onClick={handleRun} disabled={isSimulating}>
                {isSimulating && <LoadingSpinner className="w-4 h-4 mr-2" />}
                {isSimulating ? 'Running…' : 'Run to Steady State'}
           </Button>
           {isSimulating && (
             <Button variant="danger" onClick={onCancelSimulation}>
               Cancel
             </Button>
           )}
       </div>
    </div>
  );
};
