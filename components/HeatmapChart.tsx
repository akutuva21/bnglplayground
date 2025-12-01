import React from 'react';

interface HeatmapDatum {
  x: number;
  y: number;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapDatum[];
  xAxisLabel: string;
  yAxisLabel: string;
  zAxisLabel?: string;
  width?: number;
  height?: number;
  cellSize?: number;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  xAxisLabel,
  yAxisLabel,
  zAxisLabel,
  width = 480,
  height = 360,
  cellSize,
}) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500">No data to render</div>;
  }

  // Unique sorted x and y
  const xs = Array.from(new Set(data.map((d) => d.x))).sort((a, b) => a - b);
  const ys = Array.from(new Set(data.map((d) => d.y))).sort((a, b) => a - b);

  const cols = xs.length;
  const rows = ys.length;

  const cell = cellSize ?? Math.max(12, Math.min(36, Math.floor(Math.min(width / cols, height / rows)))) ;

  const plotWidth = cols * cell;
  const plotHeight = rows * cell;

  const leftMargin = 90;
  const topMargin = 20;
  const svgWidth = leftMargin + plotWidth + 20;
  const svgHeight = topMargin + plotHeight + 40;

  let min = Infinity;
  let max = -Infinity;
  data.forEach((d) => {
    if (d.value < min) min = d.value;
    if (d.value > max) max = d.value;
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 0;
  }

  // Color interpolation: light-blue -> dark-blue for non-negative values; diverging with red for negative
  const colorFor = (v: number) => {
    if (min < 0 && max > 0) {
      // Diverging: negative -> blue, positive -> red, 0 -> white
      const pos = v > 0 ? (v / max) : 0;
      const neg = v < 0 ? (v / min) : 0;
      if (v >= 0) {
        const intensity = Math.min(1, pos);
        return `rgba(220, 38, 38, ${intensity})`; // red
      }
      const intensity = Math.min(1, Math.abs(neg));
      return `rgba(37, 99, 235, ${intensity})`; // blue
    }
    // Single sign values -> bluescale
    const denom = Math.max(Math.abs(max - min), Number.EPSILON);
    const ratio = (v - min) / denom;
    const alpha = 0.15 + 0.8 * Math.min(Math.max(ratio, 0), 1);
    return `rgba(37, 99, 235, ${alpha.toFixed(2)})`;
  };

  // Map x, y values to column/row indices
  const xIndex = (val: number) => xs.indexOf(val);
  const yIndex = (val: number) => ys.indexOf(val);

  return (
    <div className="overflow-auto">
      <svg width={svgWidth} height={svgHeight}>
        <g transform={`translate(${leftMargin}, ${topMargin})`}>
          {data.map((d, i) => {
            const cx = xIndex(d.x);
            const cy = yIndex(d.y);
            if (cx < 0 || cy < 0) return null;
            return (
              <g key={`cell-${i}`}>
                <rect
                  x={cx * cell}
                  y={cy * cell}
                  width={cell}
                  height={cell}
                  fill={colorFor(d.value)}
                  stroke="#eee"
                />
                <title>{`${xAxisLabel}: ${d.x}, ${yAxisLabel}: ${d.y}, ${zAxisLabel ?? 'value'}: ${d.value}`}</title>
              </g>
            );
          })}

          {/* x ticks */}
          {xs.map((xVal, j) => (
            <text key={`x-tick-${j}`} x={j * cell + cell / 2} y={-6} fontSize={10} textAnchor="middle">
              {xVal}
            </text>
          ))}

          {/* y ticks */}
          {ys.map((yVal, i) => (
            <text key={`y-tick-${i}`} x={-8} y={i * cell + cell / 2} fontSize={10} textAnchor="end" dominantBaseline="middle">
              {yVal}
            </text>
          ))}

          {/* Axis labels */}
          <text x={plotWidth / 2} y={plotHeight + 30} fontSize={12} textAnchor="middle">
            {xAxisLabel}
          </text>
          <text x={-60} y={plotHeight / 2} fontSize={12} textAnchor="middle" transform={`rotate(-90 -60 ${plotHeight / 2})`}>
            {yAxisLabel}
          </text>

        </g>
      </svg>
    </div>
  );
};

export default HeatmapChart;
