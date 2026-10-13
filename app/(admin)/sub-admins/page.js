"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { createSubAdmin, deleteSubAdmin, listSubAdmins, updateSubAdmin } from "@/lib/api";
import { ACCESS_OPTIONS } from "@/components/Sidebar";
import { Badge, Empty, ErrorBanner, Field, Modal, PageHeader, Spinner } from "@/components/ui";

const EMPTY_FORM = { name: "", email: "", access: [], isActive: true };

const ICON_TONE = {
  neutral: "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
  danger: "border border-danger/20 bg-white text-danger hover:bg-danger-tint",
  success: "border border-success/30 bg-white text-success hover:bg-success-tint",
};

function IconButton({ label, tone = "neutral", ...props }) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition ${ICON_TONE[tone]}`}
    >
      {props.children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5v5.25a2.25 2.25 0 0 1-2.25 2.25H5.25a2.25 2.25 0 0 1-2.25-2.25V6.75a2.25 2.25 0 0 1 2.25-2.25h5.25" />
  </svg>
);

const BanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0 9 9 0 0 1 12.728 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m5.636 5.636 12.728 12.728" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  </svg>
);

/** Checkbox-list dropdown for picking several access options. */
function MultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between !py-2 text-left"
      >
        <span className={selected.length ? "text-slate-800" : "text-slate-400"}>
          {selected.length ? `${selected.length} page${selected.length > 1 ? "s" : ""} selected` : "Select access…"}
        </span>
        <ChevronIcon />
      </button>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {options
            .filter((o) => selected.includes(o.value))
            .map((o) => (
              <span
                key={o.value}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {o.label}
                <button
                  type="button"
                  aria-label={`Remove ${o.label}`}
                  onClick={() => toggle(o.value)}
                  className="text-brand-400 hover:text-brand-700"
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      {open && (
        <div className="scrollbar-custom absolute z-20 mt-1.5 max-h-[100px] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-400"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubAdminsPage() {
  const { token } = useStore();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listSubAdmins(token)
      .then((d) => setItems(Array.isArray(d) ? d : d?.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({});
  };

  const openEdit = (item) => {
    setForm({ name: item.name || "", email: item.email || "", access: item.access || [], isActive: !!item.isActive });
    setFormError("");
    setModal(item);
  };

  const save = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email) {
      setFormError("Name and email are required");
      return;
    }
    if (form.access.length === 0) {
      setFormError("Select at least one page this sub admin can access");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const body = { name, email, access: form.access, isActive: form.isActive };
      if (modal.id) await updateSubAdmin(token, modal.id, body);
      else await createSubAdmin(token, body);
      setModal(null);
      toast(`Sub admin ${modal.id ? "updated" : "added"}`, "success");
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateSubAdmin(token, item.id, { isActive: !item.isActive });
      toast(item.isActive ? "Sub admin deactivated" : "Sub admin activated", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteSubAdmin(token, deleteTarget.id);
      toast("Sub admin deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const accessLabel = (href) => ACCESS_OPTIONS.find((o) => o.value === href)?.label || href;

  return (
    <>
      <PageHeader title="Sub Admins" subtitle="Admin accounts with access scoped to specific pages">
        <button className="btn-primary" onClick={openAdd}>
          + Add sub admin
        </button>
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="card scrollbar-hide overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Access</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{i.name}</td>
                    <td className="td text-slate-600">{i.email}</td>
                    <td className="td">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {(i.access || []).slice(0, 3).map((a) => (
                          <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {accessLabel(a)}
                          </span>
                        ))}
                        {(i.access || []).length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            +{i.access.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <Badge status={i.isActive ? "active" : "suspended"} />
                    </td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton label="Edit" onClick={() => openEdit(i)}>
                          <EditIcon />
                        </IconButton>
                        {i.isActive ? (
                          <IconButton tone="danger" label="Deactivate" onClick={() => toggleActive(i)}>
                            <BanIcon />
                          </IconButton>
                        ) : (
                          <IconButton tone="success" label="Activate" onClick={() => toggleActive(i)}>
                            <CheckCircleIcon />
                          </IconButton>
                        )}
                        <IconButton tone="danger" label="Delete" onClick={() => setDeleteTarget(i)}>
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <Empty text="No sub admins yet" />}
          </>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => {
          setModal(null);
          setFormError("");
        }}
        title={`${modal?.id ? "Edit" : "Add"} sub admin`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {modal && (
          <>
            <Field label="Name">
              <input
                type="text"
                className="input"
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Access" hint="Pages this sub admin is allowed to open">
              <MultiSelect
                options={ACCESS_OPTIONS}
                selected={form.access}
                onChange={(access) => setForm({ ...form, access })}
              />
            </Field>
            <Field label="Active">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-400"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
            </Field>
          </>
        )}
        {formError && <p className="text-xs text-danger-ink">{formError}</p>}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete sub admin"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="btn-danger" disabled={deleting} onClick={confirmDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <b>{deleteTarget?.name}</b>? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
