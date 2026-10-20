"use client";

import { useId, useState } from "react";

// Standard UTC Date Formatter for Charts (e.g., "21 Sep")
export function fmtUtcShort(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function fmtUtcFull(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Registration Trend Line Chart: Straight segments, integer axes, hover tooltip with exact date/count.
 * Matches user theme using primary brand color #AA8FFF (#8E75DD / #745EBB / #F6F4FF).
 */
export function RegistrationLineChart({ data = [], height = 240 }) {
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No registration data for selected range
      </div>
    );
  }

  const W = 640;
  const H = height;
  const pad = { top: 20, right: 24, bottom: 36, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.registrations || 0), 0);
  // Ensure integer steps of at least 2 or 5
  let niceMax = 5;
  if (maxVal > 0) {
    const rawStep = Math.ceil(maxVal / 4);
    niceMax = Math.max(rawStep * 4, 4);
  }

  const n = data.length;
  const x = (i) => (n <= 1 ? pad.left + innerW / 2 : pad.left + (i / (n - 1)) * innerW);
  const y = (v) => pad.top + innerH - (niceMax === 0 ? 0 : (v / niceMax) * innerH);

  // Y-axis ticks (5 integer ticks: 0, 1/4, 2/4, 3/4, max)
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax].map((v) => Math.round(v));
  const uniqueYTicks = Array.from(new Set(yTicks));

  // Determine X-axis labels interval to avoid overlapping
  const labelInterval = Math.max(1, Math.floor(n / 7));
  const xTickIndices = [];
  for (let i = 0; i < n; i += labelInterval) {
    xTickIndices.push(i);
  }
  if (!xTickIndices.includes(n - 1)) {
    xTickIndices.push(n - 1);
  }

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.registrations || 0).toFixed(1)}`)
    .join(" ");

  const areaPath =
    n > 1
      ? `${linePath} L ${x(n - 1).toFixed(1)} ${pad.top + innerH} L ${x(0).toFixed(1)} ${pad.top + innerH} Z`
      : "";

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (pad.left / W) * rect.width) / ((innerW / W) * rect.width)));
    const idx = Math.min(Math.round(ratio * (n - 1)), n - 1);
    setHoverIdx(idx);
  };

  const hoveredItem = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#AA8FFF" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#AA8FFF" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y Axis Grid Lines & Labels */}
        {uniqueYTicks.map((val) => (
          <g key={val}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(val)}
              y2={y(val)}
              stroke="#E8E0FA"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(val)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-500 text-[10px] font-medium tabular-nums"
            >
              {val}
            </text>
          </g>
        ))}

        {/* Y-axis Title */}
        <text
          x={pad.left - 24}
          y={pad.top - 8}
          textAnchor="start"
          className="fill-slate-500 text-[9px] uppercase tracking-wider font-semibold"
        >
          Accounts
        </text>

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {/* Line Path with user primary color #8E75DD / #745EBB */}
        <path
          d={linePath}
          fill="none"
          stroke="#745EBB"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const cx = x(i);
          const cy = y(d.registrations || 0);
          const isHovered = hoverIdx === i;
          return (
            <circle
              key={d.date || i}
              cx={cx}
              cy={cy}
              r={isHovered ? 5.5 : 3.2}
              fill="#ffffff"
              stroke="#745EBB"
              strokeWidth={isHovered ? 3 : 2}
              className="transition-all duration-150 cursor-pointer"
            />
          );
        })}

        {/* Hover vertical guideline */}
        {hoverIdx != null && (
          <line
            x1={x(hoverIdx)}
            x2={x(hoverIdx)}
            y1={pad.top}
            y2={pad.top + innerH}
            stroke="#AA8FFF"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* X Axis Labels */}
        {xTickIndices.map((i) => {
          const item = data[i];
          if (!item) return null;
          return (
            <text
              key={i}
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-medium"
            >
              {fmtUtcShort(item.date)}
            </text>
          );
        })}

        {/* X-axis title / Date label */}
        <text
          x={W / 2}
          y={H - 0}
          textAnchor="middle"
          className="fill-slate-500 text-[9px] uppercase tracking-wider font-semibold"
        >
          Date (UTC)
        </text>
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm border border-brand-500/30"
          style={{
            left: `${(x(hoverIdx) / W) * 100}%`,
            top: `${(y(hoveredItem.registrations || 0) / H) * 100}%`,
            marginTop: "-10px",
          }}
        >
          <div className="font-semibold text-brand-200">
            {hoveredItem.registrations || 0}{" "}
            <span className="font-normal text-white">registration{hoveredItem.registrations === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-300">{fmtUtcFull(hoveredItem.date)}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Reports & Support Intake Grouped Bar Chart:
 * Uses user theme: reportsFiled (primary brand #745EBB) and ticketsCreated (primary lavender tint #D0C1FF).
 */
export function IntakeBarChart({ data = [], height = 240 }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No intake data for selected range
      </div>
    );
  }

  const W = 640;
  const H = height;
  const pad = { top: 20, right: 24, bottom: 36, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.reportsFiled || 0, d.ticketsCreated || 0)),
    0
  );

  let niceMax = 5;
  if (maxVal > 0) {
    const rawStep = Math.ceil(maxVal / 4);
    niceMax = Math.max(rawStep * 4, 4);
  }

  const n = data.length;
  const bandWidth = innerW / n;
  const groupBarWidth = Math.min(Math.max((bandWidth - 4) / 2, 2), 12);
  const y = (v) => pad.top + innerH - (niceMax === 0 ? 0 : (v / niceMax) * innerH);
  const baseline = pad.top + innerH;

  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax].map((v) => Math.round(v));
  const uniqueYTicks = Array.from(new Set(yTicks));

  const labelInterval = Math.max(1, Math.floor(n / 7));
  const xTickIndices = [];
  for (let i = 0; i < n; i += labelInterval) {
    xTickIndices.push(i);
  }
  if (!xTickIndices.includes(n - 1)) {
    xTickIndices.push(n - 1);
  }

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (pad.left / W) * rect.width) / ((innerW / W) * rect.width)));
    const idx = Math.min(Math.floor(ratio * n), n - 1);
    setHoverIdx(idx);
  };

  const hoveredItem = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Y Axis Grid Lines & Labels */}
        {uniqueYTicks.map((val) => (
          <g key={val}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(val)}
              y2={y(val)}
              stroke="#E8E0FA"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(val)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-500 text-[10px] font-medium tabular-nums"
            >
              {val}
            </text>
          </g>
        ))}

        {/* Y-axis Title */}
        <text
          x={pad.left - 24}
          y={pad.top - 8}
          textAnchor="start"
          className="fill-slate-500 text-[9px] uppercase tracking-wider font-semibold"
        >
          Count
        </text>

        {/* Bars */}
        {data.map((d, i) => {
          const bandStart = pad.left + i * bandWidth;
          const bandCenter = bandStart + bandWidth / 2;
          const rH = Math.max(baseline - y(d.reportsFiled || 0), 0);
          const tH = Math.max(baseline - y(d.ticketsCreated || 0), 0);
          const isHovered = hoverIdx === i;

          return (
            <g key={d.date || i} opacity={hoverIdx == null || isHovered ? 1 : 0.45}>
              {/* Reports filed bar (brand #745EBB) */}
              <rect
                x={bandCenter - groupBarWidth - 1}
                y={y(d.reportsFiled || 0)}
                width={groupBarWidth}
                height={rH}
                rx={groupBarWidth > 4 ? 2 : 1}
                fill="#745EBB"
                className="transition-opacity duration-150"
              />
              {/* Tickets created bar (brand lavender #D0C1FF) */}
              <rect
                x={bandCenter + 1}
                y={y(d.ticketsCreated || 0)}
                width={groupBarWidth}
                height={tH}
                rx={groupBarWidth > 4 ? 2 : 1}
                fill="#D0C1FF"
                className="transition-opacity duration-150"
              />
            </g>
          );
        })}

        {/* X Axis Labels */}
        {xTickIndices.map((i) => {
          const item = data[i];
          if (!item) return null;
          const bandCenter = pad.left + i * bandWidth + bandWidth / 2;
          return (
            <text
              key={i}
              x={bandCenter}
              y={H - 12}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-medium"
            >
              {fmtUtcShort(item.date)}
            </text>
          );
        })}

        {/* X-axis title / Date label */}
        <text
          x={W / 2}
          y={H - 0}
          textAnchor="middle"
          className="fill-slate-500 text-[9px] uppercase tracking-wider font-semibold"
        >
          Date (UTC)
        </text>
      </svg>

      {/* Hover Tooltip */}
      {hoveredItem && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm border border-brand-500/30"
          style={{
            left: `${((pad.left + hoverIdx * bandWidth + bandWidth / 2) / W) * 100}%`,
            top: `${(Math.min(y(hoveredItem.reportsFiled || 0), y(hoveredItem.ticketsCreated || 0)) / H) * 100}%`,
            marginTop: "-10px",
          }}
        >
          <div className="font-semibold text-slate-100">{fmtUtcFull(hoveredItem.date)}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#745EBB]" />
            <span className="text-slate-300">Reports filed:</span>
            <span className="font-semibold text-white">{hoveredItem.reportsFiled || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#D0C1FF]" />
            <span className="text-slate-300">Tickets created:</span>
            <span className="font-semibold text-white">{hoveredItem.ticketsCreated || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Current Account Status Donut:
 * Uses user brand primary theme: Active (#745EBB), Suspended (#D0C1FF), Deleted (#A991B7).
 */
export function AccountStatusDonut({ breakdowns = [], totalAccounts = 0 }) {
  const STATUS_CONFIG = {
    active: { label: "Active", color: "#745EBB", bgClass: "bg-[#745EBB]" },
    suspended: { label: "Suspended", color: "#D0C1FF", bgClass: "bg-[#D0C1FF]" },
    deleted: { label: "Deleted", color: "#A991B7", bgClass: "bg-[#A991B7]" },
  };

  const items = breakdowns.map((b) => {
    const cfg = STATUS_CONFIG[b.status] || {
      label: b.status.charAt(0).toUpperCase() + b.status.slice(1),
      color: "#D8CCFF",
      bgClass: "bg-brand-200",
    };
    return {
      status: b.status,
      label: cfg.label,
      value: b.count,
      color: cfg.color,
      bgClass: cfg.bgClass,
    };
  });

  const sum = items.reduce((acc, it) => acc + (it.value || 0), 0) || totalAccounts;
  const size = 180;
  const thickness = 22;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = sum > 0 ? Math.min(4, c * 0.015) : 0;

  let cumulative = 0;
  const arcs = items.map((it) => {
    const frac = sum > 0 ? it.value / sum : 0;
    const len = Math.max(frac * c - gap, 0);
    const offset = cumulative;
    cumulative += frac * c;
    const pct = sum > 0 ? Math.round(frac * 100) : 0;
    return { ...it, len, offset, pct };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#F6F4FF"
            strokeWidth={thickness}
          />
          {sum > 0 &&
            arcs.map((a) => (
              <circle
                key={a.status}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={thickness}
                strokeDasharray={`${a.len} ${c - a.len}`}
                strokeDashoffset={-a.offset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-slate-800 tabular-nums">
            {sum}
          </span>
          <span className="text-xs font-medium text-slate-500">Total accounts</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full sm:w-48 space-y-2.5">
        {arcs.map((a) => (
          <div key={a.status} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <span className={`h-3 w-3 rounded-full ${a.bgClass}`} />
              <span className="text-slate-600 font-medium">{a.label}</span>
            </div>
            <span className="font-semibold tabular-nums text-slate-800">{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Country Horizontal Bars:
 * Uses user primary brand purple scale: #745EBB, #8E75DD, #AA8FFF, #D0C1FF, #E5DDFF.
 */
export function CountryHorizontalBars({ pivot = [] }) {
  const maxTotal = Math.max(...pivot.map((p) => p.total || 0), 1);

  return (
    <div className="space-y-3.5 py-1">
      {pivot.length === 0 && (
        <p className="text-sm text-slate-400">No country data available</p>
      )}
      {pivot.map((p, idx) => {
        const pct = Math.max(Math.round(((p.total || 0) / maxTotal) * 100), 2);
        // Primary brand purple scale
        const bgTone =
          idx === 0
            ? "bg-[#745EBB]"
            : idx === 1
            ? "bg-[#8E75DD]"
            : idx === 2
            ? "bg-[#AA8FFF]"
            : idx === 3
            ? "bg-[#D0C1FF]"
            : "bg-[#E5DDFF]";

        return (
          <div key={p.country || idx} className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="w-20 sm:w-24 shrink-0 truncate font-medium text-slate-700" title={p.countryName || p.country}>
              {p.countryName || p.country || "Unknown"}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-brand-50">
              <div
                className={`h-full rounded-md transition-all duration-500 ${bgTone}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 text-right font-semibold tabular-nums text-slate-800">
              {p.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
