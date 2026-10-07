"use client";

import { useState } from "react";
import { Empty, Field, Modal, PageHeader } from "@/components/ui";

/** Shared title + description CRUD list used by FAQs and Policy pages. */
export default function ContentManager({ heading, subtitle, noun, items, crud }) {
  const [modal, setModal] = useState(null); // { id?, title, description }
  const [del, setDel] = useState(null);
  const [error, setError] = useState("");

  const save = () => {
    if (!modal.title.trim() || !modal.description.trim()) return setError("Title and description are required");
    modal.id
      ? crud.edit(modal.id, modal.title.trim(), modal.description.trim())
      : crud.add(modal.title.trim(), modal.description.trim());
    setModal(null);
    setError("");
  };

  return (
    <>
      <PageHeader title={heading} subtitle={subtitle}>
        <button className="btn-primary" onClick={() => setModal({ title: "", description: "" })}>
          + Add {noun}
        </button>
      </PageHeader>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="card">
            <Empty text={`No ${noun}s yet`} />
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{i.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{i.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn-secondary !px-3 !py-1.5" onClick={() => setModal({ ...i })}>
                  Edit
                </button>
                <button className="btn-danger !px-3 !py-1.5" onClick={() => setDel(i)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!modal}
        onClose={() => {
          setModal(null);
          setError("");
        }}
        title={`${modal?.id ? "Edit" : "Add"} ${noun}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save}>
              Save
            </button>
          </>
        }
      >
        <Field label="Title">
          <input className="input" value={modal?.title || ""} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea
            rows={7}
            className="input"
            value={modal?.description || ""}
            onChange={(e) => setModal({ ...modal, description: e.target.value })}
          />
        </Field>
        {error && <p className="text-xs text-danger-ink">{error}</p>}
      </Modal>

      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete ${noun}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDel(null)}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                crud.remove(del.id);
                setDel(null);
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Delete “{del?.title}”? This cannot be undone.</p>
      </Modal>
    </>
  );
}
