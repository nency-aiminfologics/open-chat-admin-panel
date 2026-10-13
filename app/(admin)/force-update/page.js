"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getForceUpdateConfig, putForceUpdateConfig } from "@/lib/api";
import { ErrorBanner, Field, PageHeader, Spinner, fmtDateTime } from "@/components/ui";

const EMPTY_PLATFORM = { minVersion: "", latestVersion: "", forceUpdate: false, message: "", storeUrl: "" };
const EMPTY = { ios: { ...EMPTY_PLATFORM }, android: { ...EMPTY_PLATFORM } };

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function PlatformForm({ label, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">{label}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum supported version" hint="Versions below this are blocked from use">
          <input
            className="input"
            placeholder="e.g. 1.4.0"
            value={value.minVersion}
            onChange={(e) => set({ minVersion: e.target.value })}
          />
        </Field>
        <Field label="Latest version" hint="Shown to users as the available update">
          <input
            className="input"
            placeholder="e.g. 1.6.2"
            value={value.latestVersion}
            onChange={(e) => set({ latestVersion: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Store URL">
        <input
          className="input"
          placeholder="App Store / Play Store link"
          value={value.storeUrl}
          onChange={(e) => set({ storeUrl: e.target.value })}
        />
      </Field>
      <Field label="Update message">
        <textarea
          rows={3}
          className="input"
          placeholder="Shown to users when an update is required or available"
          value={value.message}
          onChange={(e) => set({ message: e.target.value })}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Switch checked={value.forceUpdate} onChange={(v) => set({ forceUpdate: v })} />
        <div>
          <p className="text-sm font-medium text-slate-700">Force update</p>
          <p className="text-xs text-slate-400">Blocks app usage below the minimum version until the user updates</p>
        </div>
      </div>
    </div>
  );
}

export default function ForceUpdatePage() {
  const { token } = useStore();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    getForceUpdateConfig(token)
      .then((c) => {
        setConfig(c);
        if (c) {
          setForm({
            ios: { ...EMPTY_PLATFORM, ...c.ios },
            android: { ...EMPTY_PLATFORM, ...c.android },
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const save = async () => {
    if (!form.ios.minVersion.trim() || !form.android.minVersion.trim()) {
      setError("Minimum version is required for both platforms");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await putForceUpdateConfig(token, form);
      toast("Force update settings saved", "success");
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
      <PageHeader title="Force Update" subtitle="Control minimum supported app versions per platform" />
      <ErrorBanner error={error} onRetry={load} />

      {config?.updatedAt && <p className="mb-4 text-xs text-slate-500">Last updated {fmtDateTime(config.updatedAt)}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformForm label="iOS" value={form.ios} onChange={(v) => setForm({ ...form, ios: v })} />
        <PlatformForm label="Android" value={form.android} onChange={(v) => setForm({ ...form, android: v })} />
      </div>

      <button className="btn-primary mt-6" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </>
  );
}
