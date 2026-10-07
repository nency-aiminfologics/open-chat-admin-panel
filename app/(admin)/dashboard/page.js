"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";

export default function Dashboard() {
  const { users, tickets, reports } = useStore();

  const cards = [
    { label: "Total users", value: users.length, href: "/users", tone: "bg-brand-50 text-brand-700" },
    {
      label: "Suspended users",
      value: users.filter((u) => u.status === "suspended").length,
      href: "/users",
      tone: "bg-danger-tint text-danger-ink",
    },
    {
      label: "Identity pending",
      value: users.filter((u) => u.identity?.status === "pending").length,
      href: "/identity",
      tone: "bg-warn-tint text-warn-ink",
    },
    {
      label: "Skills pending",
      value: users.reduce((n, u) => n + u.skills.filter((s) => s.status === "pending").length, 0),
      href: "/skill-verification",
      tone: "bg-warn-tint text-warn-ink",
    },
    {
      label: "Open reports",
      value: reports.filter((r) => r.status === "open").length,
      href: "/reports",
      tone: "bg-danger-tint text-danger-ink",
    },
    {
      label: "Open tickets",
      value: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
      href: "/support",
      tone: "bg-brand-100 text-brand-700",
    },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of what needs your attention" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 transition hover:shadow-md">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`mt-2 inline-block rounded-lg px-3 py-1 text-3xl font-semibold ${c.tone}`}>{c.value}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
