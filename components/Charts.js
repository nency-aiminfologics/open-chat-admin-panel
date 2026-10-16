"use client";

import { useId, useState } from "react";
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
 * Single-series bar trend with a pointer-tracking hover highlight + tooltip.
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

  const bandWidth = innerW / data.length;
  const barWidth = Math.min(bandWidth * 0.6, 36);
  const xCenter = (i) => padding.left + i * bandWidth + bandWidth / 2;
  const y = (v) => padding.top + innerH - (v / niceMax) * innerH;
  const baseline = padding.top + innerH;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.floor(frac * data.length);
    setHoverIdx(Math.min(Math.max(idx, 0), data.length - 1));
  };

  const ticks = [0, niceMax / 2, niceMax];
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
        {data.map((d, i) => (
          <rect
            key={d.date ?? i}
            x={xCenter(i) - barWidth / 2}
            y={y(d.count)}
            width={barWidth}
            height={Math.max(baseline - y(d.count), 0)}
            rx={4}
            fill="currentColor"
            opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.35}
            className="transition-opacity duration-150"
          />
        ))}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(xCenter(hoverIdx) / W) * 100}%`, top: `${(y(hovered.count) / H) * 100}%` }}
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

/**
 * Partial-ring gauge for a single live value against a max (e.g. online users out of
 * active users). Rounded cap, optional pulsing "live" dot, big center figure.
 */
export function RadialGauge({
  value,
  max,
  size = 148,
  thickness = 14,
  color = "text-success",
  trackColor = "text-slate-100",
  centerValue,
  centerLabel,
  live = false,
}) {
  const safeMax = max > 0 ? max : Math.max(value, 1);
  const frac = Math.min(Math.max(safeMax ? value / safeMax : 0, 0), 1);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = frac * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className={`${color} transition-[stroke-dasharray] duration-700 ease-out`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {live && (
          <span className="relative mb-0.5 flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color.replace("text-", "bg-")}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color.replace("text-", "bg-")}`} />
          </span>
        )}
        <span className="text-3xl font-semibold tabular-nums text-slate-800">{centerValue}</span>
        {centerLabel && <span className="max-w-[9ch] text-center text-[11px] leading-tight text-slate-400">{centerLabel}</span>}
      </div>
    </div>
  );
}

/**
 * Minimal trend line for a short rolling buffer of samples (no axes/labels) — used where a
 * full TrendArea would be too heavy, e.g. a live-polled count inside a compact widget.
 */
export function Sparkline({ data, width = 240, height = 56, color = "text-success" }) {
  const gradientId = useId();
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-slate-300" style={{ width, height }}>
        Collecting trend…
      </div>
    );
  }

  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const maxV = Math.max(...data, 1);
  const minV = Math.min(...data, 0);
  const span = Math.max(maxV - minV, 1);

  const x = (i) => padding + (i / (data.length - 1)) * innerW;
  const y = (v) => padding + innerH - ((v - minV) / span) * innerH;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(2)} ${height - padding} L ${x(0).toFixed(2)} ${height - padding} Z`;
  const lastIdx = data.length - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={color}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(lastIdx)} cy={y(data[lastIdx])} r="3.5" fill="currentColor" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}
