import React from 'react';

interface SimulationModalProps {
  isGenerating: boolean;
  progressMessage: string;
  onCancel: () => void;
}

export function SimulationModal({ isGenerating, progressMessage, onCancel }: SimulationModalProps) {
  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Generating Network...</h3>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
        </div>

        <p className="text-sm text-gray-700 mb-4 min-h-[3rem]">{progressMessage || 'Initializing...'}</p>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 animate-pulse" style={{ width: '100%' }} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
          >
            Cancel Simulation
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">Large models may take up to 60 seconds to generate</p>
      </div>
    </div>
  );
}

export default SimulationModal;
