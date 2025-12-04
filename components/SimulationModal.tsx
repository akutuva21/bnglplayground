import React, { useMemo } from 'react';

interface SimulationModalProps {
  isGenerating: boolean;
  progressMessage: string;
  onCancel: () => void;
  speciesCount?: number;
  reactionCount?: number;
  maxSpecies?: number;
  maxReactions?: number;
  iteration?: number;
}

export function SimulationModal({ 
  isGenerating, 
  progressMessage, 
  onCancel,
  speciesCount = 0,
  reactionCount = 0,
  maxSpecies = 10000,
  maxReactions = 100000,
  iteration = 0
}: SimulationModalProps) {
  if (!isGenerating) return null;

  // Calculate progress percentage based on species (primary metric)
  const progressPercent = useMemo(() => {
    if (maxSpecies <= 0) return 0;
    return Math.min(100, Math.round((speciesCount / maxSpecies) * 100));
  }, [speciesCount, maxSpecies]);

  // Determine color based on progress (green -> yellow -> orange -> red)
  const progressColor = useMemo(() => {
    if (progressPercent < 25) return 'from-teal-400 to-teal-500';
    if (progressPercent < 50) return 'from-teal-500 to-yellow-400';
    if (progressPercent < 75) return 'from-yellow-400 to-orange-400';
    return 'from-orange-400 to-red-500';
  }, [progressPercent]);

  // Warning message for large models
  const warningMessage = useMemo(() => {
    if (progressPercent >= 75) {
      return '⚠️ Model is getting large. Consider canceling if it takes too long.';
    }
    if (progressPercent >= 50) {
      return 'Model size is moderate. Generation may take a moment.';
    }
    return null;
  }, [progressPercent]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generating Network...</h3>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 min-h-[1.5rem]">{progressMessage || 'Initializing...'}</p>

        {/* Progress Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
            <div className="text-lg font-bold text-teal-600 dark:text-teal-400">{speciesCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Species</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{reactionCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reactions</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{iteration}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Iteration</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progressPercent}% (max {maxSpecies.toLocaleString()} species)</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-300 ease-out`} 
              style={{ width: `${Math.max(2, progressPercent)}%` }} 
            />
          </div>
        </div>

        {/* Warning Message */}
        {warningMessage && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 text-center font-medium">{warningMessage}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
          >
            Cancel Generation
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">Large models may take up to 60 seconds to generate</p>
      </div>
    </div>
  );
}

export default SimulationModal;
