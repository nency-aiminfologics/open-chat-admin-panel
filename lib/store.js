"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  ADMIN_CREDENTIALS,
  seedUsers,
  seedCatalogue,
  seedReports,
  seedBlocks,
  seedTickets,
  seedFaqs,
  seedPolicies,
  uid,
  now,
} from "./data";

const STORAGE_KEY = "admin-panel-state-v1";
const AUTH_KEY = "admin-panel-auth-v1";

const initialState = {
  users: seedUsers,
  catalogue: seedCatalogue,
  reports: seedReports,
  blocks: seedBlocks,
  tickets: seedTickets,
  faqs: seedFaqs,
  policies: seedPolicies,
};

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
      const auth = localStorage.getItem(AUTH_KEY);
      if (auth) setAdmin(JSON.parse(auth));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const patch = useCallback((key, fn) => setState((s) => ({ ...s, [key]: fn(s[key]) })), []);

  // ---------- Auth ----------
  const login = (email, password) => {
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const a = { email, name: "Super Admin" };
      setAdmin(a);
      localStorage.setItem(AUTH_KEY, JSON.stringify(a));
      return { ok: true };
    }
    return { ok: false, error: "Invalid email or password" };
  };
  const logout = () => {
    setAdmin(null);
    localStorage.removeItem(AUTH_KEY);
  };

  // ---------- Users ----------
  const updateUser = (id, fn) => patch("users", (list) => list.map((u) => (u.id === id ? fn(u) : u)));
  const setUserStatus = (id, status) => updateUser(id, (u) => ({ ...u, status }));

  // ---------- Identity ----------
  const setIdentityStatus = (id, status, rejectionReason = "") =>
    updateUser(id, (u) => ({
      ...u,
      identity: { ...u.identity, status, rejectionReason: status === "rejected" ? rejectionReason : "" },
    }));

  // ---------- Skill verification ----------
  const toggleSkillReview = (userId, skillId, part) =>
    updateUser(userId, (u) => ({
      ...u,
      skills: u.skills.map((s) =>
        s.id === skillId ? { ...s, reviews: { ...s.reviews, [part]: !s.reviews[part] } } : s
      ),
    }));
  const setSkillStatus = (userId, skillId, status, rejectionReason = "") =>
    updateUser(userId, (u) => ({
      ...u,
      skills: u.skills.map((s) =>
        s.id === skillId
          ? { ...s, status, rejectionReason: status === "rejected" ? rejectionReason : "" }
          : s
      ),
    }));

  // ---------- Catalogue (skills / interests) ----------
  const addCatalogue = (type, name) =>
    patch("catalogue", (c) => ({ ...c, [type]: [...c[type], { id: uid(type[0]), name }] }));
  const editCatalogue = (type, id, name) =>
    setState((s) => {
      const old = s.catalogue[type].find((x) => x.id === id)?.name;
      return {
        ...s,
        catalogue: {
          ...s.catalogue,
          [type]: s.catalogue[type].map((x) => (x.id === id ? { ...x, name } : x)),
        },
        // keep users' data in sync with the renamed option
        users: s.users.map((u) =>
          type === "skills"
            ? { ...u, skills: u.skills.map((k) => (k.name === old ? { ...k, name } : k)) }
            : { ...u, interests: u.interests.map((i) => (i === old ? name : i)) }
        ),
      };
    });
  const deleteCatalogue = (type, id) =>
    patch("catalogue", (c) => ({ ...c, [type]: c[type].filter((x) => x.id !== id) }));

  // ---------- Reports ----------
  const resolveReport = (id) =>
    patch("reports", (l) => l.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));

  // ---------- Tickets ----------
  const createTicket = (userId, subject, text) =>
    patch("tickets", (l) => [
      {
        id: uid("t"),
        userId,
        subject,
        status: "open",
        createdAt: now(),
        messages: [{ id: uid("m"), from: "admin", text, at: now() }],
      },
      ...l,
    ]);
  const replyTicket = (id, text) =>
    patch("tickets", (l) =>
      l.map((t) =>
        t.id === id
          ? { ...t, messages: [...t.messages, { id: uid("m"), from: "admin", text, at: now() }] }
          : t
      )
    );
  const setTicketStatus = (id, status) =>
    patch("tickets", (l) => l.map((t) => (t.id === id ? { ...t, status } : t)));

  // ---------- FAQs / Policies ----------
  const makeCrud = (key) => ({
    add: (title, description) => patch(key, (l) => [...l, { id: uid("c"), title, description }]),
    edit: (id, title, description) =>
      patch(key, (l) => l.map((x) => (x.id === id ? { ...x, title, description } : x))),
    remove: (id) => patch(key, (l) => l.filter((x) => x.id !== id)),
  });
  const faqs = makeCrud("faqs");
  const policies = makeCrud("policies");

  const value = {
    ...state,
    ready,
    admin,
    login,
    logout,
    setUserStatus,
    setIdentityStatus,
    toggleSkillReview,
    setSkillStatus,
    addCatalogue,
    editCatalogue,
    deleteCatalogue,
    resolveReport,
    createTicket,
    replyTicket,
    setTicketStatus,
    faqs_: faqs,
    policies_: policies,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
