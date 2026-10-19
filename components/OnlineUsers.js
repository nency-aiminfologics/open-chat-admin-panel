"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, listOnlineUsers } from "@/lib/api";
import CountrySelect from "@/components/CountrySelect";
import { ButtonSpinner, Empty, Pagination, PresenceBadge, Spinner, UserCell } from "@/components/ui";

/**
 * Presence comes from the Socket.IO/Redis cluster and is a live observation — modest polling
 * only, and never a per-second refresh. The client sends no heartbeat of its own.
 */
const REFRESH_MS = 30000;

export default function OnlineUsers({ token, limit = 10, onCount }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const alive = useRef(true);
  // Kept in a ref so an inline callback from the parent never re-triggers the fetch effect.
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await listOnlineUsers(token, {
          page,
          limit,
          search: query || undefined,
          country: country || undefined,
        });
        if (!alive.current) return;
        setResult(data);
        setError("");
        setUnavailable(false);
        setUpdatedAt(new Date());
        onCountRef.current?.(data?.total ?? 0);
      } catch (e) {
        if (!alive.current) return;
        // 503 means cluster presence is unavailable — never fall back to showing zero online.
        setUnavailable(e instanceof ApiError && e.status === 503);
        setError(e.message);
      } finally {
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, page, limit, query, country]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  const list = (result?.items || []).filter(
    (u) => (u.role ? u.role === "user" : true) && u.role !== "sub-admin" && u.role !== "admin"
  );

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-800">
            Online users
            {!unavailable && result && (
              <span className="ml-2 rounded-full bg-success-tint px-2 py-0.5 text-xs font-semibold text-success-ink">
                {result.total}
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {unavailable
              ? "Presence unavailable"
              : updatedAt
                ? `Live · updated ${updatedAt.toLocaleTimeString()}${refreshing ? " · refreshing…" : ""}`
                : "Live presence from the socket cluster"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/users" className="text-sm font-medium text-brand-600 hover:underline">
            All users →
          </Link>
          <button
            type="button"
            onClick={() => load({ silent: true })}
            className="btn-secondary flex items-center justify-center gap-1.5 !px-3 !py-1.5 !text-xs"
            disabled={refreshing}
          >
            {refreshing && <ButtonSpinner className="h-3 w-3" />}
            Refresh
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
        <input
          className="input max-w-[220px]"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <CountrySelect
          token={token}
          value={country}
          onChange={(v) => {
            setPage(1);
            setCountry(v);
          }}
        />
        <button type="submit" className="btn-primary !px-3.5 !py-2">
          Search
        </button>
      </form>

      {unavailable ? (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p className="text-sm text-slate-600">
            The presence service is unavailable, so we can&apos;t tell who is online right now.
          </p>
          <p className="max-w-sm text-xs text-slate-400">{error}</p>
          <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => load()}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <Spinner />
      ) : (
        <>
          {error && (
            <div className="border-b border-danger/20 bg-danger-tint px-5 py-2.5 text-sm text-danger-ink">
              {error}{" "}
              <button className="font-medium underline" onClick={() => load()}>
                Retry
              </button>
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {list.map((u) => (
              <li key={u._id || u.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <UserCell userId={u._id || u.id} user={u} size="sm" />
                <div className="flex shrink-0 items-center gap-3">
                  {u.country && <span className="text-xs text-slate-500">{u.country}</span>}
                  <PresenceBadge online />
                </div>
              </li>
            ))}
          </ul>
          {list.length === 0 && <Empty text={query || country ? "No online users match this filter" : "Nobody is online right now"} />}
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
  );
}
