"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/toast";
import { Badge, Empty, ErrorBanner, Field, Modal, PageHeader, Spinner } from "@/components/ui";

const norm = (s) => String(s || "").trim().toLowerCase();

/** List + add/edit/delete/activate-deactivate manager for simple name-only taxonomy entities (skills, interests, ...). */
export default function TaxonomyManager({ title, subtitle, noun, token, list, create, update, remove }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { id?, name, isActive }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    list(token)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

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
        <button className="btn-primary" onClick={() => setModal({ name: "", isActive: true })}>
          + Add {noun.toLowerCase()}
        </button>
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
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{i.name}</td>
                    <td className="td">
                      <Badge status={i.isActive ? "active" : "suspended"} />
                    </td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-secondary !px-3 !py-1.5"
                          onClick={() => setModal({ id: i.id, name: i.name, isActive: i.isActive })}
                        >
                          Edit
                        </button>
                        <button className="btn-secondary !px-3 !py-1.5" onClick={() => toggleActive(i)}>
                          {i.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button className="btn-danger !px-3 !py-1.5" onClick={() => setDeleteTarget(i)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <Empty text={`No ${noun.toLowerCase()}s yet`} />}
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
            <button className="btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
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
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-400"
                checked={!!modal.isActive}
                onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
              />
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
