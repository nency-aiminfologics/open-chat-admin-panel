"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getVerificationDetail, reviewGovDocument, reviewUserSkill, reviewVerification } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink, Badge, ButtonSpinner, ErrorBanner, PageHeader, Spinner, fmtDateTime } from "@/components/ui";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-all text-sm text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function FileButtons({ label, items, prefix = "File" }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return <Info label={label} value="None" />;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {list.map((item, idx) => {
          const url = typeof item === "string" ? item : item?.url;
          if (!url) return null;
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-brand-600 shadow-sm transition hover:bg-brand-50 hover:border-brand-200"
            >
              📄 {prefix} {idx + 1}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function LinkList({ label, items }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return <Info label={label} value="None" />;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex flex-col gap-1.5">
        {list.map((item, idx) => {
          const url = typeof item === "string" ? item : item?.url;
          if (!url) return null;
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm text-brand-600 hover:underline inline-flex items-center gap-1.5"
              title={url}
            >
              🔗 <span className="truncate">{url}</span>
            </a>
          );
        })}
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
              {STATUS_LABELS[o] || o}
            </option>
          ))}
        </select>
        <button className="btn-primary flex items-center justify-center gap-1.5 !px-3 !py-1.5" disabled={pending} onClick={submit}>
          {pending && <ButtonSpinner className="h-3.5 w-3.5" />}
          Submit
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

/** Shown in place of the review controls to an admin who may read the queue but not decide. */
function ReadOnlyNote() {
  return (
    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
      You can view this submission but not review it — that needs the verification.review permission.
    </p>
  );
}

