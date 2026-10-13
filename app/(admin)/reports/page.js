"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { listReports, updateReportStatus } from "@/lib/api";
import { Badge, Empty, ErrorBanner, PageHeader, Pagination, Spinner, Tabs, UserCell, fmtDate } from "@/components/ui";

const STATUSES = ["open", "reviewed", "dismissed"];

const ICON_TONE = {
  neutral: "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
  success: "border border-success/30 bg-white text-success hover:bg-success-tint",
};

function IconButton({ label, tone = "neutral", ...props }) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${ICON_TONE[tone]}`}
    >
      {props.children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export default function ReportsPage() {
  const { token } = useStore();
  const toast = useToast();
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listReports(token, { page, limit: 20, status })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page, status]);

  const setStatusFor = async (id, newStatus) => {
    setBusyId(id);
    try {
      await updateReportStatus(token, id, newStatus);
      toast(newStatus === "dismissed" ? "Report dismissed" : "Report marked reviewed", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const list = result?.items || [];

  return (
    <>
      <PageHeader title="Reports" subtitle="Review reports filed by users" />
      <ErrorBanner error={error} onRetry={load} />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={STATUSES.map((s) => ({ value: s, label: s }))}
      />

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Reported user</th>
                  <th className="th">Reporter</th>
                  <th className="th">Reason</th>
                  <th className="th">Created</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="td">
                      <UserCell userId={r.reportedUserId} user={r.reportedUser} size="sm" />
                    </td>
                    <td className="td">
                      <UserCell userId={r.reporterId} user={r.reporter} size="sm" />
                    </td>
                    <td className="td">{r.reason}</td>
                    <td className="td">{fmtDate(r.createdAt)}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === "open" && (
                          <>
                            <IconButton
                              label="Dismiss"
                              disabled={busyId === r.id}
                              onClick={() => setStatusFor(r.id, "dismissed")}
                            >
                              <XCircleIcon />
                            </IconButton>
                            <IconButton
                              tone="success"
                              label="Reviewed"
                              disabled={busyId === r.id}
                              onClick={() => setStatusFor(r.id, "reviewed")}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </>
                        )}
                        {r.status !== "open" && <Badge status={r.status} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty text={`No ${status} reports`} />}
            {result && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hasPreviousPage={result.hasPreviousPage}
                hasNextPage={result.hasNextPage}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
