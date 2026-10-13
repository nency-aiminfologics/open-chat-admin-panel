"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/toast";
import { Badge, Empty, ErrorBanner, Field, Modal, PageHeader, Spinner } from "@/components/ui";

function defaultsFromFields(fields) {
  const obj = {};
  fields.forEach((f) => {
    if (f.type === "checkbox") obj[f.key] = f.defaultValue ?? true;
    else if (f.type === "number") obj[f.key] = f.defaultValue ?? 0;
    else obj[f.key] = f.defaultValue ?? "";
  });
  return obj;
}

/** Generic list + add/edit CRUD manager for simple admin content types (no delete; hide via isActive). */
export default function ContentManager({ title, subtitle, noun, token, list, create, update, fields, titleKey, subtitleKey }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  const save = async () => {
    for (const f of fields) {
      if (f.required && !String(modal[f.key] ?? "").trim()) {
        setFormError(`${f.label} is required`);
        return;
      }
    }
    setFormError("");
    setSaving(true);
    try {
      const body = {};
      fields.forEach((f) => {
        body[f.key] = f.type === "number" ? Number(modal[f.key] || 0) : modal[f.key];
      });
      if (modal.id) await update(token, modal.id, body);
      else await create(token, body);
      setModal(null);
      toast(`${noun} ${modal.id ? "updated" : "created"}`, "success");
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
      toast(item.isActive ? `${noun} hidden` : `${noun} shown`, "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    }
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        <button className="btn-primary" onClick={() => setModal({ ...defaultsFromFields(fields) })}>
          + Add {noun.toLowerCase()}
        </button>
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="card">
              <Empty text={`No ${noun.toLowerCase()}s yet`} />
            </div>
          )}
          {items.map((i) => (
            
            <div key={i.id} className="card p-5">
               <div className="flex justify-end items-end mb-4 md:mb-0 shrink-0 gap-2">
                  <button className="btn-secondary !px-3 !py-1.5" onClick={() => setModal({ ...i })}>
                    Edit
                  </button>
                  <button className="btn-danger !px-3 !py-1.5" onClick={() => toggleActive(i)}>
                    {i.isActive ? "Hide" : "Show"}
                  </button>
                </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{i[titleKey]}</h3>
                    <Badge status={i.isActive ? "active" : "suspended"} />
                  </div>
                  {subtitleKey && (
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{i[subtitleKey]}</p>
                  )}
                  {i.category && <p className="mt-1 text-xs text-slate-400">Category: {i.category}</p>}
                </div>
               
              </div>
              
            </div>
          ))}
        </div>
      )}

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
        {modal &&
          fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <textarea
                  rows={f.rows || 4}
                  maxLength={f.maxLength}
                  className="input"
                  value={modal[f.key] ?? ""}
                  onChange={(e) => setModal({ ...modal, [f.key]: e.target.value })}
                />
              ) : f.type === "select" ? (
                <select
                  className="input"
                  value={modal[f.key] ?? ""}
                  onChange={(e) => setModal({ ...modal, [f.key]: e.target.value })}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-400"
                  checked={!!modal[f.key]}
                  onChange={(e) => setModal({ ...modal, [f.key]: e.target.checked })}
                />
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  maxLength={f.maxLength}
                  className="input"
                  value={modal[f.key] ?? ""}
                  onChange={(e) => setModal({ ...modal, [f.key]: e.target.value })}
                />
              )}
            </Field>
          ))}
        {formError && <p className="text-xs text-danger-ink">{formError}</p>}
      </Modal>
    </>
  );
}
