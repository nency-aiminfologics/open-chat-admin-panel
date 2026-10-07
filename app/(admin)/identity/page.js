"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Empty, PageHeader, StatusChanger, Tabs, fmtDate } from "@/components/ui";

export default function IdentityPage() {
  const { users, setIdentityStatus } = useStore();
  const [tab, setTab] = useState("pending");

  const counts = (s) => users.filter((u) => u.identity?.status === s).length;
  const list = users.filter((u) => u.identity?.status === tab);

  return (
    <>
      <PageHeader title="Identity Verification" subtitle="Review documents uploaded by users" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: "Pending", count: counts("pending") },
          { value: "verified", label: "Verified", count: counts("verified") },
          { value: "rejected", label: "Rejected", count: counts("rejected") },
        ]}
      />

      <div className="space-y-4">
        {list.length === 0 && (
          <div className="card">
            <Empty text={`No ${tab} submissions`} />
          </div>
        )}
        {list.map((u) => (
          <div key={u.id} className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">{u.name}</h3>
                <p className="text-xs text-slate-500">
                  {u.email} · Submitted {fmtDate(u.identity.submittedAt)}
                </p>
              </div>
              <Badge status={u.identity.status} />
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Document type</p>
                <p className="text-sm">{u.identity.docType}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Document number</p>
                <p className="text-sm">{u.identity.docNumber}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Uploaded files</p>
                <div className="flex flex-wrap gap-2">
                  {u.identity.files.map((f) => (
                    <a
                      key={f.name}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
                    >
                      📄 {f.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {u.identity.status === "rejected" && u.identity.rejectionReason && (
              <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
                <b>Rejection reason:</b> {u.identity.rejectionReason}
              </p>
            )}

            <StatusChanger
              status={u.identity.status}
              reason={u.identity.rejectionReason}
              onSave={(status, reason) => setIdentityStatus(u.id, status, reason)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
