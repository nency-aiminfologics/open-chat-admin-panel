"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { listGroupedReports } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import StrikeDialog from "@/components/StrikeDialog";
import {
  Badge,
  CountChip,
  Empty,
  ErrorBanner,
  PageHeader,
  Pagination,
  Spinner,
  Tabs,
  UserCell,
  fmtRelative,
} from "@/components/ui";

const STATUSES = ["open", "reviewed", "dismissed"];

const ICON_TONE = {
  neutral: "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
  danger: "border border-danger/20 bg-white text-danger hover:bg-danger-tint",
};

function IconButton({ label, tone = "neutral", as: Comp = "button", ...props }) {
  return (
    <Comp
      {...props}
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${ICON_TONE[tone]}`}
    >
      {props.children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {label}
      </span>
    </Comp>
  );
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.01 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const GavelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);

export default function ReportsPage() {
  const { token, can } = useStore();
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [strikeTarget, setStrikeTarget] = useState(null);

  const canModerate = can(PERMISSIONS.reportsModerate);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listGroupedReports(token, { page, limit: 20, status })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page, status]);

  const list = result?.items || [];

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={
          result
            ? `${result.total} reported user${result.total === 1 ? "" : "s"} with ${status} reports`
            : "Users grouped by the reports filed against them"
        }
      />
      <ErrorBanner error={error} onRetry={load} />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={STATUSES.map((s) => ({ value: s, label: s }))}
      />

      <div className="card ">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full rounded-[20px]">
              <thead className="border-b border-slate-200 ">
                <tr>
                  <th className="th">Reported user</th>
                  <th className="th">Reports</th>
                  <th className="th">Strikes</th>
                  <th className="th">Last reported</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((r) => (
                  <tr key={r.reportedUserId} className="hover:bg-slate-50">
                    <td className="td">
                      {/* A deleted or missing referenced user comes back as null — the id still works. */}
                      <UserCell userId={r.reportedUserId} user={r.reportedUser} size="sm" link={false} />
                    </td>
                    <td className="td">
                      <CountChip value={r.reportCount} tone={r.reportCount > 4 ? "danger" : "neutral"} />
                    </td>
                    <td className="td">
                      <CountChip
                        value={r.strikeCount ?? 0}
                        tone={r.strikeCount > 1 ? "danger" : r.strikeCount > 0 ? "warn" : "neutral"}
                      />
                    </td>
                    <td className="td" title={r.lastReportedAt || ""}>
                      {fmtRelative(r.lastReportedAt)}
                    </td>
                    <td className="td">
                      <Badge status={r.status} />
                    </td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton as={Link} href={`/reports/${r.reportedUserId}`} label="View reports">
                          <EyeIcon />
                        </IconButton>
                        {canModerate && (
                          <IconButton
                            tone="danger"
                            label="Record strike"
                            onClick={() =>
                              setStrikeTarget({
                                user: r.reportedUser || { id: r.reportedUserId },
                                strikeCount: r.strikeCount ?? 0,
                              })
                            }
                          >
                            <GavelIcon />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty text={`No users with ${status} reports`} />}
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

      <StrikeDialog
        open={!!strikeTarget}
        onClose={() => setStrikeTarget(null)}
        token={token}
        user={strikeTarget?.user}
        strikeCount={strikeTarget?.strikeCount}
        onDone={load}
      />
    </>
  );
}
