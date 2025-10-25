import React from 'react';
import { BNGLModel } from '../../types';
import { RuleCartoon } from '../RuleCartoon';

interface CartoonTabProps {
  model: BNGLModel | null;
}

export const CartoonTab: React.FC<CartoonTabProps> = ({ model }) => {
  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to visualize reaction rules.</div>;
  }

  if (model.reactionRules.length === 0) {
    return <div className="text-slate-500 dark:text-slate-400">This model has no reaction rules defined.</div>;
  }

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      {model.reactionRules.map((rule, index) => (
        <RuleCartoon key={index} rule={rule} />
      ))}
    </div>
  );
};
