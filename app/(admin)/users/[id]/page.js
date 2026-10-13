"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getUserDetail, updateUser } from "@/lib/api";
import { BackLink, Badge, ErrorBanner, Modal, PageHeader, Spinner, fmtDate, fmtDateTime } from "@/components/ui";

const SOCIAL_LINKS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedIn", label: "LinkedIn" },
];

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
  "interestIds",
  "skillIds",
  "country",
  "gender",
  "profession",
  "dateOfBirth",
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
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
            {user.name || user.email}
          </span>
        }
        subtitle={user.position || user.email}
      >
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
            <Info label="Country" value={user.country} />
            <Info label="Gender" value={<span className="capitalize">{user.gender}</span>} />
            <Info label="Profession" value={user.profession} />
            <Info label="Date of birth" value={fmtDate(user.dateOfBirth)} />
            <Info label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
            <Info label="Profile visibility" value={user.isProfilePublic ? "Public" : "Private"} />
            <Info label="Onboarding step" value={user.onboardingStep} />
            <Info label="Last active" value={user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : null} />
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

        {(Array.isArray(user.interests) || Array.isArray(user.interestIds)) && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {(user.interests || user.interestIds).length === 0 && (
                <p className="text-sm text-slate-400">None</p>
              )}
              {(user.interests || user.interestIds).map((i, idx) => (
                <span key={idx} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                  {typeof i === "string" ? i : i?.name || i?._id}
                </span>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(user.skills) && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Skills</h2>
            {user.skills.length === 0 && <p className="text-sm text-slate-400">None</p>}
            <div className="space-y-2">
              {user.skills.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{s.skill?.name || s.skill?._id}</span>
                    {s.skill?.category && (
                      <span className="ml-2 text-xs capitalize text-slate-400">{s.skill.category}</span>
                    )}
                  </div>
                  <Badge status={s.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {(user.socialFacebook || user.socialInstagram || user.socialLinkedIn || user.socialLinks) && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Social links</h2>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map(({ key, label }) => {
                const url = user.socialLinks?.[key] || user[`social${label}`];
                if (!url) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {Array.isArray(user.videos) && user.videos.length > 0 && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Videos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {user.videos.map((v) => (
                <a
                  key={v.id || v._id}
                  href={v.videoUrl || v.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-video overflow-hidden rounded-xl bg-slate-900"
                >
                  {v.thumbnailUrl ? (
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title || "Video thumbnail"}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-white/50">No preview</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <span className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 opacity-0 transition group-hover:opacity-100" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                    ▶
                  </span>
                  <span className="absolute bottom-2 left-3 right-3 truncate text-sm font-medium text-white">
                    {v.title || "Untitled video"}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {user.verification && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">
              Verification — {user.verification.badge?.earned ? "Earned" : "Not earned"} (
              {user.verification.badge?.govDocsVerified ?? 0} doc, {user.verification.badge?.skillsVerified ?? 0} skills
              verified)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Government documents</p>
                <div className="space-y-2">
                  {(user.verification.govDocuments || []).length === 0 && (
                    <p className="text-sm text-slate-400">None submitted</p>
                  )}
                  {(user.verification.govDocuments || []).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{d.documentType}</span>
                      <Badge status={d.displayStatus} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Skills</p>
                <div className="space-y-2">
                  {(user.verification.skills || []).length === 0 && (
                    <p className="text-sm text-slate-400">None submitted</p>
                  )}
                  {(user.verification.skills || []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{s.name}</span>
                      <Badge status={s.displayStatus} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* {extra.length > 0 && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">Additional details</h2>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(Object.fromEntries(extra), null, 2)}
            </pre>
          </section>
        )} */}
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
