"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { ApiError, changeAdminPassword } from "@/lib/api";
import { firstAllowedPage } from "@/lib/permissions";
import { ButtonSpinner, ErrorBanner, Field, PageHeader } from "@/components/ui";

const MIN_LENGTH = 12;
const MAX_BYTES = 72;

const byteLength = (s) => new TextEncoder().encode(s).length;

export default function ChangePasswordPage() {
  const { token, admin, applyNewSession, mustChangePassword } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (byteLength(password) > MAX_BYTES) {
      setError(`That password is too long (maximum ${MAX_BYTES} bytes).`);
      return;
    }
    if (password !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const data = await changeAdminPassword(token, currentPassword, password);
      // The server issues replacement tokens and invalidates every other session.
      const accessToken = data?.tokens?.accessToken;
      if (accessToken) await applyNewSession(accessToken);
      toast("Password changed — other sessions were signed out", "success");
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      if (mustChangePassword) router.replace(firstAllowedPage(admin) || "/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many attempts. Wait a moment and try again."
          : err.message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Change password"
        subtitle={
          mustChangePassword
            ? "Set your own password before using the admin panel"
            : "Changing your password signs out your other sessions"
        }
      />

      {mustChangePassword && (
        <div className="mb-4 rounded-xl border border-warn/30 bg-warn-tint px-3.5 py-3 text-sm text-warn-ink">
          Your account still uses its initial credentials, so the rest of the panel stays locked until you choose a
          password.
        </div>
      )}

      <ErrorBanner error={error} />

      <form onSubmit={submit} className="card max-w-lg p-5">
        <Field label="Current password">
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="New password" hint={`${MIN_LENGTH}+ characters, up to ${MAX_BYTES} bytes`}>
          <input
            type="password"
            required
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            required
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn-primary flex items-center justify-center gap-1.5" disabled={saving}>
          {saving && <ButtonSpinner />}
          Change password
        </button>
      </form>
    </>
  );
}
