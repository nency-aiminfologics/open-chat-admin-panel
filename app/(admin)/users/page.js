"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { listUsers, updateUser } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import CountrySelect from "@/components/CountrySelect";
import OnlineUsers from "@/components/OnlineUsers";
import {
  Badge,
  CountChip,
  Empty,
  ErrorBanner,
  Modal,
  PageHeader,
  Pagination,
  PresenceBadge,
  Spinner,
  Tabs,
  UserCell,
  fmtDate,
} from "@/components/ui";

const ICON_TONE = {
  neutral: "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
  danger: "border border-danger/20 bg-white text-danger hover:bg-danger-tint",
  success: "border border-success/30 bg-white text-success hover:bg-success-tint",
};

function IconButton({ label, tone = "neutral", as: Comp = "button", ...props }) {
  return (
    <Comp
      {...props}
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition ${ICON_TONE[tone]}`}
    >
      {props.children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {label}
      </span>
    </Comp>
  );
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.01 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const BanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0 9 9 0 0 1 12.728 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m5.636 5.636 12.728 12.728" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export default function UsersPage() {
  const { token, can } = useStore();
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams.get("tab");
  const validTab = initialTab === "online" || initialTab === "deleted" ? initialTab : "all";
  const initialActive = searchParams.get("isActive") || "";

  const [view, setView] = useState(validTab);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [isActive, setIsActive] = useState(initialActive);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const canUpdate = can(PERMISSIONS.usersUpdate);

  // Sync tab and isActive with URL search parameters if they change
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "online" || tabParam === "deleted" || tabParam === "all") {
      setView(tabParam);
    }
    const activeParam = searchParams.get("isActive");
    if (activeParam === "true" || activeParam === "false") {
      setIsActive(activeParam);
    } else if (activeParam === null) {
      setIsActive("");
    }
  }, [searchParams]);

  const load = () => {
    if (!token) return;
    if (view === "online") return;
    setLoading(true);
    setError("");

    // isDeleted=false for normal users tab, isDeleted=true for deleted tab
    const isDeletedParam = view === "deleted" ? true : false;

    listUsers(token, {
      page,
      limit: 20,
      role: "user",
      isDeleted: isDeletedParam,
      search: search || undefined,
      country: country || undefined,
      isActive: isActive || undefined,
    })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Filters reset the page before refetching, so a stale page never hides the new results.
  useEffect(load, [token, page, search, country, isActive, view]);

  const handleTabChange = (nextTab) => {
    setView(nextTab);
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    if (nextTab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const qs = params.toString();
    router.replace(qs ? `/users?${qs}` : "/users", { scroll: false });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  };

  const toggleActive = async (user) => {
    try {
      await updateUser(token, user._id, { isActive: !user.isActive });
      setConfirm(null);
      toast(user.isActive ? "Account deactivated" : "Account activated", "success");
      load();
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
      setConfirm(null);
    }
  };

  const list = (result?.items || []).filter(
    (u) => (u.role ? u.role === "user" : true) && u.role !== "sub-admin" && u.role !== "admin"
  );

  const isDeletedTab = view === "deleted";

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={
          result
            ? `${result.total} ${isDeletedTab ? "deleted" : "registered"} users`
            : isDeletedTab
              ? "Deleted users"
              : "Registered users"
        }
      />

      <Tabs
        value={view}
        onChange={handleTabChange}
        tabs={[
          { value: "all", label: "All users" },
          { value: "deleted", label: "Deleted users" },
          { value: "online", label: "Online now" },
        ]}
      />

      {view === "online" ? (
        <OnlineUsers token={token} limit={20} />
      ) : (
        <>
          <ErrorBanner error={error} onRetry={load} />

          <form onSubmit={submitSearch} className="mb-4 flex flex-wrap gap-3">
            <input
              className="input max-w-xs"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <CountrySelect
              token={token}
              value={country}
              onChange={(v) => {
                setPage(1);
                setCountry(v);
              }}
            />
            {!isDeletedTab && (
              <select
                className="input !w-auto"
                value={isActive}
                onChange={(e) => {
                  const val = e.target.value;
                  setPage(1);
                  setIsActive(val);
                  const params = new URLSearchParams(window.location.search);
                  if (val) {
                    params.set("isActive", val);
                  } else {
                    params.delete("isActive");
                  }
                  const qs = params.toString();
                  router.replace(qs ? `/users?${qs}` : "/users", { scroll: false });
                }}
              >
                <option value="">All accounts</option>
                <option value="true">Active</option>
                <option value="false">Deactivated</option>
              </select>
            )}
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>

          <div className="card overflow-x-auto">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="th">User</th>
                      {/* <th className="th">Presence</th> */}
                      <th className="th">Country</th>
                      <th className="th">Strikes</th>
                      <th className="th">{isDeletedTab ? "Registered" : "Joined"}</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((u) => {
                      const isDeletedUser = u.accountStatus === "deleted" || u.isDeleted === true;
                      const status = isDeletedUser ? "deleted" : u.isActive ? "active" : "suspended";
                      const countryDisplay = u.countryName || u.country || (isDeletedUser ? "Unavailable" : "—");

                      return (
                        <tr key={u._id || u.id} className="hover:bg-slate-50">
                          <td className="td">
                            <UserCell userId={u._id || u.id} user={u} link={false} showStatus={false} />
                          </td>
                          {/* <td className="td">
                            <PresenceBadge online={u.isOnline} lastSeenAt={u.lastSeenAt} />
                          </td> */}
                          <td className="td">{countryDisplay}</td>
                          <td className="td">
                            {u.strikeCount ? (
                              <Link href={`/reports/${u._id || u.id}`} title="View reports and strikes">
                                <CountChip value={u.strikeCount} tone={u.strikeCount > 1 ? "danger" : "warn"} />
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="td">{fmtDate(u.createdAt)}</td>
                          <td className="td">
                            <Badge status={status} />
                          </td>
                          <td className="td">
                            <div className="flex justify-end gap-2">
                              <IconButton as={Link} href={`/users/${u._id || u.id}`} label="View">
                                <EyeIcon />
                              </IconButton>
                              {canUpdate &&
                                !isDeletedUser &&
                                (u.isActive ? (
                                  <IconButton tone="danger" label="Suspend" onClick={() => setConfirm(u)}>
                                    <BanIcon />
                                  </IconButton>
                                ) : (
                                  <IconButton tone="success" label="Activate" onClick={() => setConfirm(u)}>
                                    <CheckCircleIcon />
                                  </IconButton>
                                ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty text={isDeletedTab ? "No deleted users found" : "No users found"} />}
                {result && (
                  <Pagination
                    page={result.page}
                    totalPages={result.totalPages}
                    hasPreviousPage={result.hasPreviousPage}
                    hasNextPage={result.hasNextPage}
                    onChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.isActive ? "Deactivate account" : "Activate account"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className={confirm?.isActive ? "btn-danger" : "btn-success"} onClick={() => toggleActive(confirm)}>
              Confirm
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {confirm?.isActive
            ? `${confirm?.name || confirm?.email} will no longer be able to use the app until reactivated. Their tokens are invalidated and open sockets are disconnected.`
            : `${confirm?.name || confirm?.email} will regain access to their account.`}
        </p>
      </Modal>
    </>
  );
}
