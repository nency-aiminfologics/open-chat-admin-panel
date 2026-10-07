"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Badge, Empty, Modal, PageHeader, Tabs, fmtDate } from "@/components/ui";

export default function ReportsPage() {
  const { users, reports, blocks, setUserStatus, resolveReport } = useStore();
  const [tab, setTab] = useState("reports");
  const [confirm, setConfirm] = useState(null); // { user, reportId? }

  const byId = (id) => users.find((u) => u.id === id);
  const reportCount = (uid) => reports.filter((r) => r.reportedUserId === uid).length;
  const blockCount = (uid) => blocks.filter((b) => b.blockedId === uid).length;

  const suspend = () => {
    setUserStatus(confirm.user.id, "suspended");
    if (confirm.reportId) resolveReport(confirm.reportId);
    setConfirm(null);
  };

  return (
    <>
      <PageHeader title="Reports & Blocks" subtitle="Review reports and decide whether to suspend an account" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "reports", label: "Reported users", count: reports.length },
          { value: "blocks", label: "Blocked users", count: blocks.length },
        ]}
      />

      {tab === "reports" && (
        <div className="space-y-4">
          {reports.length === 0 && (
            <div className="card">
              <Empty text="No reports" />
            </div>
          )}
          {reports.map((r) => {
            const u = byId(r.reportedUserId);
            if (!u) return null;
            return (
              <div key={r.id} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/users/${u.id}`} className="font-semibold text-brand-600 hover:underline">
                      {u.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {reportCount(u.id)} report(s) · blocked by {blockCount(u.id)} user(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge status={u.status} />
                    <Badge status={r.status} />
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p>
                    <b>Reason:</b> {r.reason}
                  </p>
                  {r.details && <p className="mt-1 text-slate-600">{r.details}</p>}
                  <p className="mt-2 text-xs text-slate-400">
                    Reported by {r.reportedBy} on {fmtDate(r.createdAt)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {r.status === "open" && (
                    <button className="btn-secondary" onClick={() => resolveReport(r.id)}>
                      Dismiss / Resolve
                    </button>
                  )}
                  {u.status === "active" ? (
                    <button className="btn-danger" onClick={() => setConfirm({ user: u, reportId: r.id })}>
                      Suspend account
                    </button>
                  ) : (
                    <button className="btn-success" onClick={() => setUserStatus(u.id, "active")}>
                      Restore account
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "blocks" && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Blocked user</th>
                <th className="th">Blocked by</th>
                <th className="th">Date</th>
                <th className="th">Total blocks</th>
                <th className="th">Reports</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blocks.map((b) => {
                const blocked = byId(b.blockedId);
                const blocker = byId(b.blockerId);
                return (
                  <tr key={b.id}>
                    <td className="td font-medium">{blocked?.name}</td>
                    <td className="td">{blocker?.name}</td>
                    <td className="td">{fmtDate(b.createdAt)}</td>
                    <td className="td">{blockCount(b.blockedId)}</td>
                    <td className="td">{reportCount(b.blockedId)}</td>
                    <td className="td">{blocked && <Badge status={blocked.status} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {blocks.length === 0 && <Empty text="No blocked users" />}
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Suspend account"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={suspend}>
              Suspend
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Suspend {confirm?.user.name}? The report will be marked as resolved.
        </p>
      </Modal>
    </>
  );
}
