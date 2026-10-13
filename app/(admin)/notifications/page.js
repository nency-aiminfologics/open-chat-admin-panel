"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { listNotifications, sendNotification } from "@/lib/api";
import { Empty, ErrorBanner, Field, Modal, PageHeader, Pagination, Spinner, fmtDateTime } from "@/components/ui";

const EMPTY_FORM = { title: "", body: "", audience: "all", userId: "" };

export default function NotificationsPage() {
  const { token } = useStore();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    listNotifications(token, { page, limit: 20 })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, page]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal(true);
  };

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Title and message are required");
      return;
    }
    if (form.audience === "user" && !form.userId.trim()) {
      setFormError("User id is required for a targeted notification");
      return;
    }
    setFormError("");
    setSending(true);
    try {
      await sendNotification(token, {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        ...(form.audience === "user" ? { userId: form.userId.trim() } : {}),
      });
      toast("Notification sent", "success");
      setModal(null);
      setPage(1);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSending(false);
    }
  };

  const list = result?.items || [];

  return (
    <>
      <PageHeader title="Notifications" subtitle="Send push notifications and review what's been sent">
        <button className="btn-primary" onClick={openModal}>
          + Send notification
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
                  <th className="th">Title</th>
                  <th className="th">Message</th>
                  <th className="th">Audience</th>
                  <th className="th">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="td font-medium text-slate-800">{n.title}</td>
                    <td className="td max-w-xs truncate text-slate-600">{n.body}</td>
                    <td className="td capitalize">{n.audience === "user" ? n.userId || "User" : "All users"}</td>
                    <td className="td">{fmtDateTime(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <Empty text="No notifications sent yet" />}
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
        onClose={() => setModal(null)}
        title="Send notification"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={sending} onClick={send}>
              {sending ? "Sending…" : "Send"}
            </button>
          </>
        }
      >
        <Field label="Title">
          <input
            className="input"
            maxLength={100}
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Message">
          <textarea
            rows={4}
            className="input"
            maxLength={1000}
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
          <Field label="User id" hint="The target user's id">
            <input className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
          </Field>
        )}
        {formError && <p className="text-xs text-danger-ink">{formError}</p>}
      </Modal>
    </>
  );
}
