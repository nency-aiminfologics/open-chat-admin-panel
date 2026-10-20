"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getBlockHistory } from "@/lib/api";
import { Badge, Empty, ErrorBanner, Pagination, Spinner, UserCell, fmtDateTime } from "@/components/ui";

/**
 * Block/unblock activity section for admin report-detail view.
 * Displays audit events with actor, target, direction, blockId cycle tracking,
 * and direction-aware current pair state.
 */
export default function BlockHistorySection({ userId, token, reporters = [] }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [currentPairState, setCurrentPairState] = useState(null);
  const [historyCoverage, setHistoryCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [peerUserId, setPeerUserId] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  // Distinct reporter list passed from reports for quick peer filtering
  const distinctReporters = useMemo(() => {
    const map = new Map();
    reporters.forEach((r) => {
      const id = r.reporterId || r.reporter?.id || r.reporter?._id;
      if (id && !map.has(id)) {
        map.set(id, {
          id,
          name: r.reporter?.name || r.reporter?.email || id,
          user: r.reporter,
        });
      }
    });
    return Array.from(map.values());
  }, [reporters]);

  const fetchHistory = () => {
    if (!token || !userId) return;
    setLoading(true);
    setError("");

    const params = {
      page,
      limit: 10,
    };
    if (peerUserId) params.peerUserId = peerUserId;
    if (action) params.action = action;

    getBlockHistory(token, userId, params)
      .then((res) => {
        setItems(res?.items || []);
        setCurrentPairState(res?.currentPairState ?? null);
        setHistoryCoverage(res?.historyCoverage ?? null);
        setMeta({
          total: res?.total ?? 0,
          page: res?.page ?? 1,
          limit: res?.limit ?? 10,
          totalPages: res?.totalPages ?? 1,
          hasPreviousPage: res?.hasPreviousPage ?? false,
          hasNextPage: res?.hasNextPage ?? false,
        });
      })
      .catch((err) => {
        setError(err.message || "Failed to load block/unblock history");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, [token, userId, peerUserId, action, page]);

  const handlePeerChange = (newPeer) => {
    setPeerUserId(newPeer);
    setPage(1);
  };

  const handleActionChange = (newAction) => {
    setAction(newAction);
    setPage(1);
  };

  const selectedPeerObj = distinctReporters.find((r) => r.id === peerUserId);
  const selectedPeerLabel = selectedPeerObj?.name || peerUserId || "Peer";

  return (
    <div className="space-y-4">
      {/* Filters and controls toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Peer selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="peer-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Person:
            </label>
            <select
              id="peer-filter"
              value={peerUserId}
              onChange={(e) => handlePeerChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All related users</option>
              {distinctReporters.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="action-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Action:
            </label>
            <div id="action-filter" className="inline-flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-medium">
              {[
                { val: "", label: "All" },
                { val: "blocked", label: "Blocked" },
                { val: "unblocked", label: "Unblocked" },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => handleActionChange(btn.val)}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    action === btn.val ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Coverage note if applicable */}
        {historyCoverage === "recorded_events_only" && (
          <span className="text-xs text-slate-400">
            Recorded audit events only (from deployment date)
          </span>
        )}
      </div>

      {/* Direction-aware Current Pair State Card (when peer is selected) */}
      {peerUserId && (
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50/60 to-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand-500 ring-4 ring-brand-100" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Current Relationship Status
              </span>
            </div>
            {currentPairState?.asOf && (
              <span className="text-xs text-slate-400">
                As of: {fmtDateTime(currentPairState.asOf)}
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-xs ring-1 ring-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">Reported User → {selectedPeerLabel}</span>
                <span className="text-sm font-semibold text-slate-800">
                  {currentPairState?.userBlocksPeer ? "Currently Blocking" : "Not Blocking"}
                </span>
              </div>
              <Badge status={currentPairState?.userBlocksPeer ? "blocked" : "active"} />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-xs ring-1 ring-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">{selectedPeerLabel} → Reported User</span>
                <span className="text-sm font-semibold text-slate-800">
                  {currentPairState?.peerBlocksUser ? "Currently Blocking" : "Not Blocking"}
                </span>
              </div>
              <Badge status={currentPairState?.peerBlocksUser ? "blocked" : "active"} />
            </div>
          </div>
        </div>
      )}

      <ErrorBanner error={error} onRetry={fetchHistory} />

      {/* Activity Timeline Card */}
      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Actor (Who acted)</th>
                  <th className="th">Action</th>
                  <th className="th">Target (Affected)</th>
                  <th className="th">Direction</th>
                  <th className="th">Occurred</th>
                  <th className="th">Cycle Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const actorId = item.actorId || item.actor?.id || item.actor?._id;
                  const targetId = item.targetId || item.target?.id || item.target?._id;
                  const isBlocked = item.action === "blocked";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="td">
                        <UserCell userId={actorId} user={item.actor} size="sm" />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex h-2 w-2 rounded-full ${
                              isBlocked ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                          <Badge status={item.action} />
                        </div>
                      </td>
                      <td className="td">
                        <UserCell userId={targetId} user={item.target} size="sm" />
                      </td>
                      <td className="td">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                            item.direction === "incoming"
                              ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                              : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          }`}
                        >
                          {item.direction === "incoming" ? "↙ Incoming" : "↗ Outgoing"}
                        </span>
                      </td>
                      <td className="td whitespace-nowrap text-xs text-slate-600" title={item.occurredAt || ""}>
                        {fmtDateTime(item.occurredAt)}
                      </td>
                      <td className="td text-xs text-slate-500">
                        {item.blockId && (
                          <div className="flex flex-col gap-0.5">
                            {/* <span className="font-mono text-[11px] text-slate-400" title={`Block cycle: ${item.blockId}`}>
                              cycle: {item.blockId.slice(0, 8)}…
                            </span> */}
                            {item.blockedAt && (
                              <span className="text-[11px] text-slate-500" title={`Cycle started: ${item.blockedAt}`}>
                                started: {fmtDateTime(item.blockedAt)}
                              </span>
                            )}
                          </div>
                        )}
                        {!item.blockId && "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {items.length === 0 && <Empty text="No recorded block/unblock activity." />}

            {meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                hasPreviousPage={meta.hasPreviousPage}
                hasNextPage={meta.hasNextPage}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
