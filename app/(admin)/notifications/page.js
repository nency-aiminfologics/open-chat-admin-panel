"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { getNotification, listNotifications, newIdempotencyKey, sendNotification } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import {
  Badge,
  CountChip,
  Empty,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  fmtDateTime,
} from "@/components/ui";

const EMPTY_FORM = { title: "", body: "", audience: "all", userId: "" };

/** A campaign is finished once it reaches one of these; counts are only final then. */
const TERMINAL = ["sent", "partial", "failed"];
const POLL_MS = 5000;

const idOf = (n) => n?._id || n?.id;

export default function NotificationsPage() {
  const { token, can } = useStore();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [detail, setDetail] = useState(null);
  // Pinned to the submitted payload: a retry of the same campaign reuses the key instead of broadcasting twice.
  const attempt = useRef({ key: null, payload: null });

  const canSend = can(PERMISSIONS.notificationsSend);

  const load = useCallback(
    ({ silent = false } = {}) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError("");
      listNotifications(token, { page, limit: 20 })
        .then(setResult)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [token, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  const list = result?.items || [];
  const pending = list.some((n) => !TERMINAL.includes(n.status));

  // The worker finishes campaigns in the background, so poll only while something is still running.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [pending, load]);

  // Keep an open detail dialog in sync until the campaign reaches a terminal state.
  useEffect(() => {
    if (!detail || TERMINAL.includes(detail.status)) return;
    const id = setInterval(() => {
      getNotification(token, idOf(detail))
        .then((d) => setDetail(d))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [detail, token]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    attempt.current = { key: null, payload: null };
    setModal(true);
  };

  const send = async () => {
    const title = form.title.trim();
    const body = form.body.trim();
    const userId = form.userId.trim();
    if (!title || !body) {
      setFormError("Title and message are required");
      return;
    }
    if (form.audience === "user" && !userId) {
      setFormError("A user id is required for a targeted notification");
      return;
    }
    const payload = {
      title,
      body,
      audience: form.audience,
      ...(form.audience === "user" ? { userId } : {}),
    };
    const serialized = JSON.stringify(payload);
    if (attempt.current.payload !== serialized) {
      attempt.current = { key: newIdempotencyKey(), payload: serialized };
    }

    setFormError("");
    setSending(true);
    try {
      const campaign = await sendNotification(token, payload, attempt.current.key);
      toast("Campaign queued — counts appear when it finishes", "success");
      setModal(false);
      setPage(1);
      load({ silent: true });
      if (campaign) setDetail(campaign);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Queue push campaigns and follow what the provider accepted">
        {canSend && (
          <button className="btn-primary" onClick={openModal}>
            + Send notification
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
                  <th className="th">Title</th>
                  <th className="th">Audience</th>
                  <th className="th">Status</th>
                  <th className="th">Accepted</th>
                  <th className="th">Failed</th>
                  <th className="th">Unknown</th>
                  <th className="th">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((n) => {
                  const done = TERMINAL.includes(n.status);
                  return (
                    <tr key={idOf(n)} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(n)}>
                      <td className="td">
                        <p className="font-medium text-slate-800">{n.title}</p>
                        <p className="max-w-xs truncate text-xs text-slate-500">{n.body}</p>
                      </td>
                      <td className="td capitalize">{n.audience === "user" ? n.userId || "User" : "All users"}</td>
                      <td className="td">
                        <Badge status={n.status} />
                      </td>
                      {/* Counts are finalized on completion, not updated continuously. */}
                      <td className="td">{done ? <CountChip value={n.acceptedCount ?? 0} /> : "—"}</td>
                      <td className="td">
                        {done ? <CountChip value={n.failedCount ?? 0} tone={n.failedCount ? "danger" : "neutral"} /> : "—"}
                      </td>
                      <td className="td">
                        {done ? <CountChip value={n.unknownCount ?? 0} tone={n.unknownCount ? "warn" : "neutral"} /> : "—"}
                      </td>
                      <td className="td">{fmtDateTime(n.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {list.length === 0 && <Empty text="No campaigns sent yet" />}
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
        open={modal}
        onClose={() => setModal(false)}
        title="Send notification"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={sending} onClick={send}>
              {sending ? "Queueing…" : "Send"}
            </button>
          </>
        }
      >
        <Field label="Title" hint={`${form.title.length}/200 characters`}>
          <input
            className="input"
            maxLength={200}
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Message" hint={`${form.body.length}/2000 characters`}>
          <textarea
            rows={4}
            className="input"
            maxLength={2000}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>
        <Field label="Audience">
          <select
            className="input"
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
          >
            <option value="all">All users</option>
            <option value="user">Specific user</option>
          </select>
        </Field>
        {form.audience === "user" && (
          <Field label="User id" hint="Must be an active, non-deleted normal user">
            <input className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
          </Field>
        )}
        <p className="text-xs text-slate-400">
          Recipients need a stored FCM token. The campaign is queued and sent in batches by a backend worker, so the
          final counts appear once it completes.
        </p>
        {formError && <p className="mt-2 text-xs text-danger-ink">{formError}</p>}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Campaign">
        {detail && (
          <>
            <div className="mb-4">
              <p className="text-base font-semibold text-slate-900">{detail.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{detail.body}</p>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge status={detail.status} />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Audience</p>
                <p className="mt-1 capitalize text-slate-800">
                  {detail.audience === "user" ? detail.userId || "User" : "All users"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-1 text-slate-800">{fmtDateTime(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Completed</p>
                <p className="mt-1 text-slate-800">
                  {detail.completedAt ? fmtDateTime(detail.completedAt) : "Still running"}
                </p>
              </div>
            </div>

            {TERMINAL.includes(detail.status) ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Accepted", detail.acceptedCount ?? 0, "neutral"],
                  ["Failed", detail.failedCount ?? 0, detail.failedCount ? "danger" : "neutral"],
                  ["Unknown", detail.unknownCount ?? 0, detail.unknownCount ? "warn" : "neutral"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-xl border border-slate-200 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                    <div className="mt-1.5">
                      <CountChip value={value} tone={tone} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                The worker is still processing this campaign. Counts are finalized on completion.
              </p>
            )}

            <p className="mt-4 text-xs text-slate-400">
              {detail.status === "failed" && !detail.acceptedCount && !detail.failedCount && !detail.unknownCount
                ? "All counts are zero, which means no eligible recipients were found."
                : "“Accepted” means the push provider took the message — it does not prove a device displayed it. Interrupted sends are recorded as unknown rather than replayed, and there is no resend action."}
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
