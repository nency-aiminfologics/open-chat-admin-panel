"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getTicketDetail, listTickets, replyTicket, setTicketStatus } from "@/lib/api";
import { Badge, Empty, ErrorBanner, PageHeader, Pagination, Spinner, fmtDate, fmtDateTime } from "@/components/ui";

const FILTERS = ["pending", "success", "rejected"];
const POLL_INTERVAL = 5000;

// The backend prefixes admin replies with "[Admin] "; strip it since the bubble already labels the sender.
const stripAdminPrefix = (body) => String(body || "").replace(/^\[Admin\]\s*/, "");

const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

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
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
    if (!publicId) return;
    setSelectedId(publicId);
    setTicketError("");
    getTicketDetail(token, publicId)
      .then(setTicket)
      .catch((e) => setTicketError(e.message));
  };

  // Auto-open the first ticket in the list once it loads, if nothing is selected yet.
  useEffect(() => {
    if (selectedId || !result?.items?.length) return;
    const first = result.items[0];
    openTicket(first.publicId || first.id || first._id);
  }, [result]);

  const refreshTicket = () => openTicket(selectedId);

  // Silently re-fetch the open conversation so new messages from the user show up without a visible reload.
  const pollTicket = () => {
    if (!selectedId) return;
    getTicketDetail(token, selectedId)
      .then(setTicket)
      .catch(() => {});
  };

  useEffect(() => {
    if (!selectedId) return;
    const id = setInterval(pollTicket, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [ticket?.messages?.length]);

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
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto scrollbar-hide">
            {loading ? (
              <Spinner />
            ) : (
              <>
                {list.length === 0 && <Empty text="No tickets" />}
                {list.map((t) => {
                  const ticketId = t.publicId || t.id || t._id;
                  return (
                    <button
                      key={ticketId}
                      onClick={() => openTicket(ticketId)}
                      className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                        selectedId === ticketId ? "bg-brand-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <Badge status={t.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{t.description}</p>
                      <p className="mt-1 text-xs text-slate-400">{fmtDateTime(t.createdAt)}</p>
                    </button>
                  );
                })}
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

        <div className="card flex min-h-[420px] overflow-hidden lg:col-span-2">
          {!ticket ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a ticket to view the conversation
            </div>
          ) : (
            <div className="flex w-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {ticket.ticket.user?.avatarUrl ? (
                    <img src={ticket.ticket.user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {initials(ticket.ticket.user?.name, ticket.ticket.user?.email)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">
                      {ticket.ticket.user?.name || `User ${ticket.ticket.userId}`}
                    </h3>
                    <p className="truncate text-xs text-slate-500">{ticket.ticket.title}</p>
                  </div>
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

              <div
                className="scrollbar-hide flex-1 space-y-1 overflow-y-auto p-4"
                style={{
                  maxHeight: 500,
                  backgroundColor: "#eef1f6",
                  backgroundImage:
                    "radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
                {ticket.ticket.description && (
                  <div className="mb-3 flex justify-start">
                    <div className="max-w-[75%] rounded-2xl rounded-bl-none border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900 shadow-sm">
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                        </svg>
                        Original request
                      </p>
                      <p className="whitespace-pre-wrap break-words">{ticket.ticket.description}</p>
                    </div>
                  </div>
                )}
                {(() => {
                  let lastDate = null;
                  return ticket.messages.map((m, idx) => {
                    const isAdmin = m.authorId !== ticket.ticket.userId;
                    const day = fmtDate(m.createdAt);
                    const showDateDivider = day !== lastDate;
                    lastDate = day;
                    return (
                      <div key={idx}>
                        {showDateDivider && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                              {day}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] px-3.5 py-2 text-sm shadow-sm ${
                              isAdmin
                                ? "rounded-2xl rounded-br-sm bg-brand-400 text-brand-950"
                                : "rounded-2xl rounded-bl-sm bg-white text-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{stripAdminPrefix(m.body)}</p>
                            <p
                              className={`mt-1 text-right text-[10px] ${
                                isAdmin ? "text-brand-900/60" : "text-slate-400"
                              }`}
                            >
                              {fmtTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="input max-h-32 flex-1 resize-none !rounded-full py-2.5"
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-400 text-brand-950 shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={send}
                  disabled={!reply.trim() || sending}
                  aria-label="Send reply"
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-950/30 border-t-brand-950" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-[1px]">
                      <path d="M3.4 20.6 21 12 3.4 3.4 3 10l12 2-12 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
