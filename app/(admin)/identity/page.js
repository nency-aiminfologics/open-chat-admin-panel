"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { listVerifications } from "@/lib/api";
import { Badge, Empty, ErrorBanner, PageHeader, Pagination, Spinner, Tabs, UserCell, fmtDateTime } from "@/components/ui";

const STATUSES = ["submitted", "under_review", "approved", "rejected", "draft"];

export default function IdentityPage() {
  const { token } = useStore();
  const [status, setStatus] = useState("submitted");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listVerifications(token, { page, limit: 20, status })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page, status]);

  const list = result?.items || [];

  return (
    <>
      <PageHeader title="Verification Queue" subtitle="Review identity and skill submissions" />
      <ErrorBanner error={error} onRetry={load} />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))}
      />

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">User</th>
                  <th className="th">Status</th>
                  <th className="th">Video review</th>
                  <th className="th">Updated</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="td">
                      <UserCell userId={v.userId} user={v.user} />
                    </td>
                    <td className="td">
                      <Badge status={v.status} />
                    </td>
                    <td className="td">{v.videoReviewStatus || "—"}</td>
                    <td className="td">{fmtDateTime(v.updatedAt)}</td>
                    <td className="td text-right">
                      <Link href={`/identity/${v.id}`} className="btn-secondary !px-3 !py-1.5">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty text={`No ${status.replace("_", " ")} submissions`} />}
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
