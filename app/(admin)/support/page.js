"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Empty, Field, Modal, PageHeader, fmtDateTime } from "@/components/ui";

export default function SupportPage() {
  const { tickets, users, replyTicket, setTicketStatus, createTicket } = useStore();
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: "", subject: "", text: "" });
  const [error, setError] = useState("");

  const userName = (id) => users.find((u) => u.id === id)?.name || "Unknown";
  const list = tickets.filter((t) => filter === "all" || t.status === filter);
  const ticket = tickets.find((t) => t.id === selectedId);

  const send = () => {
    if (!reply.trim()) return;
    replyTicket(ticket.id, reply.trim());
    if (ticket.status === "open") setTicketStatus(ticket.id, "in_progress");
    setReply("");
  };

  const create = () => {
    if (!form.userId || !form.subject.trim() || !form.text.trim()) return setError("All fields are required");
    createTicket(form.userId, form.subject.trim(), form.text.trim());
    setCreating(false);
    setForm({ userId: "", subject: "", text: "" });
    setError("");
  };

  return (
    <>
      <PageHeader title="Help & Support" subtitle="Reply to user tickets and update their status">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          + Create ticket
        </button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ticket list */}
        <div className="card lg:col-span-1">
          <div className="border-b border-slate-200 p-3">
            <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All tickets</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {list.length === 0 && <Empty text="No tickets" />}
            {list.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                  selectedId === t.id ? "bg-brand-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{t.subject}</p>
                  <Badge status={t.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {userName(t.userId)} · {fmtDateTime(t.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="card flex min-h-[420px] flex-col lg:col-span-2">
          {!ticket ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a ticket to view the conversation
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h3 className="font-semibold">{ticket.subject}</h3>
                  <p className="text-xs text-slate-500">From {userName(ticket.userId)}</p>
                </div>
                <select
                  className="input !w-auto"
                  value={ticket.status}
                  onChange={(e) => setTicketStatus(ticket.id, e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {ticket.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.from === "admin" ? "justify-end" : ""}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                        m.from === "admin" ? "bg-brand-400 text-brand-950" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p>{m.text}</p>
                      <p className={`mt-1 text-[10px] ${m.from === "admin" ? "text-brand-900/70" : "text-slate-400"}`}>
                        {m.from === "admin" ? "Admin" : userName(ticket.userId)} · {fmtDateTime(m.at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 p-4">
                <textarea
                  rows={3}
                  className="input"
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      send();
                      setTicketStatus(ticket.id, "resolved");
                    }}
                    disabled={!reply.trim()}
                  >
                    Reply & resolve
                  </button>
                  <button className="btn-primary" onClick={send} disabled={!reply.trim()}>
                    Send reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create ticket for a user"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={create}>
              Create
            </button>
          </>
        }
      >
        <Field label="User">
          <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject">
          <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>
        <Field label="Message">
          <textarea rows={4} className="input" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </Field>
        {error && <p className="text-xs text-danger-ink">{error}</p>}
      </Modal>
    </>
  );
}
