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
  { value: "windows", label: "Windows" },
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

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        disabled ? "opacity-60 cursor-not-allowed " : ""
      }${checked ? "bg-brand-500" : "bg-slate-300"}`}
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

  if (!VERSION_RE.test(min)) return "Minimum supported version must look like 1.2.0 (major.minor.patch, no suffix).";
  if (!VERSION_RE.test(latest)) return "Latest version must look like 1.4.0 (major.minor.patch, no suffix).";
  if (compareVersions(latest, min) < 0) return "Latest version cannot be below the minimum supported version.";
  if (!url) return "An update URL is required.";
  if (!/^https:\/\//i.test(url)) return "The update URL must use HTTPS.";
  if (form.message.length > 1000) return "The message cannot exceed 1000 characters.";
  return "";
}

export default function ForceUpdatePage() {
  const { token, can, fullAdmin } = useStore();
  const toast = useToast();
  const [platform, setPlatform] = useState("android");
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmWarn, setConfirmWarn] = useState(false);

  const canManage = fullAdmin || can(PERMISSIONS.appConfigManage);
  const canRead = fullAdmin || canManage || can(PERMISSIONS.appConfigRead);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    getForceUpdateConfig(token, platform)
      .then((c) => {
        if (cancelled) return;
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
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, platform]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const executeSave = async () => {
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
      setConfirmWarn(false);
      toast(`${PLATFORMS.find((p) => p.value === platform)?.label} update settings saved`, "success");
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    // Check if minimum supported version is being raised while force update is enabled
    const oldMin = config?.minSupportedVersion;
    const newMin = form.minSupportedVersion.trim();
    const isRaisingMin = oldMin && VERSION_RE.test(oldMin) && compareVersions(newMin, oldMin) > 0;

    if (form.forceUpdate && isRaisingMin) {
      setConfirmWarn(true);
      return;
    }

    executeSave();
  };

  return (
    <>
      <PageHeader title="Force Update" subtitle="Minimum supported app version, configured per platform" />

      <Tabs value={platform} onChange={setPlatform} tabs={PLATFORMS.map((p) => ({ value: p.value, label: p.label }))} />

      <ErrorBanner error={error} onRetry={() => setPlatform((p) => p)} />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {config
                ? `Configured${config.updatedAt ? ` · last updated ${fmtDateTime(config.updatedAt)}` : ""}`
                : "Not configured yet — clients currently receive forceUpdate: false with default 0.0.0."}
            </p>
            {!canManage && canRead && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Read-only mode (appConfig.manage permission required to save)
              </span>
            )}
          </div>

          <div className="card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum supported version" hint="Below this the app shows a mandatory blocking update screen">
                <input
                  className="input"
                  placeholder="1.2.0"
                  value={form.minSupportedVersion}
                  onChange={(e) => set({ minSupportedVersion: e.target.value })}
                  disabled={!canManage}
                />
              </Field>
              <Field label="Latest version" hint="Must not be below the minimum supported version">
                <input
                  className="input"
                  placeholder="1.4.0"
                  value={form.latestVersion}
                  onChange={(e) => set({ latestVersion: e.target.value })}
                  disabled={!canManage}
                />
              </Field>
            </div>

            <Field label="Update URL" hint="HTTPS only — official store or download link for this platform">
              <input
                className="input"
                placeholder={`https://example.com/download/${platform}`}
                value={form.updateUrl}
                onChange={(e) => set({ updateUrl: e.target.value })}
                disabled={!canManage}
              />
            </Field>

            <Field label="Update message (optional)" hint={`${form.message.length}/1000 characters`}>
              <textarea
                rows={3}
                className="input"
                maxLength={1000}
                placeholder="Please update OpenChat to continue."
                value={form.message}
                onChange={(e) => set({ message: e.target.value })}
                disabled={!canManage}
              />
            </Field>

            <div className="flex items-center gap-3">
              <Switch checked={form.forceUpdate} onChange={(v) => canManage && set({ forceUpdate: v })} disabled={!canManage} />
              <div>
                <p className="text-sm font-medium text-slate-700">Force update (mandatory gate)</p>
                <p className="text-xs text-slate-400">
                  When enabled, installed apps below the minimum version are blocked from continuing until updated.
                  Versions between minimum and latest receive an optional update prompt.
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <button className="btn-primary mt-6" disabled={saving} onClick={handleSaveClick}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          )}

          {confirmWarn && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="card max-w-md p-5 shadow-xl">
                <h3 className="text-base font-semibold text-slate-900">Confirm Mandatory Update Requirement</h3>
                <p className="mt-2 text-sm text-slate-600">
                  You are raising the minimum supported version to <b>{form.minSupportedVersion}</b> with mandatory updates enabled.
                  Any user running an earlier version on <b>{PLATFORMS.find((p) => p.value === platform)?.label}</b> will immediately be blocked until they update.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setConfirmWarn(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={executeSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Yes, apply mandatory update"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
