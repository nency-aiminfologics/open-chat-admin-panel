"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { login, admin, ready } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && admin) router.replace("/dashboard");
  }, [ready, admin, router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.replace("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-950 p-4 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-brand-400/15 blur-3xl" />

      <form onSubmit={submit} className="card-dark relative z-10 w-full max-w-sm p-8">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Image src="/assets/logo.svg" alt="Admin Logo" width={110} height={48} />
          </div>
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-white/50">Sign in to manage OpenChat</p>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-white/80">Email</span>
          <input
            type="email"
            required
            autoFocus
            className="inputlogin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>
        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-medium text-white/80">Password</span>
          <input
            type="password"
            required
            className="inputlogin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-red-200">{error}</p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
