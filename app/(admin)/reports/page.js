"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { listReports, updateReportStatus } from "@/lib/api";
import { Badge, Empty, ErrorBanner, PageHeader, Pagination, Spinner, Tabs, fmtDate } from "@/components/ui";

const STATUSES = ["open", "reviewed", "dismissed"];

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
                      <Link href={`/users/${r.reportedUserId}`} className="font-mono text-xs text-brand-600 hover:underline">
                        {r.reportedUserId}
                      </Link>
                    </td>
                    <td className="td font-mono text-xs">{r.reporterId}</td>
                    <td className="td">{r.reason}</td>
                    <td className="td">{fmtDate(r.createdAt)}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === "open" && (
                          <>
                            <button
                              className="btn-secondary !px-3 !py-1.5"
                              disabled={busyId === r.id}
                              onClick={() => setStatusFor(r.id, "dismissed")}
                            >
                              Dismiss
                            </button>
                            <button
                              className="btn-success !px-3 !py-1.5"
                              disabled={busyId === r.id}
                              onClick={() => setStatusFor(r.id, "reviewed")}
                            >
                              Mark reviewed
                            </button>
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
