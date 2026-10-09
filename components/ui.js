"use client";

import { useEffect } from "react";
import Link from "next/link";

const BADGE = {
  active: "bg-success-tint text-success-ink ring-success/30",
  verified: "bg-success-tint text-success-ink ring-success/30",
  approved: "bg-success-tint text-success-ink ring-success/30",
  resolved: "bg-success-tint text-success-ink ring-success/30",
  reviewed: "bg-success-tint text-success-ink ring-success/30",
  success: "bg-success-tint text-success-ink ring-success/30",
  true: "bg-success-tint text-success-ink ring-success/30",
  pending: "bg-warn-tint text-warn-ink ring-warn/30",
  open: "bg-warn-tint text-warn-ink ring-warn/30",
  draft: "bg-warn-tint text-warn-ink ring-warn/30",
  submitted: "bg-warn-tint text-warn-ink ring-warn/30",
  under_review: "bg-brand-100 text-brand-700 ring-brand-300",
  in_progress: "bg-brand-100 text-brand-700 ring-brand-300",
  suspended: "bg-danger-tint text-danger-ink ring-danger/30",
  rejected: "bg-danger-tint text-danger-ink ring-danger/30",
  dismissed: "bg-slate-100 text-slate-600 ring-slate-200",
  false: "bg-danger-tint text-danger-ink ring-danger/30",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
        BADGE[status] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {String(status).replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function BackLink({ href, label = "Back" }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
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
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Empty({ text }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-slate-300">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h10" />
      </svg>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition ${
            value === t.value ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`ml-1.5 rounded-full px-1.5 text-xs ${
                value === t.value ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-slate-600"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-14">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-tint px-3.5 py-2.5 text-sm text-danger-ink">
      <span>{error}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, hasPreviousPage, hasNextPage, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3.5 text-sm">
      <button className="btn-secondary !px-3 !py-1.5" disabled={!hasPreviousPage} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span className="text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button className="btn-secondary !px-3 !py-1.5" disabled={!hasNextPage} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </div>
  );
}
