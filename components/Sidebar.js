"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/users", label: "Users", icon: "☺" },
  { href: "/identity", label: "Identity Verification", icon: "✔" },
  { href: "/skill-verification", label: "Skill Verification", icon: "★" },
  { href: "/catalogue", label: "Skills & Interests", icon: "☰" },
  { href: "/reports", label: "Reports & Blocks", icon: "⚑" },
  { href: "/support", label: "Help & Support", icon: "✉" },
  { href: "/faqs", label: "FAQs", icon: "?" },
  { href: "/policies", label: "Policy Pages", icon: "§" },
];

export default function Sidebar({ open, onClose, onLogout, admin }) {
  const pathname = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5 text-lg py-[40px] font-semibold text-white">
          <Image src="/assets/logo.svg" alt="Admin Logo" width={100} height={60} />
          
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-brand-400 text-brand-950" : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="w-5 text-center">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="truncate text-sm text-white">{admin?.name}</p>
          <p className="truncate text-xs text-slate-400">{admin?.email}</p>
          <button onClick={onLogout} className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm hover:bg-slate-700">
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
