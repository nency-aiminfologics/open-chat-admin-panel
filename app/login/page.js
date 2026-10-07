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

  useEffect(() => {
    if (ready && admin) router.replace("/dashboard");
  }, [ready, admin, router]);

  const submit = (e) => {
    e.preventDefault();
    const res = login(email.trim(), password);
    if (!res.ok) return setError(res.error);
    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Image src="/assets/logo.svg" alt="Admin Logo" width={48} height={48} />
          </div>
          <h1 className="text-xl font-semibold">Admin Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Access the management panel</p>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-ink">{error}</p>}

        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">Demo: admin@example.com / admin123</p>
      </form>
    </div>
  );
}
