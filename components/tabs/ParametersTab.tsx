
import React, { useState, useEffect, useCallback } from 'react';
import { BNGLModel } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DataTable } from '../ui/DataTable';

interface ParametersTabProps {
  model: BNGLModel | null;
  onModelUpdate: (model: BNGLModel) => void;
}

export const ParametersTab: React.FC<ParametersTabProps> = ({ model, onModelUpdate }) => {
  const [editedParams, setEditedParams] = useState<Record<string, string>>({});

  const resetParams = useCallback(() => {
    if (model) {
      const stringParams: Record<string, string> = {};
      for (const key in model.parameters) {
        stringParams[key] = String(model.parameters[key]);
      }
      setEditedParams(stringParams);
    }
  }, [model]);

  useEffect(() => {
    resetParams();
  }, [model, resetParams]);

  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to view its parameters.</div>;
  }

  const handleParamChange = (name: string, value: string) => {
    setEditedParams(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyChanges = () => {
    const newParameters: Record<string, number> = {};
    let hasError = false;
    for (const key in editedParams) {
      const numValue = parseFloat(editedParams[key]);
      if (isNaN(numValue)) {
        console.error(`Invalid number for parameter ${key}: ${editedParams[key]}`);
        hasError = true;
        break;
      }
      newParameters[key] = numValue;
    }

    if (!hasError && model) {
      const newModel = JSON.parse(JSON.stringify(model)); // deep copy
      newModel.parameters = newParameters;
      // Also update reactions with new rates
      newModel.reactions = [];
      newModel.reactionRules.forEach((rule: any) => {
        const forwardRate = newModel.parameters[rule.rate] ?? parseFloat(rule.rate);
        if (!isNaN(forwardRate)) {
            newModel.reactions.push({
                reactants: rule.reactants,
                products: rule.products,
                rate: rule.rate,
                rateConstant: forwardRate
            });
        }
        
        if (rule.isBidirectional && rule.reverseRate) {
            const reverseRate = newModel.parameters[rule.reverseRate] ?? parseFloat(rule.reverseRate);
             if (!isNaN(reverseRate)) {
                newModel.reactions.push({
                    reactants: rule.products,
                    products: rule.reactants,
                    rate: rule.reverseRate,
                    rateConstant: reverseRate
                });
            }
        }
      });
      onModelUpdate(newModel);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        headers={['Parameter', 'Value']}
        rows={Object.keys(editedParams).map((name) => [
          <span key={`${name}-label`} className="font-mono">{name}</span>,
          <Input
            key={`${name}-input`}
            type="text"
            value={editedParams[name]}
            onChange={(e) => handleParamChange(name, e.target.value)}
            className="font-mono text-sm"
          />,
        ])}
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="subtle" onClick={resetParams}>Reset</Button>
        <Button onClick={handleApplyChanges}>Apply Changes & Update Reactions</Button>
      </div>
    </div>
  );
};
