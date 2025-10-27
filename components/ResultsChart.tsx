import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { BNGLModel, SimulationResults } from '../types';
import { CHART_COLORS } from '../constants';
import { Card } from './ui/Card';

interface ResultsChartProps {
  results: SimulationResults | null;
  model: BNGLModel | null;
  visibleSpecies: Set<string>;
  onVisibleSpeciesChange: (species: Set<string>) => void;
}

type ZoomDomain = {
    x1: number | 'dataMin';
    x2: number | 'dataMax';
    y1: number | 'dataMin';
    y2: number | 'dataMax';
}

const CustomLegend = (props: any) => {
  const { payload, onClick } = props;

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-4 px-4">
      {payload.map((entry: any, index: number) => (
        <div
          key={`item-${index}`}
          onClick={() => onClick(entry)}
          className={`flex items-center cursor-pointer transition-opacity ${entry.inactive ? 'opacity-50' : 'opacity-100'}`}
        >
          <div style={{ width: 12, height: 12, backgroundColor: entry.color, marginRight: 6, borderRadius: '2px' }} />
          <span className="text-xs text-slate-700 dark:text-slate-300">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const ResultsChart: React.FC<ResultsChartProps> = ({ results, model, visibleSpecies, onVisibleSpeciesChange }) => {
  const [zoomHistory, setZoomHistory] = useState<ZoomDomain[]>([]);
  const [selection, setSelection] = useState<ZoomDomain | null>(null);

  // Reset zoom state when the results object changes to avoid carrying zoom across runs
  useEffect(() => {
    setZoomHistory([]);
    setSelection(null);
  }, [results]);

  if (!results || results.data.length === 0) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <p className="text-slate-500">Run a simulation to see the results.</p>
      </Card>
    );
  }

  const handleLegendClick = (data: any) => {
    const newVisibleSpecies = new Set(visibleSpecies);
    // dataKey is for default legend, value is for custom legend payload
    const dataKey = data.dataKey || data.value;
    if (newVisibleSpecies.has(dataKey)) {
      newVisibleSpecies.delete(dataKey);
    } else {
      newVisibleSpecies.add(dataKey);
    }
    onVisibleSpeciesChange(newVisibleSpecies);
  };

  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setSelection({
        x1: e.activeLabel, x2: e.activeLabel,
        y1: e.activeCoordinate.y, y2: e.activeCoordinate.y // Placeholder
      });
    }
  };

  const handleMouseMove = (e: any) => {
    if (selection && e && e.activeLabel) {
      setSelection({ ...selection, x2: e.activeLabel });
    }
  };

  const handleMouseUp = () => {
    if (selection) {
      const { x1, x2 } = selection;
      if (typeof x1 === 'number' && typeof x2 === 'number' && Math.abs(x1 - x2) > 0.001) {
        const newDomain: ZoomDomain = {
          x1: Math.min(x1, x2),
          x2: Math.max(x1, x2),
          y1: 'dataMin',
          y2: 'dataMax'
        };
        setZoomHistory([...zoomHistory, newDomain]);
      }
      setSelection(null);
    }
  };

  const handleDoubleClick = () => {
    setZoomHistory([]);
  };

  const speciesToPlot = results.headers.filter(h => h !== 'time');
  const currentDomain = zoomHistory.length > 0 ? zoomHistory[zoomHistory.length - 1] : undefined;

  return (
    <Card>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={results.data} 
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
          <XAxis 
            dataKey="time" 
            label={{ value: 'Time', position: 'insideBottom', offset: -5 }} 
            type="number" 
            domain={currentDomain ? [currentDomain.x1, currentDomain.x2] : ['dataMin', 'dataMax']}
            allowDataOverflow={true}
          />
          <YAxis 
            label={{ value: 'Concentration', angle: -90, position: 'insideLeft' }}
            domain={currentDomain ? [currentDomain.y1, currentDomain.y2] : [0, 'dataMax']}
            allowDataOverflow={true}
            tickFormatter={(value) => value.toFixed(0)}
          />
          <Tooltip 
            formatter={(value: any) => {
              const num = typeof value === 'number' ? value : parseFloat(value);
              return num.toFixed(2);
            }}
            labelFormatter={(label) => `Time: ${typeof label === 'number' ? label.toFixed(2) : label}`}
          />
          <Legend onClick={handleLegendClick} content={<CustomLegend />} />
          {speciesToPlot.map((speciesName, i) => (
            <Line
              key={speciesName}
              type="monotone"
              dataKey={speciesName}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              hide={!visibleSpecies.has(speciesName)}
            />
          ))}
          {selection && (
            <ReferenceArea 
              x1={selection.x1} 
              x2={selection.x2} 
              strokeOpacity={0.3} 
              fill="#8884d8"
              fillOpacity={0.2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="text-center text-xs text-slate-500 mt-2">
        Click and drag to zoom, double-click to reset.
      </div>
    </Card>
  );
};