"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { listVerifications } from "@/lib/api";
import { Badge, Empty, ErrorBanner, PageHeader, Pagination, Spinner, Tabs, UserCell, fmtDateTime } from "@/components/ui";

const STATUSES = ["submitted", "under_review", "approved", "rejected", "draft"];

function IconButton({ label, as: Comp = "button", ...props }) {
  return (
    <Comp
      {...props}
      aria-label={label}
      className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
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
                      <div className="flex justify-end">
                        <IconButton as={Link} href={`/identity/${v.id}`} label="Review">
                          <EyeIcon />
                        </IconButton>
                      </div>
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
