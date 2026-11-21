import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';

interface MiniSparklineProps {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  positive = true,
  width = 88,
  height = 28,
}) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data
    .map((val, idx) => {
      const x = pad + (idx / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((val - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const stroke = positive ? '#059669' : '#DC2626';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface BenchmarkChartProps {
  symbolName: string;
  currency?: string;
  points: { date: string; close: number }[];
}

export const LiveIndexChart: React.FC<BenchmarkChartProps> = ({
  symbolName,
  currency = 'USD',
  points,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!points || points.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
        No live chart bars available.
      </div>
    );
  }

  const width = 680;
  const height = 200;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 26;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const vals = points.map((p) => p.close);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const padVal = (rawMax - rawMin || 10) * 0.14;
  const minVal = Math.max(0, rawMin - padVal);
  const maxVal = rawMax + padVal;
  const valRange = maxVal - minVal || 1;

  const getX = (idx: number) =>
    points.length <= 1 ? padLeft : padLeft + (idx / (points.length - 1)) * innerW;

  const getY = (val: number) =>
    padTop + innerH - ((val - minVal) / valRange) * innerH;

  const path = points
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(d.close).toFixed(1)}`)
    .join(' ');

  const areaPath = `${path} L ${getX(points.length - 1).toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;

  const isUp = points[points.length - 1].close >= points[0].close;
  const strokeColor = isUp ? '#059669' : '#DC2626';

  const activeIdx = hoverIdx !== null && hoverIdx < points.length ? hoverIdx : points.length - 1;
  const activePoint = points[activeIdx];

  const yTicks = [0, 0.5, 1].map((ratio) => {
    const val = minVal + ratio * valRange;
    return { val, y: getY(val) };
  });

  return (
    <div>
      {activePoint && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2 text-xs text-slate-500">
          <span className="font-medium text-slate-800">{symbolName}</span>
          <span>{activePoint.date}</span>
          <span>
            Close:{' '}
            <strong className="font-mono tabular-nums text-slate-900">
              {currency === 'INDEX'
                ? activePoint.close.toLocaleString('en-US', { maximumFractionDigits: 2 })
                : formatCurrency(activePoint.close, 2, currency)}
            </strong>
          </span>
        </div>
      )}

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block select-none"
          onMouseLeave={() => setHoverIdx(null)}
          role="img"
          aria-label={`Live chart for ${symbolName}`}
        >
          <defs>
            <linearGradient id="liveIndexGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={t.y}
                y2={t.y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={t.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(0)}
              </text>
            </g>
          ))}

          <path d={areaPath} fill="url(#liveIndexGrad)" />
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((d, idx) => {
            const x = getX(idx);
            const showLabel =
              idx === 0 ||
              idx === points.length - 1 ||
              idx === Math.floor(points.length / 2);

            return (
              <g key={`${d.date}-${idx}`}>
                {showLabel && (
                  <text
                    x={x}
                    y={height - 6}
                    textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {d.date}
                  </text>
                )}
                <rect
                  x={x - innerW / Math.max(points.length * 2, 2)}
                  y={padTop}
                  width={innerW / Math.max(points.length, 1)}
                  height={innerH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(idx)}
                />
              </g>
            );
          })}

          {activePoint && (
            <g pointerEvents="none">
              <line
                x1={getX(activeIdx)}
                x2={getX(activeIdx)}
                y1={padTop}
                y2={padTop + innerH}
                stroke="#CBD5E1"
                strokeWidth="1"
              />
              <circle
                cx={getX(activeIdx)}
                cy={getY(activePoint.close)}
                r="4"
                fill={strokeColor}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
