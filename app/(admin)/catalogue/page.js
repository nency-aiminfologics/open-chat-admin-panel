"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Empty, Modal, PageHeader, Tabs } from "@/components/ui";

export default function CataloguePage() {
  const { catalogue, addCatalogue, editCatalogue, deleteCatalogue } = useStore();
  const [tab, setTab] = useState("skills");
  const [modal, setModal] = useState(null); // { mode: add|edit, id?, name }
  const [del, setDel] = useState(null);
  const [error, setError] = useState("");

  const label = tab === "skills" ? "Skill" : "Interest";
  const items = catalogue[tab];

  const save = () => {
    const name = modal.name.trim();
    if (!name) return setError(`${label} name is required`);
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase() && i.id !== modal.id))
      return setError(`${label} already exists`);
    modal.mode === "add" ? addCatalogue(tab, name) : editCatalogue(tab, modal.id, name);
    setModal(null);
    setError("");
  };

  return (
    <>
      <PageHeader title="Skills & Interests" subtitle="Options users can choose from in the app">
        <button className="btn-primary" onClick={() => setModal({ mode: "add", name: "" })}>
          + Add {label.toLowerCase()}
        </button>
      </PageHeader>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "skills", label: "Skills", count: catalogue.skills.length },
          { value: "interests", label: "Interests", count: catalogue.interests.length },
        ]}
      />

      <div className="card divide-y divide-slate-100">
        {items.length === 0 && <Empty text={`No ${tab} yet`} />}
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm font-medium">{i.name}</span>
            <div className="flex gap-2">
              <button className="btn-secondary !px-3 !py-1.5" onClick={() => setModal({ mode: "edit", id: i.id, name: i.name })}>
                Edit
              </button>
              <button className="btn-danger !px-3 !py-1.5" onClick={() => setDel(i)}>
                Delete
              </button>
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
        title={`${modal?.mode === "add" ? "Add" : "Edit"} ${label.toLowerCase()}`}
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
        <input
          autoFocus
          className="input"
          placeholder={`${label} name`}
          value={modal?.name || ""}
          onChange={(e) => setModal({ ...modal, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        {modal?.mode === "edit" && (
          <p className="mt-2 text-xs text-slate-500">Renaming also updates it on existing user profiles.</p>
        )}
        {error && <p className="mt-2 text-xs text-danger-ink">{error}</p>}
      </Modal>

      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete ${label.toLowerCase()}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDel(null)}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                deleteCatalogue(tab, del.id);
                setDel(null);
              }}
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete “{del?.name}”? It will no longer be offered to new users. Existing profiles keep their data.
        </p>
      </Modal>
    </>
  );
}
