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

function buildQuery(params) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function apiFetch(path, { method = "GET", body, params, token } = {}) {
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
    throw new ApiError(json?.message || `Request failed (${res.status})`, {
      status: res.status,
      errors: json?.errors,
    });
  }
  return json.data;
}

// ---------- Auth ----------
export const authLogin = (email, password) =>
  apiFetch("/auth/admin/login", { method: "POST", body: { email, password } });
export const authMe = (token) => apiFetch("/auth/me", { token });
export const authLogout = (token) => apiFetch("/auth/logout", { method: "POST", token });

// ---------- Dashboard ----------
export const getDashboard = (token) => apiFetch("/admin/dashboard", { token });

// ---------- Users ----------
export const listUsers = (token, params) => apiFetch("/admin/users", { token, params });
export const getUserDetail = (token, id) => apiFetch(`/admin/users/${id}`, { token });
export const updateUser = (token, id, body) => apiFetch(`/admin/users/${id}`, { method: "PATCH", token, body });

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
export const listReports = (token, params) => apiFetch("/admin/reports", { token, params });
export const updateReportStatus = (token, id, status) =>
  apiFetch(`/admin/reports/${id}`, { method: "PATCH", token, body: { status } });

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
export const listSkills = (token) => apiFetch("/admin/skills", { token });
export const createSkill = (token, body) => apiFetch("/admin/skills", { method: "POST", token, body });
export const updateSkill = (token, id, body) => apiFetch(`/admin/skills/${id}`, { method: "PATCH", token, body });
export const deleteSkill = (token, id) => apiFetch(`/admin/skills/${id}`, { method: "DELETE", token });

// ---------- Content: Interests ----------
export const listInterests = (token) => apiFetch("/admin/interests", { token });
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

// ---------- Content: Terms & conditions (singleton) ----------
export const getTermsConditions = async (token) => {
  try {
    return await apiFetch("/admin/content/terms-conditions", { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
export const putTermsConditions = (token, body) =>
  apiFetch("/admin/content/terms-conditions", { method: "PUT", token, body });

// ---------- App settings: Force update (singleton) ----------
export const getForceUpdateConfig = async (token) => {
  try {
    return await apiFetch("/admin/app-config/force-update", { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};
export const putForceUpdateConfig = (token, body) =>
  apiFetch("/admin/app-config/force-update", { method: "PUT", token, body });

// ---------- Notifications ----------
export const listNotifications = (token, params) => apiFetch("/admin/notifications", { token, params });
export const sendNotification = (token, body) => apiFetch("/admin/notifications", { method: "POST", token, body });

// ---------- Sub admins ----------
export const listSubAdmins = (token) => apiFetch("/admin/sub-admins", { token });
export const createSubAdmin = (token, body) => apiFetch("/admin/sub-admins", { method: "POST", token, body });
export const updateSubAdmin = (token, id, body) => apiFetch(`/admin/sub-admins/${id}`, { method: "PATCH", token, body });
export const deleteSubAdmin = (token, id) => apiFetch(`/admin/sub-admins/${id}`, { method: "DELETE", token });
