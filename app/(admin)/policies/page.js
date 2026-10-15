"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/lib/toast";
import { getPrivacyPolicy, putPrivacyPolicy } from "@/lib/api";
import { ErrorBanner, Field, PageHeader, Spinner, fmtDateTime } from "@/components/ui";

const EMPTY = { title: "Privacy Policy", contentHtml: "", version: "1.0", effectiveAt: "", isActive: true };

export default function PoliciesPage() {
  const { token, can } = useStore();
  const canManage = can(PERMISSIONS.contentManage);
  const toast = useToast();
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    getPrivacyPolicy(token)
      .then((p) => {
        setPolicy(p);
        if (p) {
          setForm({
            title: p.title || "",
            contentHtml: p.contentHtml || "",
            version: p.version || "",
            effectiveAt: p.effectiveAt ? p.effectiveAt.slice(0, 10) : "",
            isActive: !!p.isActive,
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
      await putPrivacyPolicy(token, {
        title: form.title.trim(),
        contentHtml: form.contentHtml,
        version: form.version.trim(),
        isActive: form.isActive,
        ...(form.effectiveAt ? { effectiveAt: new Date(form.effectiveAt).toISOString() } : {}),
      });
      toast("Privacy policy saved", "success");
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
      <PageHeader title="Privacy Policy" subtitle="Single policy document shown at the public policy URL" />
      <ErrorBanner error={error} onRetry={load} />

      {policy && (
        <p className="mb-4 text-xs text-slate-500">
          Current version {policy.version} · updated {fmtDateTime(policy.updatedAt)} ·{" "}
          <a href={policy.publicUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
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
        {canManage && (
          <button className="btn-primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save policy"}
          </button>
        )}
      </div>
    </>
  );
}
