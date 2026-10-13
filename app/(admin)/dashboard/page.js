"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getDashboard } from "@/lib/api";
import { Empty, ErrorBanner, PageHeader, Spinner } from "@/components/ui";
import { Donut, TrendArea } from "@/components/Charts";

export default function Dashboard() {
  const { token } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    getDashboard(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const cards = data
    ? [
        { label: "Total users", value: data.users?.total ?? 0, href: "/users", tone: "bg-brand-50 text-brand-700" },
        {
          label: "Active users",
          value: data.users?.active ?? 0,
          href: "/users",
          tone: "bg-success-tint text-success-ink",
        },
        {
          label: "Verifications pending review",
          value: data.verificationsPendingReview ?? 0,
          href: "/identity",
          tone: "bg-warn-tint text-warn-ink",
        },
        {
          label: "Open reports",
          value: data.reportsOpen ?? 0,
          href: "/reports",
          tone: "bg-danger-tint text-danger-ink",
        },
        {
          label: "Open tickets",
          value: data.ticketsOpen ?? 0,
          href: "/support",
          tone: "bg-brand-100 text-brand-700",
        },
      ]
    : [];

  const total = data?.users?.total ?? 0;
  const active = data?.users?.active ?? 0;
  const inactive = Math.max(total - active, 0);
  const growth = Array.isArray(data?.users?.growth)
    ? [...data.users.growth].sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of what needs your attention" />
      <ErrorBanner error={error} onRetry={load} />
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Link key={c.label} href={c.href} className="card p-5 transition hover:shadow-md">
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className={`mt-2 inline-block rounded-lg px-3 py-1 text-3xl font-semibold ${c.tone}`}>{c.value}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Users by status</h2>
              {total > 0 ? (
                <Donut
                  centerLabel="Total users"
                  centerValue={total}
                  data={[
                    { label: "Active", value: active, color: "text-success", dot: "bg-success" },
                    { label: "Inactive", value: inactive, color: "text-danger", dot: "bg-danger" },
                  ]}
                />
              ) : (
                <Empty text="No users yet" />
              )}
            </div>

            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">New users over time</h2>
              {growth.length >= 2 ? (
                <TrendArea data={growth} seriesLabel="New users" />
              ) : (
                <Empty text="Not enough signup history to chart yet" />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
