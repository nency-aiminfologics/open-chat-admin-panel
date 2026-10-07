"use client";

import { useEffect, useState } from "react";

const BADGE = {
  active: "bg-success-tint text-success-ink ring-success/40",
  verified: "bg-success-tint text-success-ink ring-success/40",
  resolved: "bg-success-tint text-success-ink ring-success/40",
  pending: "bg-warn-tint text-warn-ink ring-warn/40",
  open: "bg-warn-tint text-warn-ink ring-warn/40",
  in_progress: "bg-brand-100 text-brand-700 ring-brand-300",
  suspended: "bg-danger-tint text-danger-ink ring-danger/40",
  rejected: "bg-danger-tint text-danger-ink ring-danger/40",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        BADGE[status] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {String(status).replace("_", " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function Empty({ text }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-400">{text}</div>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            value === t.value
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Status changer: pending / verified / rejected.
 * Choosing "rejected" requires a rejection reason before saving.
 */
export function StatusChanger({ status, reason, onSave, disabled, disabledHint }) {
  const [value, setValue] = useState(status);
  const [text, setText] = useState(reason || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(status);
    setText(reason || "");
  }, [status, reason]);

  const save = () => {
    if (value === "rejected" && !text.trim()) {
      setError("Rejection reason is required");
      return;
    }
    setError("");
    onSave(value, text.trim());
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input !w-auto"
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          className="btn-primary"
          disabled={disabled || (value === status && text.trim() === (reason || ""))}
          onClick={save}
        >
          Update status
        </button>
      </div>
      {value === "rejected" && (
        <div className="mt-2">
          <textarea
            rows={2}
            className="input"
            placeholder="Rejection reason (shown to the user)"
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="mt-1 text-xs text-danger-ink">{error}</p>}
        </div>
      )}
      {disabled && disabledHint && <p className="mt-2 text-xs text-warn-ink">{disabledHint}</p>}
    </div>
  );
}

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
