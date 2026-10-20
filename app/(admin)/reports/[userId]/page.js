"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { listReportsForUser, updateReportStatus } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import StrikeDialog from "@/components/StrikeDialog";
import BlockHistorySection from "@/components/BlockHistorySection";
import {
  BackLink,
  Badge,
  CountChip,
  Empty,
  ErrorBanner,
  PageHeader,
  Pagination,
  Spinner,
  Tabs,
  UserCell,
  fmtDateTime,
} from "@/components/ui";

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

export default function UserReportsPage() {
  const { userId } = useParams();
  const { token, can } = useStore();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [strikeOpen, setStrikeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("reports");

  const canModerate = can(PERMISSIONS.reportsModerate);

  const load = () => {
    if (!token || !userId) return;
    setLoading(true);
    setError("");
    listReportsForUser(token, userId, { page, limit: 20 })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, userId, page]);

  const setStatusFor = async (reportId, status) => {
    setBusyId(reportId);
    try {
      await updateReportStatus(token, reportId, status);
      toast(status === "dismissed" ? "Report dismissed" : "Report marked reviewed", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <Spinner />;

  const reportedUser = data?.reportedUser;
  const reports = data?.reports;
  const list = reports?.items || [];

  return (
    <>
      <BackLink href="/reports" label="Back to reports" />
      <PageHeader
        title={reportedUser?.name || reportedUser?.email || "Reported user"}
        subtitle={
          reports ? `${reports.total} report${reports.total === 1 ? "" : "s"} filed, newest first` : "Reports filed"
        }
      >
        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Strikes
          <CountChip
            value={data?.strikeCount ?? 0}
            tone={data?.strikeCount > 1 ? "danger" : data?.strikeCount > 0 ? "warn" : "neutral"}
          />
        </span>
        {reportedUser && <Badge status={reportedUser.isActive === false ? "suspended" : "active"} />}
        <Link href={`/users/${userId}`} className="btn-secondary">
          View profile
        </Link>
        {canModerate && (
          <button className="btn-danger" onClick={() => setStrikeOpen(true)}>
            Record strike
          </button>
        )}
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: "reports", label: "Reports", count: reports?.total },
          { value: "activity", label: "Block / unblock activity" },
        ]}
      />

      {activeTab === "reports" ? (
        <div className="card overflow-x-auto">
          {loading ? (
            <Spinner />
          ) : (
            <>
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="th">Reporter</th>
                    <th className="th">Reason</th>
                    <th className="th">Details</th>
                    <th className="th">Filed</th>
                    <th className="th text-right">Status / actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="td">
                        <UserCell userId={r.reporterId} user={r.reporter} size="sm" />
                      </td>
                      <td className="td">{r.reason}</td>
                      <td className="td max-w-xs truncate text-slate-600" title={r.description || r.details || ""}>
                        {r.description || r.details || "—"}
                      </td>
                      <td className="td">{fmtDateTime(r.createdAt)}</td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "open" && canModerate ? (
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
                          ) : (
                            <Badge status={r.status} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && <Empty text="No reports on this page" />}
              {reports && (
                <Pagination
                  page={reports.page}
                  totalPages={reports.totalPages}
                  hasPreviousPage={reports.hasPreviousPage}
                  hasNextPage={reports.hasNextPage}
                  onChange={setPage}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <BlockHistorySection userId={userId} token={token} reporters={list} />
      )}

      <StrikeDialog
        open={strikeOpen}
        onClose={() => setStrikeOpen(false)}
        token={token}
        user={reportedUser || { id: userId }}
        strikeCount={data?.strikeCount ?? 0}
        onDone={load}
      />
    </>
  );
}
