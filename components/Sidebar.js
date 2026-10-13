"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function Icon({ path, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  users: "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-3.3 0-7 1.7-7 4v2h14v-2c0-2.3-3.7-4-7-4ZM2 21v-1.5C2 17.6 4.4 16 8 16c.6 0 1.2.05 1.8.14A5 5 0 0 0 9 19v2Z",
  verify: "m9 12 2 2 4-4M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6l7-3Z",
  reports: "M12 9v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  support: "M4 4h16v12H7l-3 3V4Z",
  faq: "M9.1 9a3 3 0 1 1 4.9 2.3c-.7.6-1.5 1.1-1.5 2.2M12 17h.01M4 4h16v16l-4-3H4V4Z",
  articles: "M4 4h16v2H4V4Zm0 5h16v2H4V9Zm0 5h10v2H4v-2Zm0 5h10v2H4v-2Z",
  policy: "M12 3l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Zm-2 9 2 2 3-4",
  terms: "M8 3h8l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v4h4M9 12h6M9 16h6M9 8h3",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m6 14 5-5-5-5m5 5H9",
  skills: "M12 15a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 0v6m-7-2 4-4m10 4-4-4",
  interests: "M12 21s-7-4.35-9.5-8.8C.8 8.6 2.4 5 6 5c2 0 3.2 1.1 4 2.2C10.8 6.1 12 5 14 5c3.6 0 5.2 3.6 3.5 7.2C19 16.65 12 21 12 21Z",
  forceUpdate: "M4 4v5h5M20 20v-5h-5M4.6 9a8 8 0 0 1 14.1-3.4L20 7M19.4 15a8 8 0 0 1-14.1 3.4L4 17",
  notifications: "M15 17H4l1.4-1.4A2 2 0 0 0 6 14.2V11a6 6 0 1 1 12 0v3.2a2 2 0 0 0 .6 1.4L20 17H9m6 0v1a3 3 0 1 1-6 0v-1",
  subadmin: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 0c3 0 6 1.3 6 4v2H6v-2c0-2.7 3-4 6-4Zm6-7 1.3 1.3L21 5",
};

const SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
      { href: "/users", label: "Users", icon: ICONS.users },
    ],
  },
  {
    label: "Moderation",
    items: [
      { href: "/identity", label: "Verification Queue", icon: ICONS.verify },
      { href: "/reports", label: "Reports", icon: ICONS.reports },
    ],
  },
  {
    label: "Support",
    items: [{ href: "/support", label: "Help & Support", icon: ICONS.support }],
  },
  {
    label: "Catalog",
    items: [
      { href: "/skills", label: "Skills", icon: ICONS.skills },
      { href: "/interests", label: "Interests", icon: ICONS.interests },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/faqs", label: "FAQs", icon: ICONS.faq },
      // { href: "/help-articles", label: "Help Articles", icon: ICONS.articles },
      { href: "/policies", label: "Privacy Policy", icon: ICONS.policy },
      { href: "/terms", label: "Terms & Conditions", icon: ICONS.terms },
    ],
  },
  {
    label: "App Settings",
    items: [
      { href: "/force-update", label: "Force Update", icon: ICONS.forceUpdate },
      { href: "/notifications", label: "Notifications", icon: ICONS.notifications },
    ],
  },
  {
    label: "Administration",
    items: [{ href: "/sub-admins", label: "Sub Admins", icon: ICONS.subadmin }],
  },
];

export const NAV = SECTIONS.flatMap((s) => s.items);

/** Flat { value, label } options for every sidebar page — used to let a sub-admin's access be picked by menu. */
export const ACCESS_OPTIONS = NAV.map((n) => ({ value: n.href, label: n.label }));

function initials(name, email) {
  const src = (name || email || "A").trim();
  const parts = src.split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function Sidebar({ open, onClose, onLogout, admin }) {
  const pathname = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-brand-950 text-white/70 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center gap-2 px-6">
          <Image src="/assets/logo.svg" alt="Admin Logo" width={100} height={48} />
        </div>

        <nav className="scrollbar-hide flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((n) => {
                  const active = pathname === n.href || pathname.startsWith(n.href + "/");
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        active ? "bg-brand-400 text-brand-950 shadow-sm" : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon path={n.icon} className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-400 text-sm font-semibold text-brand-950">
              {initials(admin?.name, admin?.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{admin?.name || "Admin"}</p>
              <p className="truncate text-xs text-white/40">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <Icon path={ICONS.logout} className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
