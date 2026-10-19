"use client";

import { useEffect, useRef, useState } from "react";
import { addUserStrike, newIdempotencyKey } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { ButtonSpinner, Field, Modal } from "@/components/ui";

const MAX_NOTE = 2000;

/**
 * Records a strike against a reported user, optionally suspending the account.
 *
 * The request carries an Idempotency-Key so a retry after a timeout cannot double-strike.
 * The key is pinned to the exact payload: retrying the same strike reuses it, while editing
 * the note or the suspend choice mints a new one (the backend rejects a reused key with
 * different input).
 */
export default function StrikeDialog({ open, onClose, token, user, strikeCount, onDone }) {
  const toast = useToast();
  const [suspend, setSuspend] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef({ key: null, payload: null });

  useEffect(() => {
    if (!open) return;
    setSuspend(false);
    setNote("");
    setError("");
    attempt.current = { key: null, payload: null };
  }, [open, user?.id]);

  const userId = user?.id || user?._id;

  const submit = async () => {
    const payload = JSON.stringify({ suspend, note: note.trim() });
    if (attempt.current.payload !== payload) {
      attempt.current = { key: newIdempotencyKey(), payload };
    }
    setSaving(true);
    setError("");
    try {
      const data = await addUserStrike(
        token,
        userId,
        { suspend, note: note.trim() || undefined },
        attempt.current.key
      );
      toast(suspend ? "Strike recorded and account suspended" : "Strike recorded", "success");
      onDone?.(data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a strike"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className={`${suspend ? "btn-danger" : "btn-primary"} flex items-center justify-center gap-1.5`} disabled={saving} onClick={submit}>
            {saving && <ButtonSpinner className={suspend ? "border-white border-t-transparent" : ""} />}
            {suspend ? "Strike & suspend" : "Record strike"}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        <b>{user?.name || user?.email || userId}</b> currently has {strikeCount ?? 0} strike
        {strikeCount === 1 ? "" : "s"}. Strikes are kept as an audit history — there is no automatic
        suspension threshold, and report statuses are not changed for you.
      </p>

      <label className="mb-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-brand-400"
          checked={suspend}
          onChange={(e) => setSuspend(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-slate-700">Also suspend this account</span>
          <span className="block text-xs text-slate-400">
            Invalidates their tokens and disconnects open sockets immediately.
          </span>
        </span>
      </label>

      <Field label="Note (optional)" hint={`${note.length}/${MAX_NOTE} characters`}>
        <textarea
          rows={3}
          className="input"
          maxLength={MAX_NOTE}
          placeholder="Why this strike is being recorded…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </Modal>
  );
}
