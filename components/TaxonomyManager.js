"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/toast";
import { Badge, ButtonSpinner, Empty, ErrorBanner, Field, Modal, PageHeader, Pagination, Spinner } from "@/components/ui";

const norm = (s) => String(s || "").trim().toLowerCase();

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

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

/** List + add/edit/delete/activate-deactivate manager for simple name-only taxonomy entities (skills, interests, ...). */
export default function TaxonomyManager({ title, subtitle, noun, token, list, create, update, remove, canManage = true }) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { id?, name, isActive }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const items = result?.items || [];

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    list(token, { page, limit: 20 })
      .then((d) => setResult(Array.isArray(d) ? { items: d } : d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page]);

  const isDuplicate = (name, ignoreId) =>
    items.some((i) => i.id !== ignoreId && norm(i.name) === norm(name));

  const save = async () => {
    const name = String(modal.name ?? "").trim();
    if (!name) {
      setFormError(`${noun} name is required`);
      return;
    }
    if (isDuplicate(name, modal.id)) {
      setFormError(`A ${noun.toLowerCase()} named "${name}" already exists`);
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const body = { name, isActive: modal.isActive ?? true };
      if (modal.id) await update(token, modal.id, body);
      else await create(token, body);
      setModal(null);
      toast(`${noun} ${modal.id ? "updated" : "added"}`, "success");
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await update(token, item.id, { isActive: !item.isActive });
      toast(item.isActive ? `${noun} deactivated` : `${noun} activated`, "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await remove(token, deleteTarget.id);
      toast(`${noun} deleted`, "success");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {canManage && (
          <button className="btn-primary" onClick={() => setModal({ name: "", isActive: true })}>
            + Add {noun.toLowerCase()}
          </button>
        )}
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Status</th>
                  {canManage && <th className="th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{i.name}</td>
                    <td className="td">
                      <Badge status={i.isActive ? "active" : "suspended"} />
                    </td>
                    {canManage && (
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton label="Edit" onClick={() => setModal({ id: i.id, name: i.name, isActive: i.isActive })}>
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <Empty text={`No ${noun.toLowerCase()}s yet`} />}
            {result && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hasPreviousPage={result.hasPreviousPage}
                hasNextPage={result.hasNextPage}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => {
          setModal(null);
          setFormError("");
        }}
        title={`${modal?.id ? "Edit" : "Add"} ${noun.toLowerCase()}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary flex items-center justify-center gap-1.5" disabled={saving} onClick={save}>
              {saving && <ButtonSpinner />}
              Save
            </button>
          </>
        }
      >
        {modal && (
          <>
            <Field label={`${noun} name`}>
              <input
                type="text"
                maxLength={100}
                className="input"
                autoFocus
                value={modal.name ?? ""}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
              />
            </Field>
            <Field label="Active">
              <Switch checked={!!modal.isActive} onChange={(v) => setModal({ ...modal, isActive: v })} />
            </Field>
          </>
        )}
        {formError && <p className="text-xs text-danger-ink">{formError}</p>}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${noun.toLowerCase()}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="btn-danger flex items-center justify-center gap-1.5" disabled={deleting} onClick={confirmDelete}>
              {deleting && <ButtonSpinner className="h-4 w-4 border-white border-t-transparent" />}
              Delete
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
