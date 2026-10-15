"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, setupAdminPassword } from "@/lib/api";

const MIN_LENGTH = 12;
const MAX_BYTES = 72;

const byteLength = (s) => new TextEncoder().encode(s).length;

export default function SetupPasswordPage() {
  const router = useRouter();
  const [setupToken, setSetupToken] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  /**
   * The invitation link carries the token in the URL fragment, which browsers and proxies keep
   * out of ordinary request logs. It is read once and then removed from history so it does not
   * survive in the back stack, and it is never sent anywhere except the setup endpoint.
   */
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const value = new URLSearchParams(hash).get("token");
    setSetupToken(value || "");
    if (hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

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
      setError("The two passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await setupAdminPassword(setupToken, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many attempts. Wait a moment and try again."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-950 p-4 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-brand-400/15 blur-3xl" />

      <div className="card-dark relative z-10 w-full max-w-sm p-8">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Image src="/assets/logo.svg" alt="Admin Logo" width={110} height={48} />
          </div>
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="mt-1 text-sm text-white/50">Finish setting up your OpenChat admin account</p>
        </div>

        {setupToken === null ? (
          <p className="text-sm text-white/60">Checking your invitation link…</p>
        ) : done ? (
          <>
            <p className="mb-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-green-200">
              Password set. Taking you to the sign-in page…
            </p>
            <Link href="/login" className="btn-primary w-full">
              Go to sign in
            </Link>
          </>
        ) : !setupToken ? (
          <>
            <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-red-200">
              This link is missing its setup token. Open the invitation link from your email exactly as it was sent, or
              ask an administrator to resend the invitation.
            </p>
            <Link href="/login" className="btn-secondary w-full">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-white/80">New password</span>
              <input
                type="password"
                required
                autoFocus
                autoComplete="new-password"
                className="inputlogin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
              />
              {/* <span className="mt-1 block text-xs text-white/40">
                {MIN_LENGTH}+ characters, up to {MAX_BYTES} bytes. Use something unique to this account.
              </span> */}
            </label>
            <label className="mb-5 block">
              <span className="mb-1.5 block text-sm font-medium text-white/80">Confirm password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                className="inputlogin"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-red-200">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Saving…" : "Set password"}
            </button>
            <p className="mt-4 text-center text-xs text-white/40">
              Invitation links are single-use and expire 24 hours after they are sent.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
