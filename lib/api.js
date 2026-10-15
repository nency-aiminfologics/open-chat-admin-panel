const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

const TOKEN_KEY = "admin-panel-token-v1";
const ADMIN_KEY = "admin-panel-admin-v1";

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getStoredAdmin() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin) {
  try {
    if (admin) localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    else localStorage.removeItem(ADMIN_KEY);
  } catch {}
}

export const AUTH_EXPIRED_EVENT = "admin-auth-expired";

/**
 * A 401 on any authenticated call means the session is gone — tokens are invalidated
 * server-side when permissions change, an account is suspended or a password is reset.
 * The stored session is dropped and the app is told to send the admin back to login.
 */
function handleAuthExpired() {
  setToken(null);
  setStoredAdmin(null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

/**
 * Key for an idempotent mutation (strikes, notification campaigns). The backend accepts
 * 8–100 letters/digits/underscores/hyphens. Reuse the SAME key when retrying the SAME
 * action; generate a new one for a genuinely new action.
 */
export function newIdempotencyKey() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildQuery(params) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function apiFetch(path, { method = "GET", body, params, token, headers, allowUnauthorized = false } = {}) {
  if (!BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not configured.", { status: 0 });
  }
  const url = `${BASE_URL}${path}${buildQuery(params)}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection or the API base URL.", { status: 0 });
  }

  let json = null;
  try {
    json = await res.json();
  } catch {}

  if (!res.ok || !json || json.success === false) {
    if (res.status === 401 && !allowUnauthorized) handleAuthExpired();
    throw new ApiError(json?.message || `Request failed (${res.status})`, {
      status: res.status,
      errors: json?.errors,
    });
  }
  return json.data;
}

// ---------- Auth ----------
export const authLogin = (email, password) =>
  apiFetch("/auth/admin/login", { method: "POST", body: { email, password }, allowUnauthorized: true });
export const authMe = (token) => apiFetch("/auth/me", { token, allowUnauthorized: true });
export const authLogout = (token) => apiFetch("/auth/logout", { method: "POST", token });

/** Public — completes a sub-admin invitation using the single-use token from the setup link. */
export const setupAdminPassword = (setupToken, password) =>
  apiFetch("/auth/admin/setup-password", {
    method: "POST",
    body: { token: setupToken, password },
    allowUnauthorized: true,
  });

/** Authenticated — returns `{ passwordChanged, tokens }`; the replacement accessToken must be stored. */
export const changeAdminPassword = (token, currentPassword, password) =>
  apiFetch("/auth/admin/change-password", {
    method: "POST",
    token,
    body: { currentPassword, password },
    // A wrong current password is a form error, not an expired session.
    allowUnauthorized: true,
  });

// ---------- Dashboard ----------
export const getDashboard = (token) => apiFetch("/admin/dashboard", { token });

// ---------- Users ----------
export const listUsers = (token, params) => apiFetch("/admin/users", { token, params });
export const getUserDetail = (token, id) => apiFetch(`/admin/users/${id}`, { token });
export const updateUser = (token, id, body) => apiFetch(`/admin/users/${id}`, { method: "PATCH", token, body });

/** Live presence from the Socket.IO/Redis cluster — never cached, no client heartbeat involved. */
export const listOnlineUsers = (token, params) => apiFetch("/admin/users/online", { token, params });

/** `{ items: [{ country, countryName, count }] }` — only countries that have users, highest count first. */
export const listUserCountries = (token) => apiFetch("/admin/users/countries", { token });

// ---------- Verification queue ----------
export const listVerifications = (token, params) => apiFetch("/admin/verifications", { token, params });
export const getVerificationDetail = (token, id) => apiFetch(`/admin/verifications/${id}`, { token });
export const reviewVerification = (token, id, body) =>
  apiFetch(`/admin/verifications/${id}/review`, { method: "PATCH", token, body });

// ---------- Individual document / skill review ----------
export const reviewGovDocument = (token, documentId, body) =>
  apiFetch(`/verification/government-documents/${documentId}/review`, { method: "PATCH", token, body });
export const reviewUserSkill = (token, userId, skillId, body) =>
  apiFetch(`/verification/users/${userId}/skills/${skillId}/review`, { method: "PATCH", token, body });

// ---------- Reports ----------
/** Flat list of individual reports (kept for compatibility). */
export const listReports = (token, params) => apiFetch("/admin/reports", { token, params });
/** One row per reported user, with reportCount/strikeCount and an aggregate status. */
export const listGroupedReports = (token, params) => apiFetch("/admin/reports/grouped", { token, params });
/** `{ reportedUser, strikeCount, reports: {...pagination} }` for one reported user. */
export const listReportsForUser = (token, userId, params) =>
  apiFetch(`/admin/reports/users/${userId}`, { token, params });
export const updateReportStatus = (token, id, status) =>
  apiFetch(`/admin/reports/${id}`, { method: "PATCH", token, body: { status } });

/**
 * Records a strike and optionally suspends the account — transactional on the backend.
 * `idempotencyKey` must be reused when retrying the same strike, and must be new for a new one.
 */
export const addUserStrike = (token, userId, { suspend, note }, idempotencyKey) =>
  apiFetch(`/admin/reports/users/${userId}/strikes`, {
    method: "POST",
    token,
    headers: { "Idempotency-Key": idempotencyKey },
    body: { suspend: !!suspend, ...(note ? { note } : {}) },
  });

// ---------- Tickets ----------
export const listTickets = (token, params) => apiFetch("/admin/tickets", { token, params });
export const getTicketDetail = (token, publicId) => apiFetch(`/admin/tickets/${publicId}`, { token });
export const replyTicket = (token, publicId, text) =>
  apiFetch(`/admin/tickets/${publicId}/messages`, { method: "POST", token, body: { text } });
export const setTicketStatus = (token, publicId, status) =>
  apiFetch(`/admin/tickets/${publicId}/status`, { method: "PATCH", token, body: { status } });

// ---------- Content: FAQs ----------
export const listFaqs = (token) => apiFetch("/admin/content/faqs", { token });
export const createFaq = (token, body) => apiFetch("/admin/content/faqs", { method: "POST", token, body });
export const updateFaq = (token, id, body) => apiFetch(`/admin/content/faqs/${id}`, { method: "PATCH", token, body });

// ---------- Content: Help articles ----------
export const listHelpArticles = (token) => apiFetch("/admin/content/help-articles", { token });
export const createHelpArticle = (token, body) =>
  apiFetch("/admin/content/help-articles", { method: "POST", token, body });
export const updateHelpArticle = (token, id, body) =>
  apiFetch(`/admin/content/help-articles/${id}`, { method: "PATCH", token, body });

// ---------- Content: Skills ----------
export const listSkills = (token, params) => apiFetch("/admin/skills", { token, params });
export const createSkill = (token, body) => apiFetch("/admin/skills", { method: "POST", token, body });
export const updateSkill = (token, id, body) => apiFetch(`/admin/skills/${id}`, { method: "PATCH", token, body });
export const deleteSkill = (token, id) => apiFetch(`/admin/skills/${id}`, { method: "DELETE", token });

// ---------- Content: Interests ----------
export const listInterests = (token, params) => apiFetch("/admin/interests", { token, params });
export const createInterest = (token, body) => apiFetch("/admin/interests", { method: "POST", token, body });
export const updateInterest = (token, id, body) =>
  apiFetch(`/admin/interests/${id}`, { method: "PATCH", token, body });
export const deleteInterest = (token, id) => apiFetch(`/admin/interests/${id}`, { method: "DELETE", token });

// ---------- Content: Privacy policy (singleton) ----------
export const getPrivacyPolicy = async (token) => {
  try {
    return await apiFetch("/admin/content/privacy-policy", { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
export const putPrivacyPolicy = (token, body) =>
  apiFetch("/admin/content/privacy-policy", { method: "PUT", token, body });

// ---------- Content: Terms & conditions (draft + published versions) ----------
/** `{ draft, published }` — either side may be null. */
export const getTermsConditions = async (token) => {
  try {
    return await apiFetch("/admin/content/terms-conditions", { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
/** `publish: false` stores a draft; `publish: true` creates a new immutable version. */
export const putTermsConditions = (token, body, idempotencyKey) =>
  apiFetch("/admin/content/terms-conditions", {
    method: "PUT",
    token,
    body,
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
  });

// ---------- App settings: Force update (per platform) ----------
/** Returns the saved config for one platform, or null when that platform is not configured yet. */
export const getForceUpdateConfig = async (token, platform) => {
  try {
    return await apiFetch("/admin/app-config/force-update", { token, params: { platform } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
export const putForceUpdateConfig = (token, body) =>
  apiFetch("/admin/app-config/force-update", { method: "PUT", token, body });

// ---------- Notification campaigns ----------
export const listNotifications = (token, params) => apiFetch("/admin/notifications", { token, params });
export const getNotification = (token, id) => apiFetch(`/admin/notifications/${id}`, { token });
/** Accepted with HTTP 202 and processed by a backend worker — poll the record for final counts. */
export const sendNotification = (token, body, idempotencyKey) =>
  apiFetch("/admin/notifications", {
    method: "POST",
    token,
    headers: { "Idempotency-Key": idempotencyKey },
    body,
  });

// ---------- Sub admins (full admin only) ----------
/** `{ items: [...backend resource permissions] }` — the allow-list to build the access picker from. */
export const listPermissions = (token) => apiFetch("/admin/permissions", { token });
export const listSubAdmins = (token, params) => apiFetch("/admin/sub-admins", { token, params });
export const createSubAdmin = (token, body) => apiFetch("/admin/sub-admins", { method: "POST", token, body });
export const updateSubAdmin = (token, id, body) => apiFetch(`/admin/sub-admins/${id}`, { method: "PATCH", token, body });
export const deleteSubAdmin = (token, id) => apiFetch(`/admin/sub-admins/${id}`, { method: "DELETE", token });
/** Re-sends a pending setup invitation; use this instead of creating the account again. */
export const resendSubAdminInvitation = (token, id) =>
  apiFetch(`/admin/sub-admins/${id}/invitation`, { method: "POST", token });
