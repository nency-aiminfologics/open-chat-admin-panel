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
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        admin={admin}
        onLogout={() => {
          logout();
          router.replace("/login");
        }}
      />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-2xl text-slate-600">
            ☰
          </button>
          <span className="ml-3 font-semibold">Admin Panel</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
