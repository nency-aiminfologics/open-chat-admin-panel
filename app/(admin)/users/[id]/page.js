"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Badge, PageHeader, fmtDate } from "@/components/ui";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

function SocialLink({ label, url }) {
  if (!url) return <Info label={label} value="Not provided" />;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <a href={url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-sm text-brand-600 hover:underline">
        {url}
      </a>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const { users, setUserStatus } = useStore();
  const u = users.find((x) => x.id === id);

  if (!u)
    return (
      <div>
        <p className="text-slate-500">User not found.</p>
        <Link href="/users" className="text-brand-600">
          ← Back to users
        </Link>
      </div>
    );

  return (
    <>
      <Link href="/users" className="mb-3 inline-block text-sm text-brand-600 hover:underline">
        ← Back to users
      </Link>
      <PageHeader title={u.name} subtitle={u.position}>
        <Badge status={u.status} />
        {u.status === "active" ? (
          <button className="btn-danger" onClick={() => setUserStatus(u.id, "suspended")}>
            Suspend account
          </button>
        ) : (
          <button className="btn-success" onClick={() => setUserStatus(u.id, "active")}>
            Restore account
          </button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Email" value={u.email} />
            <Info label="Phone" value={u.phone} />
            <Info label="Position" value={u.position} />
            <Info label="Joined" value={fmtDate(u.joinedAt)} />
          </div>
          <div className="mt-4">
            <Info label="Bio" value={u.bio} />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Social links</h2>
          <div className="space-y-3">
            <SocialLink label="Instagram" url={u.social.instagram} />
            <SocialLink label="Facebook" url={u.social.facebook} />
            <SocialLink label="LinkedIn" url={u.social.linkedin} />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {u.interests.length === 0 && <p className="text-sm text-slate-400">None</p>}
            {u.interests.map((i) => (
              <span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                {i}
              </span>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Identity verification</h2>
          <div className="flex items-center gap-3">
            <Badge status={u.identity.status} />
            <span className="text-sm text-slate-500">{u.identity.docType}</span>
            <Link href="/identity" className="ml-auto text-sm text-brand-600 hover:underline">
              Review →
            </Link>
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Skills ({u.skills.length})</h2>
          <div className="divide-y divide-slate-100">
            {u.skills.length === 0 && <p className="text-sm text-slate-400">No skills added</p>}
            {u.skills.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-medium">{s.name}</span>
                <Badge status={s.status} />
                <a href={s.link} target="_blank" rel="noreferrer" className="truncate text-sm text-brand-600 hover:underline">
                  {s.link}
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Uploaded videos ({u.videos.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {u.videos.length === 0 && <p className="text-sm text-slate-400">No videos uploaded</p>}
            {u.videos.map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex aspect-video items-center justify-center rounded-md bg-slate-900 text-3xl text-white/70">
                  ▶
                </div>
                <p className="text-sm font-medium">{v.title}</p>
                <p className="text-xs text-slate-500">{fmtDate(v.uploadedAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
