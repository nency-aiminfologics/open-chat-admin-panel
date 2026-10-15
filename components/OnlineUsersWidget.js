"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, listOnlineUsers } from "@/lib/api";

/** Modest polling only — presence is a live observation, never a per-second refresh. */
const REFRESH_MS = 30000;
const FETCH_LIMIT = 8;
const FACEPILE_LIMIT = 5;
const LIST_LIMIT = 5;

// Static class names so Tailwind doesn't purge them.
// first avatar = z-0, second = z-10, third = z-20 ... (later avatars sit on top)
const Z_CLASSES = ["z-0", "z-10", "z-20", "z-30", "z-40", "z-50"];

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-3.3 0-7 1.7-7 4v2h14v-2c0-2.3-3.7-4-7-4ZM2 21v-1.5C2 17.6 4.4 16 8 16c.6 0 1.2.05 1.8.14A5 5 0 0 0 9 19v2Z"
    />
  </svg>
);

const ChevronIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
  </svg>
);

function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/** ISO alpha-2 → flag emoji (e.g. "IN" → 🇮🇳). Returns null for anything that isn't a 2-letter code. */
function countryFlag(code) {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return String.fromCodePoint(...[...upper].map((c) => 127397 + c.charCodeAt(0)));
}

/** Round marker-style avatar: overlaps the previous one, later avatars layered on top. */
function FacepileAvatar({ user, index }) {
  const id = user._id || user.id;
  return (
    <Link
      href={`/users/${id}`}
      title={user.name || user.email}
      className={`relative block h-10 w-10 shrink-0 rounded-full
        ${index > 0 ? "ml-1" : ""} ${Z_CLASSES[index] || "z-50"}
        transition hover:scale-110 hover:!z-[70]`}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-400 text-xs font-semibold text-white">
          {initials(user.name, user.email)}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-white" />
    </Link>
  );
}

function UserRow({ user }) {
  const id = user._id || user.id;
  const country = user.countryName || user.country;
  const flag = countryFlag(user.country);

  return (
    <Link
      href={`/users/${id}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-50/60"
    >
      <span className="relative shrink-0">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initials(user.name, user.email)}
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{user.name || user.email || id}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
          {flag && <span>{flag}</span>}
          {country || "Unknown location"}
        </span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-brand-100 group-hover:text-brand-600">
        <ChevronIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}

/**
 * Dashboard-only presence card — pastel header, live facepile and a short list of who's
 * online, styled after the product's "Online Users" card reference. No search box or
 * manual refresh — it polls silently, and full search/filter/pagination lives on /users.
 */
export default function OnlineUsersWidget({ token, onCount }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listOnlineUsers(token, { page: 1, limit: FETCH_LIMIT });
      if (!alive.current) return;
      setResult(data);
      setUnavailable(false);
      setError("");
      onCountRef.current?.(data?.total ?? 0);
    } catch (e) {
      if (!alive.current) return;
      // 503 means cluster presence is unavailable — never fall back to showing zero online.
      setUnavailable(e instanceof ApiError && e.status === 503);
      setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    poll();
  }, [poll]);

  useEffect(() => {
    const id = setInterval(poll, REFRESH_MS);
    return () => clearInterval(id);
  }, [poll]);

  const total = result?.total ?? 0;
  const items = result?.items || [];
  const facepile = items.slice(0, FACEPILE_LIMIT);
  const facepileOverflow = Math.max(total - facepile.length, 0);
  const listed = items.slice(0, LIST_LIMIT);

  return (
    <div className="card overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <PeopleIcon />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Online Users</h2>
            <p className="text-xs text-slate-500">People currently active on OpenChat</p>
          </div>
        </div>

        <Link
          href="/users"
          className="flex items-center gap-1.5 rounded-full bg-success-tint py-1.5 pl-2.5 pr-2 text-sm font-medium text-success-ink transition hover:brightness-95"
        >
          {!unavailable && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
          )}
          {unavailable ? "Unavailable" : loading && !result ? "Loading…" : `${total} online`}
          <ChevronIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {unavailable ? (
        <div className="mt-5 flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-slate-600">Presence is unavailable right now.</p>
          <p className="max-w-sm text-xs text-slate-400">{error}</p>
        </div>
      ) : loading && !result ? (
        <div className="mt-6 flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
        </div>
      ) : total === 0 ? (
        <p className="mt-6 py-6 text-center text-sm text-slate-400">Nobody is online right now.</p>
      ) : (
        <>
          <div className="mt-5 flex items-center">
            <div className="flex items-center">
              {facepile.map((u, index) => (
                <FacepileAvatar key={u._id || u.id} user={u} index={index} />
              ))}
            </div>
            {facepileOverflow > 0 && (
              <Link
                href="/users"
                title={`${facepileOverflow} more online`}
                className="relative z-[60]  flex h-10 min-w-10 shrink-0 items-center
                 justify-center rounded-full  bg-brand-50 px-1.5 text-xs font-semibold text-brand-700 transition hover:scale-110">
                {facepileOverflow}+
              </Link>
            )}
          </div>

          <div className="my-5 border-t border-slate-100" />

          <div className="space-y-1">
            {listed.map((u) => (
              <UserRow key={u._id || u.id} user={u} />
            ))}
          </div>

          <Link
            href="/users"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
          >
            View all online users
            <ChevronIcon className="h-4 w-4" />
          </Link>
        </>
      )}
    </div>
  );
}