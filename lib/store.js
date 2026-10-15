"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_EXPIRED_EVENT,
  authLogin,
  authLogout,
  authMe,
  getStoredAdmin,
  getToken,
  setStoredAdmin,
  setToken,
} from "./api";
import { canOpenPage, hasPermission, isFullAdmin } from "./permissions";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setTok] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    const a = getStoredAdmin();
    if (t && a) {
      setTok(t);
      setAdmin(a);
      authMe(t)
        .then((profile) => {
          setAdmin(profile);
          setStoredAdmin(profile);
        })
        .catch(() => {
          setTok(null);
          setAdmin(null);
          setToken(null);
          setStoredAdmin(null);
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  // An expired or revoked session clears local state; the admin layout then routes to /login.
  useEffect(() => {
    const onExpired = () => {
      setTok(null);
      setAdmin(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authLogin(email, password);
      setToken(data.tokens.accessToken);
      setStoredAdmin(data.user);
      setTok(data.tokens.accessToken);
      setAdmin(data.user);
      return { ok: true, admin: data.user };
    } catch (e) {
      return { ok: false, error: e.message || "Login failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    const t = token || getToken();
    if (t) {
      try {
        await authLogout(t);
      } catch {}
    }
    setToken(null);
    setStoredAdmin(null);
    setTok(null);
    setAdmin(null);
  }, [token]);

  /** Replaces the session after a password change — every other session is invalidated server-side. */
  const applyNewSession = useCallback(async (accessToken) => {
    setToken(accessToken);
    setTok(accessToken);
    try {
      const profile = await authMe(accessToken);
      setAdmin(profile);
      setStoredAdmin(profile);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      admin,
      token,
      ready,
      login,
      logout,
      applyNewSession,
      fullAdmin: isFullAdmin(admin),
      mustChangePassword: !!admin?.mustChangePassword,
      can: (permission) => hasPermission(admin, permission),
      canOpen: (href) => canOpenPage(admin, href),
    }),
    [admin, token, ready, login, logout, applyNewSession]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