export default function VerificationDetail() {
  const { id } = useParams();
  const { token, can } = useStore();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canReview = can(PERMISSIONS.verificationReview);

  const fetchDetail = async ({ silent = false } = {}) => {
    if (!token || !id) return;
    if (!silent) setLoading(true);
    try {
      setData(await getVerificationDetail(token, id));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const load = () => {
    fetchDetail();
  };

  useEffect(load, [token, id]);

  const bulkReview = async (decision, adminNotes) => {
    setBusy(true);
    let shouldReload = false;
    let conflictMessage = "";
    try {
      const updated = await reviewVerification(token, id, { decision, adminNotes });
      setData(updated);
      toast(`Submission ${decision === "approve" ? "approved" : "rejected"}`, "success");
      shouldReload = true;
    } catch (e) {
      toast(e.message, "error");
      if (e.status === 409) {
        shouldReload = true;
        conflictMessage = e.message;
      } else {
        setError(e.message);
      }
    } finally {
      if (shouldReload) await fetchDetail({ silent: true });
      if (conflictMessage) setError(conflictMessage);
      setBusy(false);
    }
  };

  const govDocReview = async (arg1, arg2, arg3) => {
    let doc = primaryDoc;
    let status = "";
    let rejectionReason = "";

    if (arg1 && typeof arg1 === "object") {
      doc = arg1;
      status = arg2;
      rejectionReason = arg3;
    } else {
      status = arg1;
      rejectionReason = arg2;
      if (arg3 && typeof arg3 === "object") {
        doc = arg3;
      }
    }

    const govDocsList = Array.isArray(data?.governmentDocuments) ? data.governmentDocuments : [];
    const targetDoc = doc || govDocsList[0] || {};
    const targetDocId = targetDoc.id || targetDoc._id || targetDoc.documentId;

    // Find the matching item in data.governmentDocuments
    const matchingDoc =
      govDocsList.find((d) => {
        if (targetDocId && (d.id === targetDocId || d._id === targetDocId || d.documentId === targetDocId)) {
          return true;
        }
        if (d.sources?.some((s) => (s?.submissionId || s?.id || s?._id || s) === id)) {
          return true;
        }
        if (d.submissionId === id) {
          return true;
        }
        return false;
      }) ||
      targetDoc ||
      govDocsList[0];

    const govDocSourceId =
      matchingDoc?.sources?.[0]?.submissionId ||
      matchingDoc?.id ||
      matchingDoc?._id ||
      matchingDoc?.documentId ||
      id;

    // Retain documentRevision from the matching document or submission data
    const rawRevision =
      matchingDoc?.documentRevision ??
      matchingDoc?.revision ??
      targetDoc?.documentRevision ??
      targetDoc?.revision ??
      data?.documentRevision ??
      data?.governmentDocumentRevision ??
      data?.revision;

    const documentRevision =
      rawRevision !== undefined && rawRevision !== null && rawRevision !== ""
        ? (typeof rawRevision === "number" ? rawRevision : (Number.isNaN(Number(rawRevision)) ? rawRevision : Number(rawRevision)))
        : undefined;

    setBusy(true);
    let shouldReload = false;
    let conflictMessage = "";
    try {
      await reviewGovDocument(token, govDocSourceId, {
        status,
        ...(status === "rejected" ? { rejectionReason } : {}),
        ...(documentRevision !== undefined && documentRevision !== null ? { documentRevision } : {}),
      });
      toast(`Government document ${status.replace("_", " ")}`, "success");
      shouldReload = true;
    } catch (e) {
      toast(e.message, "error");
      if (e.status === 409) {
        shouldReload = true;
        conflictMessage = e.message;
      } else {
        setError(e.message);
      }
    } finally {
      if (shouldReload) await fetchDetail({ silent: true });
      if (conflictMessage) setError(conflictMessage);
      setBusy(false);
    }
  };

  const skillReview = async (skillOrId, status, rejectionReason) => {
    const skillObj = typeof skillOrId === "object" && skillOrId !== null ? skillOrId : null;
    const skillId = skillObj ? (skillObj.id || skillObj._id) : skillOrId;
    const verificationId = skillObj?.verificationId || data?.review?.targets?.[0]?.verificationId;

    setBusy(true);
    let shouldReload = false;
    let conflictMessage = "";
    try {
      const targetUserId = data?.userId || data?.user?.id || data?.user?._id;
      await reviewUserSkill(token, targetUserId, skillId, {
        status,
        ...(status === "rejected" ? { rejectionReason } : {}),
        ...(verificationId ? { verificationId } : {}),
      });
      toast(`Skill ${status.replace("_", " ")}`, "success");
      shouldReload = true;
    } catch (e) {
      toast(e.message, "error");
      if (e.status === 409) {
        shouldReload = true;
        conflictMessage = e.message;
      } else {
        setError(e.message);
      }
    } finally {
      if (shouldReload) await fetchDetail({ silent: true });
      if (conflictMessage) setError(conflictMessage);
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (!data)
    return (
      <div>
        <ErrorBanner error={error} onRetry={load} />
        <BackLink href="/identity" label="Back to queue" />
      </div>
    );

  const user = data.user;
  const skills = Array.isArray(data.skills) ? data.skills : (data.skillIds || []);
  const govDocs = Array.isArray(data.governmentDocuments) ? data.governmentDocuments : [];
  const primaryDoc = govDocs[0] || {};

  // Combine or extract certificates by kind
  const allCertificates = Array.isArray(data.certificates) ? data.certificates : [];
  const certificateFiles = allCertificates.length > 0
    ? allCertificates.filter((c) => c.kind !== "link")
    : (data.certificateFileUrls || []);
  const certificateLinks = allCertificates.length > 0
    ? allCertificates.filter((c) => c.kind === "link")
    : (data.certificateLinks || []);

  // Verification images and videos
  const imageFiles = Array.isArray(data.images) ? data.images : [];
  const videoFiles = Array.isArray(data.videos) ? data.videos : (data.videoUrl ? [{ url: data.videoUrl }] : []);

  // Primary review target info if available
  const currentTarget = data.review?.targets?.find((t) => t.submissionId === id) || data.review?.targets?.[0];
  const overallStatus = currentTarget?.status || data.status || "submitted";

  return (
    <>
      <BackLink href="/identity" label="Back to queue" />
      <PageHeader title="Verification submission">
        <Badge status={overallStatus} />
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submission Details Card */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Submission</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info
              label="User"
              value={
                <Link
                  href={`/users/${data.userId || user?.id}`}
                  className="flex items-center gap-2 text-brand-600 hover:underline"
                >
                  {user?.avatarUrl && (
                    <img src={user.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                  )}
                  <span>
                    {user?.name || data.userId}
                    {user?.email && <span className="text-slate-400"> · {user.email}</span>}
                  </span>
                </Link>
              }
            />
            <Info label="Country" value={primaryDoc.country || data.country} />
            <Info
              label="ID document type"
              value={primaryDoc.documentType || primaryDoc.documentTypeId || data.idDocumentType || data.idDocumentTypeId}
            />
            <Info
              label="Government document status"
              value={primaryDoc.status || data.governmentDocumentStatus}
            />
            {((primaryDoc.documentRevision !== undefined && primaryDoc.documentRevision !== null) ||
              (primaryDoc.revision !== undefined && primaryDoc.revision !== null) ||
              (data.documentRevision !== undefined && data.documentRevision !== null)) && (
                <Info
                  label="Document revision"
                  value={`Revision ${primaryDoc.documentRevision ?? primaryDoc.revision ?? data.documentRevision}`}
                />
              )}
            <Info
              label="Reviewed by"
              value={currentTarget?.reviewedByUser?.name || currentTarget?.reviewedByUser?.email || data.reviewedByUser?.name || data.reviewedByUser?.email}
            />
            <Info
              label="Reviewed at"
              value={currentTarget?.reviewedAt ? fmtDateTime(currentTarget.reviewedAt) : (data.reviewedAt ? fmtDateTime(data.reviewedAt) : undefined)}
            />
          </div>

          {(currentTarget?.adminNotes || data.adminNotes) && (
            <div className="mt-4">
              <Info label="Admin notes" value={currentTarget?.adminNotes || data.adminNotes} />
            </div>
          )}

          {/* {(primaryDoc.rejectionReason || data.governmentDocumentRejectionReason) && (
            <p className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
              <b>Rejection reason:</b> {primaryDoc.rejectionReason || data.governmentDocumentRejectionReason}
            </p>
          )} */}
        </section>

        {/* Evidence Card */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Evidence</h2>
          <div className="space-y-4">
            <FileButtons
              label="Government document"
              items={govDocs.length > 0 ? govDocs : (data.idDocumentImageUrl ? [{ url: data.idDocumentImageUrl }] : [])}
              prefix="File"
            />
            <FileButtons
              label="Certificate files"
              items={certificateFiles}
              prefix="File"
            />
            <LinkList
              label="Certificate links"
              items={certificateLinks}
            />
            <FileButtons
              label="Verification images"
              items={imageFiles}
              prefix="File"
            />
            {videoFiles.length > 0 && (
              <FileButtons
                label="Verification videos"
                items={videoFiles}
                prefix="Video"
              />
            )}
          </div>
        </section>

        {/* Government Document Review */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">
              Government document{govDocs.length > 1 ? `s (${govDocs.length})` : ""}
            </h2>
            {govDocs.length <= 1 && primaryDoc.status && <Badge status={primaryDoc.status} />}
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Reviews the ID document on this submission.
            {govDocs.length <= 1 &&
              (primaryDoc.documentRevision !== undefined || primaryDoc.revision !== undefined || data.documentRevision !== undefined) && (
                <span className="ml-1 font-medium text-slate-700">
                  (Revision {primaryDoc.documentRevision ?? primaryDoc.revision ?? data.documentRevision})
                </span>
              )}
          </p>
          {govDocs.length > 1 ? (
            <div className="space-y-4">
              {govDocs.map((doc, idx) => {
                const docId = doc.id || doc._id || doc.documentId || idx;
                const revision = doc.documentRevision ?? doc.revision;
                return (
                  <div key={docId} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        {doc.documentType || `Document #${idx + 1}`}
                        {revision !== undefined && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            (Rev {revision})
                          </span>
                        )}
                      </p>
                      {doc.status && <Badge status={doc.status} />}
                    </div>
                    {(doc.rejectionReason || doc.reason) && (
                      <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
                        <b>Rejection reason:</b> {doc.rejectionReason || doc.reason}
                      </p>
                    )}
                    {canReview ? (
                      <ReviewAction
                        key={`gov-doc-${docId}-${revision ?? 0}`}
                        pending={busy}
                        onSubmit={(status, reason) => govDocReview(doc, status, reason)}
                      />
                    ) : (
                      <ReadOnlyNote />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {(primaryDoc.rejectionReason || data.governmentDocumentRejectionReason) && (
                <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
                  <b>Rejection reason:</b> {primaryDoc.rejectionReason || data.governmentDocumentRejectionReason}
                </p>
              )}
              {canReview ? (
                <ReviewAction
                  key={`gov-doc-${primaryDoc.id || primaryDoc._id || id}-${primaryDoc.documentRevision ?? primaryDoc.revision ?? data.documentRevision ?? 0}`}
                  pending={busy}
                  onSubmit={govDocReview}
                />
              ) : (
                <ReadOnlyNote />
              )}
            </>
          )}
        </section>

        {/* Skills Review */}
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Skills ({skills.length})</h2>
          {skills.length === 0 && <p className="text-sm text-slate-400">No skills submitted</p>}
          <div className="space-y-4">
            {skills.map((s) => {
              const skillId = s.id || s._id;
              const skillRejection = s.rejectionReason || s.reason || s.adminNotes;
              return (
                <div key={skillId} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {s.name || skillId}
                      {s.category && <span className="ml-2 text-xs font-normal capitalize text-slate-400">{s.category}</span>}
                    </p>
                    {s.displayStatus && <Badge status={s.displayStatus} />}
                  </div>
                  {skillRejection && (
                    <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">
                      <b>Rejection reason:</b> {skillRejection}
                    </p>
                  )}
                  {canReview ? (
                    <ReviewAction
                      key={`${skillId}-${s.verificationId || s.displayStatus || s.status}`}
                      pending={busy}
                      onSubmit={(status, reason) => skillReview(s, status, reason)}
                    />
                  ) : (
                    <ReadOnlyNote />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Whole-submission decision */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Whole-submission decision</h2>
          <p className="mb-4 text-sm text-slate-500">
            Approving verifies every skill below and the government document; rejecting applies the same reason to all of
            them. Use the individual reviews instead if decisions need to differ per skill or document.
          </p>
          {canReview ? (
            <ReviewAction
              options={["approved", "rejected"]}
              pending={busy}
              onSubmit={(status, reason) => bulkReview(status === "approved" ? "approve" : "reject", reason)}
            />
          ) : (
            <ReadOnlyNote />
          )}
        </section>
      </div>
    </>
  );
}


