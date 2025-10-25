import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BNGLModel } from '../../types';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Card } from '../ui/Card';
import { DataTable } from '../ui/DataTable';
import { bnglService } from '../../services/bnglService';
import { CHART_COLORS } from '../../constants';

interface ParameterScanTabProps {
  model: BNGLModel | null;
}

type ScanMode = '1d' | '2d';

interface OneDPoint {
  parameterValue: number;
  observables: Record<string, number>;
}

interface OneDResult {
  parameterName: string;
  values: OneDPoint[];
}

interface TwoDResult {
  parameterNames: [string, string];
  xValues: number[];
  yValues: number[];
  grid: Record<string, number[][]>;
}

const roundForInput = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toString();
};

const cloneWithParameters = (model: BNGLModel, overrides: Record<string, number>): BNGLModel => {
  const nextModel: BNGLModel = JSON.parse(JSON.stringify(model));
  nextModel.parameters = { ...model.parameters, ...overrides };
  nextModel.reactions = [];
  nextModel.reactionRules.forEach((rule) => {
    const forwardRate = nextModel.parameters[rule.rate] ?? parseFloat(rule.rate);
    if (!Number.isNaN(forwardRate)) {
      nextModel.reactions.push({
        reactants: rule.reactants,
        products: rule.products,
        rate: rule.rate,
        rateConstant: forwardRate,
      });
    }
    if (rule.isBidirectional && rule.reverseRate) {
      const reverseRate = nextModel.parameters[rule.reverseRate] ?? parseFloat(rule.reverseRate);
      if (!Number.isNaN(reverseRate)) {
        nextModel.reactions.push({
          reactants: rule.products,
          products: rule.reactants,
          rate: rule.reverseRate,
          rateConstant: reverseRate,
        });
      }
    }
  });
  return nextModel;
};

const generateRange = (start: number, end: number, steps: number): number[] => {
  if (steps <= 1) return [start];
  const delta = (end - start) / (steps - 1);
  return Array.from({ length: steps }, (_, index) => Number((start + index * delta).toPrecision(12)));
};

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.001) {
    return value.toExponential(2);
  }
  return value.toFixed(3);
};

