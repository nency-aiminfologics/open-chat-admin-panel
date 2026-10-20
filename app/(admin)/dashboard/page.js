"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getDashboardAnalytics, getDashboardLive } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { ErrorBanner, Spinner, fmtDateTime } from "@/components/ui";
import {
  RegistrationLineChart,
  IntakeBarChart,
  AccountStatusDonut,
  CountryHorizontalBars,
  fmtUtcShort,
} from "@/components/DashboardCharts";
import CountryStatusPivotTable from "@/components/CountryStatusPivotTable";

/**
 * Calculates UTC date string YYYY-MM-DD from today minus N days.
 * Includes today as day 1 (so 7 days = today - 6 days).
 */
function getUtcDateRange(daysCount) {
  const now = new Date();
  const toUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fromUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (daysCount - 1)));

  const fmt = (d) => d.toISOString().slice(0, 10);
  return {
    from: fmt(fromUtc),
    to: fmt(toUtc),
  };
}

const PRESETS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

export default function Dashboard() {
  const { token, can } = useStore();

  // Range state
  const [selectedPreset, setSelectedPreset] = useState(30);
  const [dateRange, setDateRange] = useState(() => getUtcDateRange(30));

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [isStaleAnalytics, setIsStaleAnalytics] = useState(false);

  // Live presence state
  const [liveData, setLiveData] = useState(null);
  const [liveError, setLiveError] = useState(false);

  // Active request tracking to cancel/ignore stale responses
  const activeRangeRef = useRef(dateRange);
  activeRangeRef.current = dateRange;

  // Permissions for drilldowns
  const canSeeUsers = can(PERMISSIONS.usersRead);
  const canSeeVerifications = can(PERMISSIONS.verificationRead);
  const canSeeReports = can(PERMISSIONS.reportsRead);
  const canSeeTickets = can(PERMISSIONS.supportRead);

  // Fetch Analytics
  const fetchAnalytics = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      if (!silent) setAnalyticsLoading(true);
      setAnalyticsError("");

      const currentReqRange = activeRangeRef.current;
      try {
        const res = await getDashboardAnalytics(token, {
          from: currentReqRange.from,
          to: currentReqRange.to,
        });

        // Ignore stale responses after range changes
        if (
          activeRangeRef.current.from !== currentReqRange.from ||
          activeRangeRef.current.to !== currentReqRange.to
        ) {
          return;
        }

        setAnalytics(res);
        setIsStaleAnalytics(false);
      } catch (err) {
        if (
          activeRangeRef.current.from === currentReqRange.from &&
          activeRangeRef.current.to === currentReqRange.to
        ) {
          setAnalyticsError(err.message || "Failed to load dashboard analytics");
          setIsStaleAnalytics(true); // Preserve previous chart data if available
        }
      } finally {
        if (!silent) setAnalyticsLoading(false);
      }
    },
    [token]
  );

  // Fetch Live Presence
  const fetchLive = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getDashboardLive(token);
      setLiveData(res);
      setLiveError(false);
    } catch {
      setLiveError(true);
    }
  }, [token]);

  // Handle Preset Change
  const handlePresetSelect = (days) => {
    setSelectedPreset(days);
    const newRange = getUtcDateRange(days);
    setDateRange(newRange);
  };

  // Initial load and range changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics, dateRange]);

  // Analytics visible-tab polling (every 60s)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAnalytics({ silent: true });
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  // Live presence visible-tab polling (every 15s)
  useEffect(() => {
    fetchLive();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchLive();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchLive]);

  const snapshot = analytics?.snapshot;
  const period = analytics?.period;
  const rangeInfo = analytics?.range;

  // Format percent change or handle baseline
  const renderComparison = (comparison) => {
    if (!comparison) return null;
    const { percentChange, current } = comparison;
    if (percentChange === null || percentChange === undefined) {
      return (
        <span className="text-xs font-normal text-slate-400">
          No previous baseline
        </span>
      );
    }
    const isPositive = percentChange >= 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
          isPositive ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {isPositive ? "↑ +" : "↓ "}
        {percentChange}%
        <span className="font-normal text-slate-400 ml-1">vs previous period</span>
      </span>
    );
  };

  // Format date range title in dropdown button
  const formattedRangeLabel =
    rangeInfo?.from && rangeInfo?.to
      ? `${fmtUtcShort(rangeInfo.from)} – ${fmtUtcShort(rangeInfo.to)} ${rangeInfo.to.slice(0, 4)} · UTC`
      : `${fmtUtcShort(dateRange.from)} – ${fmtUtcShort(dateRange.to)} ${dateRange.to.slice(0, 4)} · UTC`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Operations Overview & Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">Operations overview</p>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          {/* Preset selector button group */}
          <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => handlePresetSelect(p.days)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedPreset === p.days
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
            </svg>
            <span className="font-medium text-slate-700">{formattedRangeLabel}</span>
            {rangeInfo?.includesPartialToday && (
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
                Today is incomplete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error banner with retry */}
      {analyticsError && (
        <ErrorBanner
          error={analyticsError + (isStaleAnalytics ? " (Displaying last known snapshot)" : "")}
          onRetry={() => fetchAnalytics()}
        />
      )}

      {analyticsLoading && !analytics ? (
        <Spinner />
      ) : (
        <>
          {/* Section: Current snapshot cards (6 cards) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                Current snapshot
              </h2>
              {analytics?.generatedAt && (
                <span className="text-[11px] text-slate-400">
                  Updated: {fmtDateTime(analytics.generatedAt)}
                </span>
              )}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
              {/* Card 1: Total accounts */}
              <div className="card p-4 transition hover:border-slate-300">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                  </span>
                  <span>Total accounts</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {snapshot?.totalAccounts ?? 0}
                  </span>
                  {canSeeUsers && (
                    <Link href="/users" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      View →
                    </Link>
                  )}
                </div>
              </div>

              {/* Card 2: Active accounts */}
              <div className="card p-4 transition hover:border-slate-300">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>Active accounts</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {snapshot?.activeAccounts ?? 0}
                  </span>
                  {canSeeUsers && (
                    <Link href="/users?isActive=true" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      View →
                    </Link>
                  )}
                </div>
              </div>

              {/* Card 3: Online now (live Socket.IO presence) */}
              <div className="card p-4 transition hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </span>
                    <span>Online now</span>
                  </div>
                  {!liveError && (
                    <span className="relative flex h-2 w-2" title="Live cluster socket presence">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  {liveError ? (
                    <span className="text-xs font-medium text-amber-600">Presence unavailable</span>
                  ) : (
                    <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {liveData?.onlineAccounts ?? "—"}
                    </span>
                  )}
                  {canSeeUsers && (
                    <Link href="/users?tab=online" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Users →
                    </Link>
                  )}
                </div>
              </div>

              {/* Card 4: Pending verification */}
              <div className="card p-4 transition hover:border-slate-300">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </span>
                  <span>Pending verification</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {snapshot?.pendingVerificationAccounts ?? 0}
                  </span>
                  {canSeeVerifications && (
                    <Link href="/identity" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Queue →
                    </Link>
                  )}
                </div>
              </div>

              {/* Card 5: Open reports */}
              <div className="card p-4 transition hover:border-slate-300">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                    </svg>
                  </span>
                  <span>Open reports</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {snapshot?.openReports ?? 0}
                  </span>
                  {canSeeReports && (
                    <Link href="/reports" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Review →
                    </Link>
                  )}
                </div>
              </div>

              {/* Card 6: Open tickets */}
              <div className="card p-4 transition hover:border-slate-300">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                  </span>
                  <span>Open tickets</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {snapshot?.openTickets ?? 0}
                  </span>
                  {canSeeTickets && (
                    <Link href="/support" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Tickets →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 1: New registrations line chart & Current account status donut */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* New registrations line chart (2 cols on lg) */}
            <div className="card p-5 lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-semibold text-slate-900">New registrations</h2>
                  <p className="text-xs text-slate-400">Account creation events across selected range</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">
                    {period?.registrations?.current ?? 0} registrations
                  </div>
                  <div>{renderComparison(period?.registrations)}</div>
                </div>
              </div>

              <RegistrationLineChart data={analytics?.daily || []} />
            </div>

            {/* Current account status donut (1 col on lg) */}
            <div className="card p-5">
              <div className="mb-4 border-b border-slate-100 pb-3">
                <h2 className="font-semibold text-slate-900">Current account status</h2>
                <p className="text-xs text-slate-400">All-time active, suspended & deleted accounts</p>
              </div>

              <AccountStatusDonut
                breakdowns={analytics?.breakdowns?.usersByStatus || []}
                totalAccounts={snapshot?.totalAccounts ?? 0}
              />
            </div>
          </div>

          {/* Row 2: Reports & support intake grouped bars & Accounts by country bars */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Reports & support intake (2 cols on lg) */}
            <div className="card p-5 lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Reports & support intake</h2>
                  <p className="text-xs text-slate-400">Creation volume (intake, not resolved counts)</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#745EBB]" />
                    Reports filed ({period?.reportsFiled?.current ?? 0})
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D0C1FF]" />
                    Tickets created ({period?.ticketsCreated?.current ?? 0})
                  </span>
                </div>
              </div>

              <IntakeBarChart data={analytics?.daily || []} />
            </div>

            {/* Accounts by country · Current (1 col on lg) */}
            <div className="card p-5">
              <div className="mb-4 border-b border-slate-100 pb-3">
                <h2 className="font-semibold text-slate-900">Accounts by country · Current</h2>
                <p className="text-xs text-slate-400">Top account volume by country code</p>
              </div>

              <CountryHorizontalBars pivot={analytics?.countryStatusPivot || []} />
            </div>
          </div>

          {/* Row 3: Country / account status · Current Full-width Pivot Table */}
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-semibold text-slate-900">Country / account status · Current</h2>
                <p className="text-xs text-slate-400">
                  Detailed distribution across active, suspended, and deleted states
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Sorted by column click · All-time snapshot
              </span>
            </div>

            <CountryStatusPivotTable data={analytics?.countryStatusPivot || []} />

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Date filter applies to trends only. Account snapshots and country breakdown reflect current state.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
