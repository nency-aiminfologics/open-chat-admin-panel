"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getTermsConditions, putTermsConditions } from "@/lib/api";
import { ErrorBanner, Field, PageHeader, Spinner, fmtDateTime } from "@/components/ui";

const EMPTY = { title: "Terms & Conditions", contentHtml: "", version: "1.0", effectiveAt: "", isActive: true };

export default function TermsPage() {
  const { token } = useStore();
  const toast = useToast();
  const [terms, setTerms] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    getTermsConditions(token)
      .then((t) => {
        setTerms(t);
        if (t) {
          setForm({
            title: t.title || "",
            contentHtml: t.contentHtml || "",
            version: t.version || "",
            effectiveAt: t.effectiveAt ? t.effectiveAt.slice(0, 10) : "",
            isActive: !!t.isActive,
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const save = async () => {
    if (!form.title.trim() || !form.contentHtml.trim() || !form.version.trim()) {
      setError("Title, content and version are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await putTermsConditions(token, {
        title: form.title.trim(),
        contentHtml: form.contentHtml,
        version: form.version.trim(),
        isActive: form.isActive,
        ...(form.effectiveAt ? { effectiveAt: new Date(form.effectiveAt).toISOString() } : {}),
      });
      toast("Terms & conditions saved", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Terms & Conditions" subtitle="Single document shown at the public terms URL" />
      <ErrorBanner error={error} onRetry={load} />

      {terms && (
        <p className="mb-4 text-xs text-slate-500">
          Current version {terms.version} · updated {fmtDateTime(terms.updatedAt)} ·{" "}
          <a href={terms.publicUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            public link
          </a>
        </p>
      )}

      <div className="card p-5">
        <Field label="Title">
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Version">
            <input className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </Field>
          <Field label="Effective date">
            <input
              type="date"
              className="input"
              value={form.effectiveAt}
              onChange={(e) => setForm({ ...form, effectiveAt: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Active">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-400"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
        </Field>
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-sm font-medium text-slate-700">Content (HTML)</span>
          <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setPreview((v) => !v)}>
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div
            className="mb-3 min-h-[200px] rounded-lg border border-slate-200 p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: form.contentHtml }}
          />
        ) : (
          <textarea
            rows={14}
            className="input mb-3"
            value={form.contentHtml}
            onChange={(e) => setForm({ ...form, contentHtml: e.target.value })}
          />
        )}
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save terms"}
        </button>
      </div>
    </>
  );
}
