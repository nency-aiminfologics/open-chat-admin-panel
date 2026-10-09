"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getTicketDetail, listTickets, replyTicket, setTicketStatus } from "@/lib/api";
import { Badge, Empty, ErrorBanner, PageHeader, Pagination, Spinner, fmtDateTime } from "@/components/ui";

const FILTERS = ["pending", "open", "success", "rejected"];

export default function SupportPage() {
  const { token } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [ticketError, setTicketError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listTickets(token, { page, limit: 20, status: filter || undefined })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page, filter]);

  const openTicket = (publicId) => {
    setSelectedId(publicId);
    setTicketError("");
    getTicketDetail(token, publicId)
      .then(setTicket)
      .catch((e) => setTicketError(e.message));
  };

  const refreshTicket = () => openTicket(selectedId);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyTicket(token, selectedId, reply.trim());
      setReply("");
      refreshTicket();
      toast("Reply sent", "success");
    } catch (e) {
      setTicketError(e.message);
      toast(e.message, "error");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      await setTicketStatus(token, selectedId, status);
      refreshTicket();
      load();
      toast(`Ticket marked ${status}`, "success");
    } catch (e) {
      setTicketError(e.message);
      toast(e.message, "error");
    }
  };

  const list = result?.items || [];

  return (
    <>
      <PageHeader title="Help & Support" subtitle="Reply to user tickets and update their status" />
      <ErrorBanner error={error} onRetry={load} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="border-b border-slate-200 p-3">
            <select
              className="input"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All tickets</option>
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <Spinner />
            ) : (
              <>
                {list.length === 0 && <Empty text="No tickets" />}
                {list.map((t) => (
                  <button
                    key={t.publicId}
                    onClick={() => openTicket(t.publicId)}
                    className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                      selectedId === t.publicId ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <Badge status={t.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{t.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{fmtDateTime(t.createdAt)}</p>
                  </button>
                ))}
              </>
            )}
          </div>
          {result && (
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hasPreviousPage={result.hasPreviousPage}
              hasNextPage={result.hasNextPage}
              onChange={setPage}
            />
          )}
        </div>

        <div className="card flex min-h-[420px] flex-col lg:col-span-2">
          {!ticket ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a ticket to view the conversation
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h3 className="font-semibold">{ticket.ticket.title}</h3>
                  <p className="text-xs text-slate-500">User {ticket.ticket.userId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={ticket.ticket.status} />
                  {ticket.ticket.status === "pending" && (
                    <button className="btn-danger !px-3 !py-1.5" onClick={() => changeStatus("rejected")}>
                      Reject
                    </button>
                  )}
                  {ticket.ticket.status === "rejected" && (
                    <button className="btn-secondary !px-3 !py-1.5" onClick={() => changeStatus("pending")}>
                      Reopen as pending
                    </button>
                  )}
                </div>
              </div>

              <ErrorBanner error={ticketError} />

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {ticket.ticket.description && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{ticket.ticket.description}</div>
                )}
                {ticket.messages.map((m, idx) => {
                  const isAdmin = m.authorId !== ticket.ticket.userId;
                  return (
                    <div key={idx} className={`flex ${isAdmin ? "justify-end" : ""}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                          isAdmin ? "bg-brand-400 text-brand-950" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p className={`mt-1 text-[10px] ${isAdmin ? "text-brand-900/70" : "text-slate-400"}`}>
                          {isAdmin ? "Admin" : "User"} · {fmtDateTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                  <button className="btn-primary" onClick={send} disabled={!reply.trim() || sending}>
                    {sending ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
