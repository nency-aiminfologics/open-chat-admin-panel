"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }) {
  const { admin, ready, logout } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (ready && !admin) router.replace("/login");
  }, [ready, admin, router]);

  if (!ready || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        admin={admin}
        onLogout={() => {
          logout().finally(() => router.replace("/login"));
        }}
      />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <span className="font-semibold text-slate-800">Admin Panel</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
