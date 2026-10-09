"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authLogin, authLogout, authMe, getStoredAdmin, getToken, setStoredAdmin, setToken } from "./api";

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

  const login = useCallback(async (email, password) => {
    try {
      const data = await authLogin(email, password);
      setToken(data.tokens.accessToken);
      setStoredAdmin(data.user);
      setTok(data.tokens.accessToken);
      setAdmin(data.user);
      return { ok: true };
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

  return <Ctx.Provider value={{ admin, token, ready, login, logout }}>{children}</Ctx.Provider>;
}
