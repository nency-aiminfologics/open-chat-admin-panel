"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getForceUpdateConfig, putForceUpdateConfig } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { ErrorBanner, Field, PageHeader, Spinner, Tabs, fmtDateTime } from "@/components/ui";

/** The backend accepts exactly these platforms, each with its own stored config. */
const PLATFORMS = [
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "macos", label: "macOS" },
];

const EMPTY = {
  minSupportedVersion: "",
  latestVersion: "",
  forceUpdate: false,
  updateUrl: "",
  message: "",
};

const VERSION_RE = /^\d+\.\d+\.\d+$/;

/** Numeric component comparison — version strings must never be compared lexically. */
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

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

function validate(form) {
  const min = form.minSupportedVersion.trim();
  const latest = form.latestVersion.trim();
  const url = form.updateUrl.trim();

  if (!VERSION_RE.test(min)) return "Minimum supported version must look like 2.3.0 (no prerelease suffix).";
  if (!VERSION_RE.test(latest)) return "Latest version must look like 2.4.0 (no prerelease suffix).";
  if (compareVersions(latest, min) < 0) return "Latest version cannot be below the minimum supported version.";
  if (!url) return "An update URL is required.";
  if (!/^https:\/\//i.test(url)) return "The update URL must use HTTPS.";
  if (form.message.length > 1000) return "The message cannot exceed 1000 characters.";
  return "";
}

export default function ForceUpdatePage() {
  const { token, can } = useStore();
  const toast = useToast();
  const [platform, setPlatform] = useState("android");
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canManage = can(PERMISSIONS.appConfigManage);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    getForceUpdateConfig(token, platform)
      .then((c) => {
        setConfig(c);
        // An unconfigured platform returns null — start from blank fields rather than another platform's values.
        setForm(
          c
            ? {
                minSupportedVersion: c.minSupportedVersion || "",
                latestVersion: c.latestVersion || "",
                forceUpdate: !!c.forceUpdate,
                updateUrl: c.updateUrl || "",
                message: c.message || "",
              }
            : { ...EMPTY }
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, platform]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await putForceUpdateConfig(token, {
        platform,
        minSupportedVersion: form.minSupportedVersion.trim(),
        latestVersion: form.latestVersion.trim(),
        forceUpdate: form.forceUpdate,
        updateUrl: form.updateUrl.trim(),
        message: form.message.trim(),
      });
      setConfig(saved);
      toast(`${PLATFORMS.find((p) => p.value === platform)?.label} update settings saved`, "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Force Update" subtitle="Minimum supported app version, configured per platform" />

      <Tabs value={platform} onChange={setPlatform} tabs={PLATFORMS.map((p) => ({ value: p.value, label: p.label }))} />

      <ErrorBanner error={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <p className="mb-4 text-xs text-slate-500">
            {config
              ? `Configured${config.updatedAt ? ` · last updated ${fmtDateTime(config.updatedAt)}` : ""}`
              : "Not configured yet — the app currently receives forceUpdate: false with versions 0.0.0."}
          </p>

          <div className="card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum supported version" hint="Below this the app shows a blocking update screen">
                <input
                  className="input"
                  placeholder="2.3.0"
                  value={form.minSupportedVersion}
                  onChange={(e) => set({ minSupportedVersion: e.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Latest version" hint="Must not be below the minimum supported version">
                <input
                  className="input"
                  placeholder="2.4.0"
                  value={form.latestVersion}
                  onChange={(e) => set({ latestVersion: e.target.value })}
                  disabled={!canManage}
                />
              </Field>
            </div>

            <Field label="Update URL" hint="HTTPS only — App Store, Play Store or download link">
              <input
                className="input"
                placeholder="https://example.com/app"
                value={form.updateUrl}
                onChange={(e) => set({ updateUrl: e.target.value })}
                disabled={!canManage}
              />
            </Field>

            <Field label="Update message" hint={`${form.message.length}/1000 characters`}>
              <textarea
                rows={3}
                className="input"
                maxLength={1000}
                placeholder="Please update to continue."
                value={form.message}
                onChange={(e) => set({ message: e.target.value })}
                disabled={!canManage}
              />
            </Field>

            <div className="flex items-center gap-3">
              <Switch checked={form.forceUpdate} onChange={(v) => canManage && set({ forceUpdate: v })} />
              <div>
                <p className="text-sm font-medium text-slate-700">Force update</p>
                <p className="text-xs text-slate-400">
                  Clients below the minimum version show a blocking update screen. Saving this does not push a
                  notification or reject other API requests.
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <button className="btn-primary mt-6" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          )}
        </>
      )}
    </>
  );
}
