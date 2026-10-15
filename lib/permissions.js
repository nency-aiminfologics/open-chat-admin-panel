/**
 * Backend resource scopes — the only values the API accepts in a sub-admin's `access`.
 * Page URLs are never permission values; each page declares the scope it needs below.
 */
export const PERMISSIONS = {
  dashboardRead: "dashboard.read",
  usersRead: "users.read",
  usersUpdate: "users.update",
  verificationRead: "verification.read",
  verificationReview: "verification.review",
  reportsRead: "reports.read",
  reportsModerate: "reports.moderate",
  supportRead: "support.read",
  supportReply: "support.reply",
  skillsRead: "skills.read",
  skillsManage: "skills.manage",
  interestsRead: "interests.read",
  interestsManage: "interests.manage",
  contentRead: "content.read",
  contentManage: "content.manage",
  termsRead: "terms.read",
  termsPublish: "terms.publish",
  appConfigRead: "appConfig.read",
  appConfigManage: "appConfig.manage",
  notificationsRead: "notifications.read",
  notificationsSend: "notifications.send",
};

/** Human labels for the access picker, grouped the way the sidebar is grouped. */
export const PERMISSION_GROUPS = [
  { label: "Overview", items: [["dashboard.read", "View dashboard"]] },
  {
    label: "Users",
    items: [
      ["users.read", "View users, online list & countries"],
      ["users.update", "Activate / deactivate users"],
    ],
  },
  {
    label: "Moderation",
    items: [
      ["verification.read", "View verification queue"],
      ["verification.review", "Approve / reject verifications"],
      ["reports.read", "View reports"],
      ["reports.moderate", "Moderate reports & issue strikes"],
    ],
  },
  {
    label: "Support",
    items: [
      ["support.read", "View tickets"],
      ["support.reply", "Reply to tickets"],
    ],
  },
  {
    label: "Catalog",
    items: [
      ["skills.read", "View skills"],
      ["skills.manage", "Manage skills"],
      ["interests.read", "View interests"],
      ["interests.manage", "Manage interests"],
    ],
  },
  {
    label: "Content",
    items: [
      ["content.read", "View FAQs, help & privacy policy"],
      ["content.manage", "Manage FAQs, help & privacy policy"],
      ["terms.read", "View terms & conditions"],
      ["terms.publish", "Save drafts & publish terms"],
    ],
  },
  {
    label: "App settings",
    items: [
      ["appConfig.read", "View force-update config"],
      ["appConfig.manage", "Change force-update config"],
      ["notifications.read", "View notification campaigns"],
      ["notifications.send", "Send notification campaigns"],
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map(([value]) => value));

export const PERMISSION_LABELS = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map(([value, label]) => [value, label]))
);

/**
 * Scope each page needs to be opened at all. `fullAdminOnly` pages are hidden from
 * sub-admins no matter what scopes they hold — the backend enforces the same rule.
 */
export const PAGE_ACCESS = {
  "/dashboard": { read: "dashboard.read" },
  "/users": { read: "users.read", write: "users.update" },
  "/identity": { read: "verification.read", write: "verification.review" },
  "/reports": { read: "reports.read", write: "reports.moderate" },
  "/support": { read: "support.read", write: "support.reply" },
  "/skills": { read: "skills.read", write: "skills.manage" },
  "/interests": { read: "interests.read", write: "interests.manage" },
  "/faqs": { read: "content.read", write: "content.manage" },
  "/help-articles": { read: "content.read", write: "content.manage" },
  "/policies": { read: "content.read", write: "content.manage" },
  "/terms": { read: "terms.read", write: "terms.publish" },
  "/force-update": { read: "appConfig.read", write: "appConfig.manage" },
  "/notifications": { read: "notifications.read", write: "notifications.send" },
  "/sub-admins": { fullAdminOnly: true },
};

export const isFullAdmin = (admin) => !!admin && admin.role !== "sub-admin";

/** True when the signed-in admin holds `permission`; full admins hold everything. */
export function hasPermission(admin, permission) {
  if (!admin) return false;
  if (isFullAdmin(admin)) return true;
  if (!permission) return false;
  return Array.isArray(admin.access) && admin.access.includes(permission);
}

export function canOpenPage(admin, href) {
  const rule = PAGE_ACCESS[href];
  if (!rule) return isFullAdmin(admin);
  if (rule.fullAdminOnly) return isFullAdmin(admin);
  return hasPermission(admin, rule.read);
}

/** First page the admin is allowed to land on, used after login and when a page is denied. */
export function firstAllowedPage(admin) {
  return Object.keys(PAGE_ACCESS).find((href) => canOpenPage(admin, href)) || null;
}
