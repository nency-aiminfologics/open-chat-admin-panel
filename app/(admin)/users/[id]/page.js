"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getUserDetail, updateUser } from "@/lib/api";
import { BackLink, Badge, ErrorBanner, Modal, PageHeader, Spinner, fmtDate, fmtDateTime } from "@/components/ui";

const SOCIAL_ICON_PATHS = {
  facebook: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94Z",
  instagram:
    "M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47a4.9 4.9 0 0 1 1.77 1.15 4.9 4.9 0 0 1 1.15 1.77c.25.64.42 1.37.47 2.43C21.99 8.94 22 9.28 22 12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47C15.06 21.99 14.72 22 12 22s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43a4.9 4.9 0 0 1 1.15-1.77A4.9 4.9 0 0 1 5.45.53C6.09.28 6.82.11 7.88.06 8.94.01 9.28 0 12 0Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.25a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5ZM17.4 4.6a1.17 1.17 0 1 0 0 2.34 1.17 1.17 0 0 0 0-2.34Z",
  linkedIn:
    "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18v-8.4H5.67V18h2.67ZM7 8.48a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1ZM18.34 18v-4.62c0-2.47-1.32-3.62-3.08-3.62-1.42 0-2.06.78-2.41 1.33V9.6h-2.67c.04.75 0 8.4 0 8.4h2.67v-4.69c0-.25.02-.5.1-.68.2-.5.67-1.03 1.46-1.03 1.03 0 1.44.78 1.44 1.93V18h2.49Z",
};

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
  // The verification submission's real _id surfaces here as govDocuments[].id (one gov document per submission).
  const submissionId = user.verification?.govDocuments?.[0]?.id;

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
            Suspend account
          </button>
        ) : (
          <button className="btn-success" onClick={() => setActive(true)}>
            Activate account
          </button>
        )}
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="grid gap-6 lg:grid-cols-1">
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Skills</h2>
              {submissionId && (
                <Link
                  href={`/identity/${submissionId}`}
                  title="View identity verification"
                  aria-label="View identity verification"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6l7-3Z" />
                  </svg>
                </Link>
              )}
            </div>
            {user.skills.length === 0 && <p className="text-sm text-slate-400">None</p>}
            <div className="space-y-2">
              {user.skills.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{s.skill?.name || s.skill?._id}</span>
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
                    title={label}
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-brand-600 hover:bg-brand-50"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0">
                      <path d={SOCIAL_ICON_PATHS[key]} />
                    </svg>
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
