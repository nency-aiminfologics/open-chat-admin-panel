"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Badge, Empty, Modal, PageHeader, fmtDate } from "@/components/ui";

export default function UsersPage() {
  const { users, setUserStatus } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null); // user to suspend / restore

  const list = users.filter((u) => {
    const matches = `${u.name} ${u.email} ${u.position}`.toLowerCase().includes(q.toLowerCase());
    return matches && (filter === "all" || u.status === filter);
  });

  return (
    <>
      <PageHeader title="Users" subtitle={`${users.length} registered users`} />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, email, position…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Position</th>
              <th className="th">Skills</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td">
                  <p className="font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="td">{u.position}</td>
                <td className="td">{u.skills.length}</td>
                <td className="td">{fmtDate(u.joinedAt)}</td>
                <td className="td">
                  <Badge status={u.status} />
                </td>
                <td className="td">
                  <div className="flex justify-end gap-2">
                    <Link href={`/users/${u.id}`} className="btn-secondary !px-3 !py-1.5">
                      View
                    </Link>
                    {u.status === "active" ? (
                      <button className="btn-danger !px-3 !py-1.5" onClick={() => setConfirm(u)}>
                        Suspend
                      </button>
                    ) : (
                      <button className="btn-success !px-3 !py-1.5" onClick={() => setConfirm(u)}>
                        Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty text="No users found" />}
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.status === "active" ? "Suspend account" : "Restore account"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              className={confirm?.status === "active" ? "btn-danger" : "btn-success"}
              onClick={() => {
                setUserStatus(confirm.id, confirm.status === "active" ? "suspended" : "active");
                setConfirm(null);
              }}
            >
              Confirm
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {confirm?.status === "active"
            ? `${confirm?.name} will no longer be able to use the app until restored.`
            : `${confirm?.name} will regain access to their account.`}
        </p>
      </Modal>
    </>
  );
}
