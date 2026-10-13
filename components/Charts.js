"use client";

import { useState } from "react";
import { fmtDate } from "@/components/ui";

/**
 * Donut chart with a stable center figure, an always-visible legend (label + value + %),
 * and hover/focus highlighting synced between the arcs and the legend rows.
 */
export function Donut({ data, size = 160, thickness = 22, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hover, setHover] = useState(null);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = Math.min(6, c * 0.015);

  let cumulative = 0;
  const arcs = data.map((d, i) => {
    const frac = total ? d.value / total : 0;
    const len = Math.max(frac * c - gap, 0);
    const offset = cumulative;
    cumulative += frac * c;
    return { ...d, i, len, offset, pct: total ? Math.round(frac * 100) : 0 };
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-slate-100" />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={hover === a.i ? thickness + 4 : thickness}
              strokeDasharray={`${a.len} ${c - a.len}`}
              strokeDashoffset={-a.offset}
              tabIndex={0}
              role="img"
              aria-label={`${a.label}: ${a.value} (${a.pct}%)`}
              className={`${a.color} cursor-pointer outline-none transition-all duration-150`}
              onMouseEnter={() => setHover(a.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(a.i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-slate-800">
            {hover != null ? arcs[hover].value : centerValue}
          </span>
          <span className="text-xs text-slate-400">{hover != null ? arcs[hover].label : centerLabel}</span>
        </div>
      </div>
      <div className="min-w-[160px] space-y-1">
        {arcs.map((a) => (
          <div
            key={a.label}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${hover === a.i ? "bg-slate-50" : ""}`}
            onMouseEnter={() => setHover(a.i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.dot}`} />
            <span className="text-sm text-slate-600">{a.label}</span>
            <span className="ml-auto text-sm font-medium tabular-nums text-slate-800">{a.value}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-400">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Single-series area/line trend with a pointer-tracking crosshair + tooltip.
 * `data` is an ascending array of { date, count }.
 */
export function TrendArea({ data, seriesLabel = "New users", height = 220 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data || data.length < 2) return null;

  const W = 600;
  const H = height;
  const padding = { top: 16, right: 12, bottom: 24, left: 36 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  const maxV = Math.max(...data.map((d) => d.count), 1);
  const niceMax = Math.max(Math.ceil(maxV / 5) * 5, 5);

  const x = (i) => padding.left + (i / (data.length - 1)) * innerW;
  const y = (v) => padding.top + innerH - (v / niceMax) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(d.count).toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(2)} ${(padding.top + innerH).toFixed(2)} L ${x(0).toFixed(2)} ${(padding.top + innerH).toFixed(2)} Z`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(frac * (data.length - 1));
    setHoverIdx(Math.min(Math.max(idx, 0), data.length - 1));
  };

  const ticks = [0, niceMax / 2, niceMax];
  const last = data[data.length - 1];
  const hovered = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full text-brand-500"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padding.left}
              x2={W - padding.right}
              y1={y(t)}
              y2={y(t)}
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-100"
            />
            <text x={padding.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
              {t}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="currentColor" opacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(data.length - 1)} cy={y(last.count)} r="4" fill="currentColor" stroke="white" strokeWidth="2" />
        {hoverIdx != null && (
          <>
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-300"
            />
            <circle cx={x(hoverIdx)} cy={y(data[hoverIdx].count)} r="4" fill="currentColor" stroke="white" strokeWidth="2" />
          </>
        )}
      </svg>
      <span
        className="pointer-events-none absolute whitespace-nowrap text-xs font-medium tabular-nums text-slate-700"
        style={{
          left: `${(x(data.length - 1) / W) * 100}%`,
          top: `${(y(last.count) / H) * 100}%`,
          transform: "translate(-110%, -130%)",
        }}
      >
        {last.count}
      </span>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(x(hoverIdx) / W) * 100}%`, top: `${(y(hovered.count) / H) * 100}%` }}
        >
          <p className="font-semibold tabular-nums">
            {hovered.count} <span className="font-normal text-white/60">{seriesLabel.toLowerCase()}</span>
          </p>
          <p className="text-white/60">{fmtDate(hovered.date)}</p>
        </div>
      )}
    </div>
  );
}