export const ParameterScanTab: React.FC<ParameterScanTabProps> = ({ model }) => {
  const [scanType, setScanType] = useState<ScanMode>('1d');
  const [parameter1, setParameter1] = useState('');
  const [parameter2, setParameter2] = useState('');
  const [param1Start, setParam1Start] = useState('');
  const [param1End, setParam1End] = useState('');
  const [param1Steps, setParam1Steps] = useState('5');
  const [param2Start, setParam2Start] = useState('');
  const [param2End, setParam2End] = useState('');
  const [param2Steps, setParam2Steps] = useState('5');
  const [method, setMethod] = useState<'ode' | 'ssa'>('ode');
  const [tEnd, setTEnd] = useState('100');
  const [nSteps, setNSteps] = useState('100');
  const [selectedObservable, setSelectedObservable] = useState('');
  const [oneDResult, setOneDResult] = useState<OneDResult | null>(null);
  const [twoDResult, setTwoDResult] = useState<TwoDResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const parameterNames = useMemo(() => (model ? Object.keys(model.parameters) : []), [model]);
  const observableNames = useMemo(() => (model ? model.observables.map((obs) => obs.name) : []), [model]);

  useEffect(() => {
    if (!model) {
      setParameter1('');
      setParameter2('');
      setSelectedObservable('');
      setOneDResult(null);
      setTwoDResult(null);
      return;
    }

    if (!parameterNames.includes(parameter1)) {
      setParameter1(parameterNames[0] ?? '');
    }

    if (!parameterNames.includes(parameter2) || parameter2 === parameter1) {
      const secondChoice = parameterNames.find((name) => name !== parameter1);
      setParameter2(secondChoice ?? parameterNames[0] ?? '');
    }

    if (!selectedObservable || !observableNames.includes(selectedObservable)) {
      setSelectedObservable(observableNames[0] ?? '');
    }
  }, [model, parameter1, parameter2, parameterNames, observableNames, selectedObservable]);

  useEffect(() => {
    if (!model) return;
    if (parameter1) {
      const base = model.parameters[parameter1];
      if (base !== undefined && !param1Start) {
        setParam1Start(roundForInput(base * 0.5));
      }
      if (base !== undefined && !param1End) {
        setParam1End(roundForInput(base * 1.5));
      }
    }
  }, [model, parameter1, param1Start, param1End]);

  useEffect(() => {
    if (!model) return;
    if (parameter2) {
      const base = model.parameters[parameter2];
      if (base !== undefined && !param2Start) {
        setParam2Start(roundForInput(base * 0.5));
      }
      if (base !== undefined && !param2End) {
        setParam2End(roundForInput(base * 1.5));
      }
    }
  }, [model, parameter2, param2Start, param2End]);

  useEffect(() => {
    setOneDResult(null);
    setTwoDResult(null);
  }, [scanType]);

  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to set up a parameter scan.</div>;
  }

  if (parameterNames.length === 0) {
    return <div className="text-slate-500 dark:text-slate-400">The current model does not declare any parameters to scan.</div>;
  }

  const canRunScan = () => {
    if (!parameter1 || !param1Start || !param1End || !param1Steps) return false;
    if (scanType === '2d' && (!parameter2 || parameter2 === parameter1 || !param2Start || !param2End || !param2Steps)) {
      return false;
    }
    return true;
  };

  const handleRunScan = async () => {
    if (!canRunScan()) return;

    const start1 = Number(param1Start);
    const end1 = Number(param1End);
    const steps1 = Math.max(1, Math.floor(Number(param1Steps)));
    if (!Number.isFinite(start1) || !Number.isFinite(end1) || Number.isNaN(steps1) || steps1 < 1) {
      setError('Please provide valid numeric settings for the primary parameter.');
      return;
    }

    const tEndValue = Number(tEnd);
    const nStepsValue = Math.max(1, Math.floor(Number(nSteps)));
    if (!Number.isFinite(tEndValue) || tEndValue <= 0 || Number.isNaN(nStepsValue) || nStepsValue < 1) {
      setError('Simulation settings must have positive numeric values for t_end and steps.');
      return;
    }

    const range1 = generateRange(start1, end1, steps1);
    let totalRuns = range1.length;
    let range2: number[] = [];

    if (scanType === '2d') {
      const start2 = Number(param2Start);
      const end2 = Number(param2End);
      const steps2 = Math.max(1, Math.floor(Number(param2Steps)));
      if (!Number.isFinite(start2) || !Number.isFinite(end2) || Number.isNaN(steps2) || steps2 < 1) {
        setError('Please provide valid numeric settings for the second parameter.');
        return;
      }
      if (parameter2 === parameter1) {
        setError('Select two different parameters for a 2D scan.');
        return;
      }
      range2 = generateRange(start2, end2, steps2);
      totalRuns = range1.length * range2.length;
    }

    if (totalRuns > 400) {
      setError('Please reduce the number of combinations (limit 400) to keep the scan responsive.');
      return;
    }

    setError(null);
    setIsRunning(true);
    setProgress({ current: 0, total: totalRuns });
    setOneDResult(null);
    setTwoDResult(null);

    const simulationOptions = {
      method,
      t_end: tEndValue,
      n_steps: nStepsValue,
    } as const;

    try {
      if (scanType === '1d') {
        const result: OneDResult = { parameterName: parameter1, values: [] };
        let completed = 0;
        for (const value of range1) {
          const customizedModel = cloneWithParameters(model, { [parameter1]: value });
          const simResults = await bnglService.simulate(customizedModel, simulationOptions);
          const lastPoint = simResults.data.at(-1) ?? {};
          const observables = observableNames.reduce<Record<string, number>>((acc, name) => {
            const raw = lastPoint[name];
            const numeric = typeof raw === 'number' ? raw : Number(raw ?? 0);
            acc[name] = Number.isFinite(numeric) ? numeric : 0;
            return acc;
          }, {});
          result.values.push({ parameterValue: value, observables });
          completed += 1;
          setProgress({ current: completed, total: totalRuns });
        }
        setOneDResult(result);
      } else {
        const grid: Record<string, number[][]> = {};
        observableNames.forEach((name) => {
          grid[name] = range2.map(() => new Array(range1.length).fill(0));
        });
        let completed = 0;
        for (let yi = 0; yi < range2.length; yi += 1) {
          for (let xi = 0; xi < range1.length; xi += 1) {
            const overrides = { [parameter1]: range1[xi], [parameter2]: range2[yi] };
            const customizedModel = cloneWithParameters(model, overrides);
            const simResults = await bnglService.simulate(customizedModel, simulationOptions);
            const lastPoint = simResults.data.at(-1) ?? {};
            observableNames.forEach((name) => {
              const raw = lastPoint[name];
              const numeric = typeof raw === 'number' ? raw : Number(raw ?? 0);
              grid[name][yi][xi] = Number.isFinite(numeric) ? numeric : 0;
            });
            completed += 1;
            setProgress({ current: completed, total: totalRuns });
          }
        }
        setTwoDResult({
          parameterNames: [parameter1, parameter2],
          xValues: range1,
          yValues: range2,
          grid,
        });
      }
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : String(scanError);
      setError(`Parameter scan failed: ${message}`);
      setOneDResult(null);
      setTwoDResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  const oneDChartData = useMemo(() => {
    if (!oneDResult || !selectedObservable) return [];
    return oneDResult.values.map((entry) => ({
      parameterValue: entry.parameterValue,
      observableValue: entry.observables[selectedObservable] ?? 0,
    }));
  }, [oneDResult, selectedObservable]);

  const heatmapData = useMemo(() => {
    if (!twoDResult || !selectedObservable) return null;
    const matrix = twoDResult.grid[selectedObservable];
    if (!matrix) return null;
    let min = Infinity;
    let max = -Infinity;
    matrix.forEach((row) => {
      row.forEach((value) => {
        if (value < min) min = value;
        if (value > max) max = value;
      });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 0;
    }
    return { matrix, min, max };
  }, [twoDResult, selectedObservable]);

  const makeCellColor = (value: number, min: number, max: number) => {
    if (max <= min) return 'rgba(33,128,141,0.2)';
    const ratio = (value - min) / (max - min);
    const alpha = 0.15 + 0.75 * Math.min(Math.max(ratio, 0), 1);
    return `rgba(33,128,141,${alpha.toFixed(2)})`;
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <div>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="radio" value="1d" checked={scanType === '1d'} onChange={() => setScanType('1d')} />
              1D Scan
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="radio" value="2d" checked={scanType === '2d'} onChange={() => setScanType('2d')} />
              2D Scan
            </label>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Parameter 1</h4>
            <Select value={parameter1} onChange={(event) => setParameter1(event.target.value)}>
              {parameterNames.map((param) => (
                <option key={param} value={param}>
                  {param}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input type="number" value={param1Start} onChange={(event) => setParam1Start(event.target.value)} placeholder="Start" />
              <Input type="number" value={param1End} onChange={(event) => setParam1End(event.target.value)} placeholder="End" />
              <Input type="number" value={param1Steps} min={1} onChange={(event) => setParam1Steps(event.target.value)} placeholder="Steps" />
            </div>
          </div>

          {scanType === '2d' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Parameter 2</h4>
              <Select value={parameter2} onChange={(event) => setParameter2(event.target.value)}>
                {parameterNames.map((param) => (
                  <option key={param} value={param}>
                    {param}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input type="number" value={param2Start} onChange={(event) => setParam2Start(event.target.value)} placeholder="Start" />
                <Input type="number" value={param2End} onChange={(event) => setParam2End(event.target.value)} placeholder="End" />
                <Input type="number" value={param2Steps} min={1} onChange={(event) => setParam2Steps(event.target.value)} placeholder="Steps" />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Solver</label>
            <Select value={method} onChange={(event) => setMethod(event.target.value as 'ode' | 'ssa')}>
              <option value="ode">ODE</option>
              <option value="ssa">SSA</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">t_end</label>
            <Input type="number" value={tEnd} min={0} onChange={(event) => setTEnd(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Steps</label>
            <Input type="number" value={nSteps} min={1} onChange={(event) => setNSteps(event.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>Select an observable:</span>
            <Select
              value={selectedObservable}
              onChange={(event) => setSelectedObservable(event.target.value)}
              className="w-48"
            >
              {observableNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="subtle" onClick={() => {
              setOneDResult(null);
              setTwoDResult(null);
              setError(null);
            }}>
              Clear Results
            </Button>
            <Button onClick={handleRunScan} disabled={isRunning || !canRunScan()}>
              {isRunning ? 'Running…' : 'Run Scan'}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 text-red-700 dark:text-red-200 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {isRunning && (
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <LoadingSpinner className="w-5 h-5" />
          <span>
            Running simulations… {progress.current} / {progress.total}
          </span>
        </div>
      )}

      {oneDResult && oneDResult.values.length > 0 && (
        <Card className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">1D Scan Results</h3>
          {selectedObservable && oneDChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={oneDChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
                <XAxis
                  dataKey="parameterValue"
                  label={{ value: oneDResult.parameterName, position: 'insideBottom', offset: -6 }}
                  type="number"
                />
                <YAxis label={{ value: selectedObservable, angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number) => formatNumber(value as number)}
                  labelFormatter={(value) => `${oneDResult.parameterName}: ${formatNumber(value as number)}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="observableValue"
                  name={selectedObservable}
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">Select an observable to visualize the scan.</p>
          )}

          <DataTable
            headers={[oneDResult.parameterName, ...observableNames]}
            rows={oneDResult.values.map((entry) => [
              formatNumber(entry.parameterValue),
              ...observableNames.map((name) => formatNumber(entry.observables[name] ?? 0)),
            ])}
          />
        </Card>
      )}

      {twoDResult && heatmapData && (
        <Card className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">2D Scan Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {twoDResult.parameterNames[1]} ↓ / {twoDResult.parameterNames[0]} →
                  </th>
                  {twoDResult.xValues.map((value, index) => (
                    <th key={index} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                      {formatNumber(value)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {twoDResult.yValues.map((yValue, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                      {formatNumber(yValue)}
                    </td>
                    {heatmapData.matrix[rowIndex].map((cellValue, columnIndex) => (
                      <td
                        key={columnIndex}
                        className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 text-center"
                        style={{ backgroundColor: makeCellColor(cellValue, heatmapData.min, heatmapData.max) }}
                      >
                        {formatNumber(cellValue)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Range: {formatNumber(heatmapData.min)} – {formatNumber(heatmapData.max)} ({selectedObservable})
          </div>
        </Card>
      )}
    </div>
  );
};
