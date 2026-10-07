"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Empty, PageHeader, StatusChanger, Tabs } from "@/components/ui";

const PARTS = [
  { key: "document", label: "Document" },
  { key: "link", label: "Link" },
  { key: "video", label: "Video" },
];

export default function SkillVerificationPage() {
  const { users, toggleSkillReview, setSkillStatus } = useStore();
  const [tab, setTab] = useState("pending");

  const all = users.flatMap((u) => u.skills);
  const count = (s) => all.filter((skill) => skill.status === s).length;
  
  const usersWithSkillsInTab = users.filter((u) => u.skills.some((s) => s.status === tab));

  return (
    <>
      <PageHeader
        title="Skill Verification"
        subtitle="Review the document, link and video of each skill. Complete all 3 reviews before changing the status."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: "Pending", count: count("pending") },
          { value: "verified", label: "Verified", count: count("verified") },
          { value: "rejected", label: "Rejected", count: count("rejected") },
        ]}
      />

      <div className="space-y-4">
        {usersWithSkillsInTab.length === 0 && (
          <div className="card">
            <Empty text={`No ${tab} skills`} />
          </div>
        )}

        {usersWithSkillsInTab.map((user) => {
          const matchingSkills = user.skills.filter((s) => s.status === tab);

          return (
            <div key={user.id} className="card p-5">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h3 className="font-semibold text-lg">{user.name}</h3>
                <p className="text-sm text-slate-500">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchingSkills.map((s) => (
                    <span key={s.id} className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-8 grid gap-4 md:grid-cols-3">
                {PARTS.map((p) => (
                  <div key={p.key}>
                    <h4 className="mb-3 font-medium text-slate-700">{p.label}s</h4>
                    <div className="space-y-3">
                      {matchingSkills.map((skill) => (
                        <div key={`${p.key}-${skill.id}`} className="rounded-lg border border-slate-200 p-3">
                          <p className="mb-1 text-xs text-slate-500">{skill.name}</p>
                          {p.key === "link" ? (
                            <a href={skill.link} target="_blank" rel="noreferrer" className="block mb-2 truncate text-sm text-brand-600 hover:underline">
                              🔗 {skill.link}
                            </a>
                          ) : (
                            <a href={skill[p.key].url} target="_blank" rel="noreferrer" className="block mb-2 truncate text-sm text-brand-600 hover:underline">
                              {p.key === "video" ? "🎬" : "📄"} {skill[p.key].name}
                            </a>
                          )}
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-brand-400"
                              checked={skill.reviews[p.key]}
                              onChange={() => toggleSkillReview(user.id, skill.id, p.key)}
                            />
                            Reviewed
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="font-medium text-slate-700">Status Updates</h4>
                {matchingSkills.map((skill) => {
                  const done = PARTS.filter((p) => skill.reviews[p.key]).length;
                  const complete = done === PARTS.length;

                  return (
                    <div key={`status-${skill.id}`} className="rounded-lg bg-slate-50 p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{skill.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Reviewed {done}/3</span>
                          <Badge status={skill.status} />
                        </div>
                      </div>

                      {skill.status === "rejected" && skill.rejectionReason && (
                        <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
                          <b>Rejection reason:</b> {skill.rejectionReason}
                        </p>
                      )}

                      <StatusChanger
                        status={skill.status}
                        reason={skill.rejectionReason}
                        disabled={!complete}
                        disabledHint="Mark the document, link and video as reviewed to enable status change."
                        onSave={(status, reason) => setSkillStatus(user.id, skill.id, status, reason)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
