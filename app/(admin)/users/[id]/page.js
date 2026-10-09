"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getUserDetail, updateUser } from "@/lib/api";
import { BackLink, Badge, ErrorBanner, Modal, PageHeader, Spinner, fmtDate } from "@/components/ui";

const KNOWN_FIELDS = [
  "_id",
  "id",
  "name",
  "email",
  "phone",
  "bio",
  "position",
  "avatarUrl",
  "avatar",
  "role",
  "isActive",
  "createdAt",
  "updatedAt",
  "interests",
  "skillIds",
  "__v",
];

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const { token } = useStore();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [role, setRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const load = () => {
    if (!token || !id) return;
    setLoading(true);
    setError("");
    getUserDetail(token, id)
      .then((u) => {
        setUser(u);
        setRole(u.role);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, id]);

  const setActive = async (isActive) => {
    try {
      const updated = await updateUser(token, id, { isActive });
      setUser(updated);
      setConfirmDeactivate(false);
      toast(isActive ? "Account activated" : "Account deactivated", "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
      setConfirmDeactivate(false);
    }
  };

  const saveRole = async () => {
    setSavingRole(true);
    try {
      const updated = await updateUser(token, id, { role });
      setUser(updated);
      toast("Role updated", "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setSavingRole(false);
    }
  };

  if (loading) return <Spinner />;

  if (error && !user)
    return (
      <div>
        <ErrorBanner error={error} onRetry={load} />
        <BackLink href="/users" label="Back to users" />
      </div>
    );

  if (!user) return null;

  const extra = Object.entries(user).filter(([k]) => !KNOWN_FIELDS.includes(k));

  return (
    <>
      <BackLink href="/users" label="Back to users" />
      <PageHeader title={user.name || user.email} subtitle={user.position || user.email}>
        <Badge status={user.isActive ? "active" : "suspended"} />
        {user.isActive ? (
          <button className="btn-danger" onClick={() => setConfirmDeactivate(true)}>
            Deactivate account
          </button>
        ) : (
          <button className="btn-success" onClick={() => setActive(true)}>
            Activate account
          </button>
        )}
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Email" value={user.email} />
            <Info label="Phone" value={user.phone} />
            <Info label="Role" value={<span className="capitalize">{user.role}</span>} />
            <Info label="Joined" value={fmtDate(user.createdAt)} />
          </div>
          {user.bio && (
            <div className="mt-4">
              <Info label="Bio" value={user.bio} />
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Role</h2>
          <div className="flex items-center gap-2">
            <select className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="user">User</option>
            </select>
            <button className="btn-primary" disabled={savingRole || role === user.role} onClick={saveRole}>
              {savingRole ? "Saving…" : "Update role"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Deactivating the last active admin is rejected by the server. Use caution with role changes.
          </p>
        </section>

        {Array.isArray(user.interests) && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {user.interests.length === 0 && <p className="text-sm text-slate-400">None</p>}
              {user.interests.map((i, idx) => (
                <span key={idx} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {typeof i === "string" ? i : i?.name || i?._id}
                </span>
              ))}
            </div>
          </section>
        )}

        {extra.length > 0 && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Additional details</h2>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(Object.fromEntries(extra), null, 2)}
            </pre>
          </section>
        )}
      </div>

      <Modal
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title="Deactivate account"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDeactivate(false)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={() => setActive(false)}>
              Deactivate
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {user.name || user.email} will no longer be able to use the app until reactivated.
        </p>
      </Modal>
    </>
  );
}
