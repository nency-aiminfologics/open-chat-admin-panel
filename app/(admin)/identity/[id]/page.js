"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getVerificationDetail, reviewGovDocument, reviewUserSkill, reviewVerification } from "@/lib/api";
import { BackLink, Badge, ErrorBanner, PageHeader, Spinner, fmtDateTime } from "@/components/ui";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-all text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function FileLinks({ label, urls }) {
  const list = Array.isArray(urls) ? urls : urls ? [urls] : [];
  if (list.length === 0) return <Info label={label} value="None" />;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {list.map((u, i) => (
          <a
            key={i}
            href={u}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
          >
            📄 File {i + 1}
          </a>
        ))}
      </div>
    </div>
  );
}

const STATUS_LABELS = { approved: "Approve", rejected: "Reject", under_review: "Mark under review" };

function ReviewAction({ title, onSubmit, pending, options = ["approved", "rejected", "under_review"] }) {
  const [status, setStatus] = useState(options[0]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (status === "rejected" && !reason.trim()) {
      setError("Rejection reason is required");
      return;
    }
    setError("");
    await onSubmit(status, reason.trim());
  };

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      {title && <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {STATUS_LABELS[o]}
            </option>
          ))}
        </select>
        <button className="btn-primary !px-3 !py-1.5" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Submit"}
        </button>
      </div>
      {status === "rejected" && (
        <textarea
          rows={2}
          className="input mt-2"
          placeholder="Rejection reason (shown to the user, max 2000 characters)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {error && <p className="mt-1 text-xs text-danger-ink">{error}</p>}
    </div>
  );
}

export default function VerificationDetail() {
  const { id } = useParams();
  const { token } = useStore();
  const toast = useToast();
  const [submission, setSubmission] = useState(null);
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!token || !id) return;
    setLoading(true);
    setError("");
    getVerificationDetail(token, id)
      .then(setSubmission)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, id]);

  const bulkReview = async (decision, adminNotes) => {
    setBusy(true);
    try {
      const updated = await reviewVerification(token, id, { decision, adminNotes });
      setSubmission(updated);
      toast(`Submission ${decision === "approve" ? "approved" : "rejected"}`, "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const govDocReview = async (status, rejectionReason) => {
    setBusy(true);
    try {
      const result = await reviewGovDocument(token, id, {
        status,
        ...(status === "rejected" ? { rejectionReason } : {}),
      });
      setBadge(result);
      toast(`Government document ${status.replace("_", " ")}`, "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const skillReview = async (skillId, status, rejectionReason) => {
    setBusy(true);
    try {
      const result = await reviewUserSkill(token, submission.userId, skillId, {
        status,
        ...(status === "rejected" ? { rejectionReason } : {}),
      });
      setBadge(result);
      toast(`Skill ${status.replace("_", " ")}`, "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (!submission)
    return (
      <div>
        <ErrorBanner error={error} onRetry={load} />
        <BackLink href="/identity" label="Back to queue" />
      </div>
    );

  const skillIds = (submission.skillIds || []).map((s) => (typeof s === "string" ? { id: s } : { id: s._id || s.id, name: s.name }));
  const badgeSkillName = (skillId) => badge?.skills?.find((s) => s.id === skillId)?.name;

  return (
    <>
      <BackLink href="/identity" label="Back to queue" />
      <PageHeader title="Verification submission" subtitle={submission._id || id}>
        <Badge status={submission.status} />
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Submission</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info
              label="User"
              value={
                <Link href={`/users/${submission.userId}`} className="text-brand-600 hover:underline">
                  {submission.userId}
                </Link>
              }
            />
            <Info label="Country" value={submission.country} />
            <Info label="ID document type" value={submission.idDocumentType || submission.idDocumentTypeId} />
            <Info label="Government document status" value={submission.governmentDocumentStatus} />
            <Info label="Reviewed by" value={submission.reviewedBy} />
            <Info label="Reviewed at" value={fmtDateTime(submission.reviewedAt)} />
          </div>
          {submission.adminNotes && (
            <div className="mt-4">
              <Info label="Admin notes" value={submission.adminNotes} />
            </div>
          )}
          {submission.governmentDocumentRejectionReason && (
            <p className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
              <b>Rejection reason:</b> {submission.governmentDocumentRejectionReason}
            </p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Evidence</h2>
          <div className="space-y-4">
            <FileLinks label="ID document image" urls={submission.idDocumentImageUrl} />
            <FileLinks label="Intro images" urls={submission.images} />
            <FileLinks label="Certificate files" urls={submission.certificateFileUrls} />
            <FileLinks label="Certificate links" urls={submission.certificateLinks} />
            {(submission.videoUrl || submission.videoUrls) && (
              <FileLinks label="Legacy video(s)" urls={submission.videoUrl || submission.videoUrls} />
            )}
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Whole-submission decision</h2>
          <p className="mb-4 text-sm text-slate-500">
            Approving verifies every skill below and the government document; rejecting applies the same reason to all of
            them. Use the individual reviews instead if decisions need to differ per skill or document.
          </p>
          <ReviewAction
            options={["approved", "rejected"]}
            pending={busy}
            onSubmit={(status, reason) => bulkReview(status === "approved" ? "approve" : "reject", reason)}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Government document</h2>
          <p className="mb-3 text-sm text-slate-500">Reviews the ID document on this submission.</p>
          <ReviewAction pending={busy} onSubmit={govDocReview} />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Skills ({skillIds.length})</h2>
          {skillIds.length === 0 && <p className="text-sm text-slate-400">No skills submitted</p>}
          <div className="space-y-4">
            {skillIds.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 font-mono text-xs text-slate-500">{badgeSkillName(s.id) || s.name || s.id}</p>
                <ReviewAction pending={busy} onSubmit={(status, reason) => skillReview(s.id, status, reason)} />
              </div>
            ))}
          </div>
        </section>

        {badge && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold">
              Current badge — {badge.badge?.earned ? "Earned" : "Not earned"} ({badge.badge?.govDocsVerified ?? 0} doc,{" "}
              {badge.badge?.skillsVerified ?? 0} skills verified)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Government documents</p>
                <div className="space-y-2">
                  {(badge.govDocuments || []).map((d) => (
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
                  {(badge.skills || []).map((s) => (
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
      </div>
    </>
  );
}
