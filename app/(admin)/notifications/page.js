"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  getNotification,
  listNotifications,
  newIdempotencyKey,
  previewNotificationAudience,
  searchNotificationRecipients,
  sendNotification,
} from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import {
  Badge,
  ButtonSpinner,
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

const EMPTY_FORM = { title: "", body: "", audience: "all", userId: "", recipient: null };

/** A campaign is finished once it reaches one of these; counts are only final then. */
const TERMINAL = ["sent", "partial", "failed"];
const POLL_MS = 5000;
const MAX_BYTES = 3800; // conservative UTF-8 payload budget

const idOf = (n) => n?._id || n?.id;

const getByteLength = (str) => new TextEncoder().encode(str).length;

export default function NotificationsPage() {
  const { token, can } = useStore();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [detail, setDetail] = useState(null);

  // Recipient search state
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState([]);
  const [searchingRecipients, setSearchingRecipients] = useState(false);
  const recipientSearchSeq = useRef(0);

  // Pinned to the submitted payload: a retry of the same campaign reuses the key instead of broadcasting twice.
  const attempt = useRef({ key: null, payload: null });

  const canSend = can(PERMISSIONS.notificationsSend);
  const canRead = can(PERMISSIONS.notificationsRead);

  const load = useCallback(
    ({ silent = false } = {}) => {
      if (!token || !canRead) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError("");
      listNotifications(token, {
        page,
        limit: 20,
        status: statusFilter || undefined,
      })
        .then(setResult)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    },
    [token, canRead, page, statusFilter]
  );

  useEffect(() => {
    load();
  }, [load]);

  const list = result?.items || [];
  const pending = list.some((n) => !TERMINAL.includes(n.status));

  // The worker finishes campaigns in the background, so poll only while something is still running.
  useEffect(() => {
    if (!pending || !canRead) return;
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [pending, canRead, load]);

  // Keep an open detail dialog in sync until the campaign reaches a terminal state.
  useEffect(() => {
    if (!detail || TERMINAL.includes(detail.status) || !token || !canRead) return;
    const id = setInterval(() => {
      getNotification(token, idOf(detail))
        .then((d) => setDetail(d))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [detail, token, canRead]);

  // Recipient debounced search
  useEffect(() => {
    const q = recipientQuery.trim();
    if (q.length < 2) {
      setRecipientResults([]);
      setSearchingRecipients(false);
      return;
    }
    const currentSeq = ++recipientSearchSeq.current;
    setSearchingRecipients(true);

    const timer = setTimeout(() => {
      searchNotificationRecipients(token, q)
        .then((res) => {
          if (currentSeq === recipientSearchSeq.current) {
            setRecipientResults(res?.items || (Array.isArray(res) ? res : []));
          }
        })
        .catch(() => {
          if (currentSeq === recipientSearchSeq.current) {
            setRecipientResults([]);
          }
        })
        .finally(() => {
          if (currentSeq === recipientSearchSeq.current) {
            setSearchingRecipients(false);
          }
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [recipientQuery, token]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setRecipientQuery("");
    setRecipientResults([]);
    setFormError("");
    setPreviewData(null);
    attempt.current = { key: null, payload: null };
    setModal(true);
  };

  const handleAudienceChange = (val) => {
    setForm({
      ...form,
      audience: val,
      userId: val === "all" ? "" : form.userId,
      recipient: val === "all" ? null : form.recipient,
    });
    setFormError("");
  };

  const selectRecipient = (user) => {
    setForm({ ...form, userId: user.id || user._id, recipient: user });
    setRecipientQuery("");
    setRecipientResults([]);
    setFormError("");
  };

  // Preview before confirming
  const handleProceedToPreview = async () => {
    const title = form.title.trim();
    const body = form.body.trim();
    const userId = form.userId.trim();

    if (!title || !body) {
      setFormError("Title and message are required");
      return;
    }
    if (form.audience === "user" && !userId) {
      setFormError("Please select an eligible recipient");
      return;
    }

    const payload = {
      title,
      body,
      audience: form.audience,
      ...(form.audience === "user" ? { userId } : {}),
    };

    const byteLength = getByteLength(JSON.stringify(payload));
    if (byteLength > MAX_BYTES) {
      setFormError(`Notification payload exceeds 3800 bytes (${byteLength} bytes). Please shorten the title or message.`);
      return;
    }

    setFormError("");
    setPreviewing(true);
    try {
      const preview = await previewNotificationAudience(token, {
        audience: form.audience,
        ...(form.audience === "user" ? { userId } : {}),
      });
      setPreviewData(preview);
      setModal(false);
      setConfirmModal(true);
    } catch (e) {
      // Zero recipients is not necessarily an API error, but if endpoint fails:
      setFormError(e.message);
    } finally {
      setPreviewing(false);
    }
  };

  const send = async () => {
    const title = form.title.trim();
    const body = form.body.trim();
    const userId = form.userId.trim();

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

    setSending(true);
    try {
      const campaign = await sendNotification(token, payload, attempt.current.key);
      toast("Campaign queued — counts update as FCM processes batches", "success");
      setConfirmModal(false);
      setPage(1);
      load({ silent: true });
      if (campaign) setDetail(campaign);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSending(false);
    }
  };

  const payloadByteCount = getByteLength(
    JSON.stringify({
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      ...(form.audience === "user" && form.userId ? { userId: form.userId } : {}),
    })
  );

  return (
    <>
      <PageHeader title="Notifications" subtitle="Queue push campaigns and follow provider acceptance">
        {canSend && (
          <button className="btn-primary" onClick={openModal}>
            + Send notification
          </button>
        )}
      </PageHeader>

      <ErrorBanner error={error} onRetry={load} />

      {!canRead ? (
        <div className="card p-8 text-center text-slate-500">
          You have permission to send notifications, but not to view campaign history.
        </div>
      ) : (
        <>
          {/* Status Filter Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Filter by status:</span>
              <select
                className="input !w-auto !py-1 !text-xs"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="">All statuses</option>
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="sent">Sent</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            {pending && (
              <span className="flex items-center gap-1.5 text-xs text-brand-600">
                <ButtonSpinner className="h-3 w-3" />
                Live updating active campaigns…
              </span>
            )}
          </div>

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
                      <th className="th" title="Accepted by FCM provider, not device delivery">Accepted</th>
                      <th className="th" title="Provider rejections or delivery failures">Failed</th>
                      <th className="th" title="Unconfirmed / ambiguous delivery">Unknown</th>
                      <th className="th" title="Skipped due to missing token, opt-out or deleted account">Skipped</th>
                      <th className="th">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((n) => {
                      const done = TERMINAL.includes(n.status);
                      const isNoRecipients =
                        n.status === "failed" &&
                        (n.outcome === "no_recipients" ||
                          (!n.acceptedCount && !n.failedCount && !n.unknownCount));

                      return (
                        <tr key={idOf(n)} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(n)}>
                          <td className="td">
                            <p className="font-medium text-slate-800">{n.title}</p>
                            <p className="max-w-xs truncate text-xs text-slate-500">{n.body}</p>
                          </td>
                          <td className="td capitalize">{n.audience === "user" ? "Single user" : "All users"}</td>
                          <td className="td">
                            {isNoRecipients ? (
                              <Badge status="dismissed" />
                            ) : (
                              <Badge status={n.status} />
                            )}
                            {isNoRecipients && (
                              <span className="ml-1 text-xs text-slate-500">(No recipients)</span>
                            )}
                          </td>
                          <td className="td">
                            {done ? (
                              <CountChip value={n.acceptedCount ?? 0} tone={n.acceptedCount ? "success" : "neutral"} />
                            ) : (
                              <span className="text-slate-400 text-xs">In progress</span>
                            )}
                          </td>
                          <td className="td">
                            {done ? (
                              <CountChip value={n.failedCount ?? 0} tone={n.failedCount ? "danger" : "neutral"} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="td">
                            {done ? (
                              <CountChip value={n.unknownCount ?? 0} tone={n.unknownCount ? "warn" : "neutral"} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="td">
                            {done ? (
                              <span className="text-xs text-slate-600">{n.skippedCount ?? 0}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="td text-xs text-slate-500">{fmtDateTime(n.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty text="No campaigns found" />}
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
        </>
      )}

      {/* Create Campaign Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Compose notification"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancel
            </button>
            <button
              className="btn-primary flex items-center justify-center gap-1.5"
              disabled={previewing}
              onClick={handleProceedToPreview}
            >
              {previewing && <ButtonSpinner />}
              Preview & confirm →
            </button>
          </>
        }
      >
        <Field label="Title" hint={`${form.title.length}/200 characters`}>
          <input
            className="input"
            maxLength={200}
            autoFocus
            placeholder="Notification title…"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Message" hint={`${form.body.length}/2000 characters`}>
          <textarea
            rows={4}
            className="input"
            maxLength={2000}
            placeholder="Notification message body…"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </Field>

        {/* UTF-8 Byte limit indicator */}
        <div className="mb-3 flex justify-between text-xs">
          <span className={payloadByteCount > MAX_BYTES ? "text-danger-ink font-semibold" : "text-slate-400"}>
            Payload size: {payloadByteCount} / {MAX_BYTES} bytes
          </span>
          {payloadByteCount > MAX_BYTES && (
            <span className="text-danger-ink">Exceeds limit! Shorten title or message.</span>
          )}
        </div>

        <Field label="Audience">
          <select
            className="input"
            value={form.audience}
            onChange={(e) => handleAudienceChange(e.target.value)}
          >
            <option value="all">All eligible users</option>
            <option value="user">Specific user</option>
          </select>
        </Field>

        {form.audience === "user" && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Target recipient</label>
            <span className="mb-1.5 block text-xs text-slate-400">Type at least 2 characters of name or email to search</span>
            {form.recipient ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-brand-900">{form.recipient.name || "User"}</span>
                  <span className="ml-2 text-xs text-brand-700">({form.recipient.email})</span>
                  <div className="font-mono text-[11px] text-brand-600/70">ID: {form.recipient.id || form.recipient._id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, userId: "", recipient: null })}
                  className="rounded px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-tint"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="input"
                  placeholder="Search user name or email…"
                  value={recipientQuery}
                  onChange={(e) => setRecipientQuery(e.target.value)}
                />
                {searchingRecipients && (
                  <div className="absolute right-3 top-3 text-xs text-slate-400">Searching…</div>
                )}

                {recipientResults.length > 0 && (
                  <div className="mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
                    {recipientResults.map((u) => (
                      <button
                        type="button"
                        key={u.id || u._id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectRecipient(u);
                        }}
                        onClick={() => selectRecipient(u)}
                        className="flex w-full cursor-pointer items-center justify-between border-b border-slate-50 px-3.5 py-2.5 text-left text-xs transition hover:bg-brand-50"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium text-slate-800">{u.name || "Unnamed user"}</p>
                          <p className="truncate text-slate-500">{u.email}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 font-semibold text-brand-700 group-hover:bg-brand-100">
                          Select →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {recipientQuery.trim().length >= 2 && !searchingRecipients && recipientResults.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-400">No eligible recipients found matching “{recipientQuery}”.</p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400">
          Campaigns are sent asynchronously via FCM outbox. Non-English characters or emojis occupy multiple bytes towards the 3800-byte budget.
        </p>
        {formError && <p className="mt-2 text-xs text-danger-ink font-medium">{formError}</p>}
      </Modal>

      {/* Confirmation & Audience Preview Modal */}
      <Modal
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm notification broadcast"
        footer={
          <>
            <button className="btn-secondary" onClick={() => {
              setConfirmModal(false);
              setModal(true);
            }}>
              Back to edit
            </button>
            <button
              className="btn-primary flex items-center justify-center gap-1.5"
              disabled={sending}
              onClick={send}
            >
              {sending && <ButtonSpinner />}
              Send campaign
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">{form.title}</h4>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">{form.body}</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Audience Estimate</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {previewData?.estimatedEligibleCount ?? 0}
              </span>
              <span className="text-xs text-slate-500">estimated eligible recipients</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {previewData?.description ||
                (form.audience === "user"
                  ? `Targeted to: ${form.recipient?.name || form.recipient?.email || form.userId}`
                  : "Targeted to all active users with registered FCM push tokens.")}
            </p>
            {previewData?.estimatedEligibleCount === 0 && (
              <p className="mt-2 rounded-lg bg-warn-tint p-2 text-xs text-warn-ink">
                Notice: 0 recipients are currently eligible. The campaign will finish with no recipients unless eligible devices are found before sending.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Campaign Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Campaign details">
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
                  {detail.status === "failed" && detail.outcome === "no_recipients" && (
                    <span className="ml-1 text-xs text-slate-500">(No eligible recipients)</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Audience</p>
                <p className="mt-1 text-slate-800">
                  {detail.audience === "user"
                    ? `User: ${detail.userId || "Specific"}`
                    : "All users"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-1 text-slate-800">{fmtDateTime(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Completed</p>
                <p className="mt-1 text-slate-800">
                  {detail.completedAt ? fmtDateTime(detail.completedAt) : "In progress…"}
                </p>
              </div>
            </div>

            {/* Target Discovery & Progress */}
            <div className="mb-4 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Target discovery:{" "}
                  <strong>
                    {detail.targetCount ?? detail.eligibleCountEstimate ?? "Calculating…"}
                  </strong>{" "}
                  {detail.targetCountIsFinal ? "(Finalized)" : "(Discovering…)"}
                </span>
                {!TERMINAL.includes(detail.status) && (
                  <span className="text-brand-600 flex items-center gap-1">
                    <ButtonSpinner className="h-3 w-3" />
                    Processing batches…
                  </span>
                )}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl border border-slate-200 p-2.5">
                <p className="uppercase text-slate-400">Accepted</p>
                <div className="mt-1">
                  <CountChip value={detail.acceptedCount ?? 0} tone="success" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5">
                <p className="uppercase text-slate-400">Failed</p>
                <div className="mt-1">
                  <CountChip
                    value={detail.failedCount ?? 0}
                    tone={detail.failedCount ? "danger" : "neutral"}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5">
                <p className="uppercase text-slate-400">Unknown</p>
                <div className="mt-1">
                  <CountChip
                    value={detail.unknownCount ?? 0}
                    tone={detail.unknownCount ? "warn" : "neutral"}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5">
                <p className="uppercase text-slate-400">Skipped</p>
                <div className="mt-1">
                  <CountChip
                    value={detail.skippedCount ?? 0}
                    tone={detail.skippedCount ? "warn" : "neutral"}
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Counters denote provider acceptance by FCM, not guaranteed device display. Skipped accounts were deleted, opted out, or lacked an FCM token prior to transmission.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
