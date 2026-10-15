"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getTermsConditions, putTermsConditions } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { ErrorBanner, Modal, PageHeader, Spinner, Tabs, fmtDateTime } from "@/components/ui";

const MAX_BODY = 100000;

export default function TermsPage() {
  const { token, can } = useStore();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [body, setBody] = useState("");
  const [view, setView] = useState("draft");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [error, setError] = useState("");
  // Set when a publish ends in an unknown state — the fix is to re-read, never to blind-retry.
  const [uncertain, setUncertain] = useState(false);

  const canPublish = can(PERMISSIONS.termsPublish);

  const load = ({ keepBody = false } = {}) => {
    if (!token) return;
    setLoading(true);
    setError("");
    getTermsConditions(token)
      .then((d) => {
        setData(d);
        setUncertain(false);
        if (!keepBody) setBody(d?.draft?.body ?? d?.published?.body ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const saveDraft = async () => {
    if (!body.trim()) {
      setError("The terms body is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await putTermsConditions(token, { body, publish: false });
      toast("Draft saved — no user is asked to accept again", "success");
      load({ keepBody: true });
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!body.trim()) {
      setError("The terms body is required.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const published = await putTermsConditions(token, { body, publish: true });
      setConfirmPublish(false);
      toast(`Published version ${published?.version ?? ""}`.trim(), "success");
      load({ keepBody: true });
    } catch (e) {
      // Every publish creates a new version, so a retry after an uncertain result could double-publish.
      setConfirmPublish(false);
      setUncertain(true);
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  if (loading && !data) return <Spinner />;

  const draft = data?.draft;
  const published = data?.published;
  const shown = view === "published" ? published?.body || "" : body;

  return (
    <>
      <PageHeader
        title="Terms & Conditions"
        subtitle="Drafts stay private; publishing creates a new version and asks users to accept again"
      />

      <ErrorBanner error={error} onRetry={() => load({ keepBody: true })} />

      {uncertain && (
        <div className="mb-4 rounded-xl border border-warn/30 bg-warn-tint px-3.5 py-3 text-sm text-warn-ink">
          <p className="font-medium">That publish did not confirm.</p>
          <p className="mt-0.5">
            Reload before trying again — a repeated publish creates another version even if the first one succeeded.
          </p>
          <button className="mt-2 font-medium underline" onClick={() => load({ keepBody: true })}>
            Reload and check
          </button>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Published</p>
          {published ? (
            <p className="mt-1 text-sm text-slate-800">
              Version {published.version} · {fmtDateTime(published.publishedAt)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Nothing published yet — the public endpoint returns 404.</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Draft</p>
          <p className="mt-1 text-sm text-slate-800">
            {draft ? `Saved ${fmtDateTime(draft.updatedAt || draft.createdAt)}` : "No draft saved"}
          </p>
        </div>
      </div>

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { value: "draft", label: "Draft editor" },
          { value: "published", label: "Published version" },
        ]}
      />

      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-sm font-medium text-slate-700">
            {view === "published" ? "Published body (read-only)" : "Body (text or HTML)"}
          </span>
          <div className="flex items-center gap-3">
            {view === "published" && published && (
              <button
                type="button"
                className="text-xs text-brand-600 hover:underline"
                onClick={() => {
                  setBody(published.body || "");
                  setView("draft");
                }}
              >
                Copy into draft
              </button>
            )}
            <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setPreview((v) => !v)}>
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>

        {preview || view === "published" ? (
          /* The stored body may be HTML — rendered here only for the admin's own preview. */
          <div
            className="mb-3 min-h-[220px] overflow-auto rounded-lg border border-slate-200 p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: shown }}
          />
        ) : (
          <textarea
            rows={16}
            className="input mb-1"
            maxLength={MAX_BODY}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Terms text or HTML…"
          />
        )}

        {/* {view === "draft" && !preview && (
          <p className="mb-3 text-xs text-slate-400">
            {body.length.toLocaleString()} / {MAX_BODY.toLocaleString()} characters
          </p>
        )} */}

        {canPublish && view === "draft" && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={saving || publishing} onClick={saveDraft}>
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button className="btn-primary" disabled={saving || publishing} onClick={() => setConfirmPublish(true)}>
              Publish new version
            </button>
          </div>
        )}
      </div>

      <Modal
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title="Publish a new version"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmPublish(false)} disabled={publishing}>
              Cancel
            </button>
            <button className="btn-primary" onClick={publish} disabled={publishing}>
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This stores an immutable version {published ? published.version + 1 : 1} and every user who accepted an
          earlier version will be asked to accept again. Only publication increments the version — publishing twice
          creates two versions, so press this once.
        </p>
      </Modal>
    </>
  );
}
