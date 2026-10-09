"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { listUsers, updateUser } from "@/lib/api";
import { Badge, Empty, ErrorBanner, Modal, PageHeader, Pagination, Spinner, fmtDate } from "@/components/ui";

export default function UsersPage() {
  const { token } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listUsers(token, { page, limit: 20, search: q || undefined, role: role || undefined, isActive: isActive || undefined })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page]);

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const toggleActive = async (user) => {
    try {
      await updateUser(token, user._id, { isActive: !user.isActive });
      setConfirm(null);
      toast(user.isActive ? "Account deactivated" : "Account activated", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
      setConfirm(null);
    }
  };

  const list = result?.items || [];

  return (
    <>
      <PageHeader title="Users" subtitle={result ? `${result.total} registered users` : "Registered users"} />
      <ErrorBanner error={error} onRetry={load} />

      <form onSubmit={search} className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select className="input !w-auto" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">All accounts</option>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
        </select>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">User</th>
                  <th className="th">Role</th>
                  <th className="th">Joined</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="td">
                      <p className="font-medium text-slate-900">{u.name || "—"}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="td capitalize">{u.role}</td>
                    <td className="td">{fmtDate(u.createdAt)}</td>
                    <td className="td">
                      <Badge status={u.isActive ? "active" : "suspended"} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <Link href={`/users/${u._id}`} className="btn-secondary !px-3 !py-1.5">
                          View
                        </Link>
                        {u.isActive ? (
                          <button className="btn-danger !px-3 !py-1.5" onClick={() => setConfirm(u)}>
                            Deactivate
                          </button>
                        ) : (
                          <button className="btn-success !px-3 !py-1.5" onClick={() => setConfirm(u)}>
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty text="No users found" />}
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

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.isActive ? "Deactivate account" : "Activate account"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className={confirm?.isActive ? "btn-danger" : "btn-success"} onClick={() => toggleActive(confirm)}>
              Confirm
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {confirm?.isActive
            ? `${confirm?.name || confirm?.email} will no longer be able to use the app until reactivated.`
            : `${confirm?.name || confirm?.email} will regain access to their account.`}
        </p>
      </Modal>
    </>
  );
}
