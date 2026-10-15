"use client";

import { useStore } from "@/lib/store";
import { PERMISSIONS } from "@/lib/permissions";
import { createHelpArticle, listHelpArticles, updateHelpArticle } from "@/lib/api";
import ContentManager from "@/components/ContentManager";

const FIELDS = [
  { key: "title", label: "Title", type: "text", required: true, maxLength: 300 },
  { key: "content", label: "Content", type: "textarea", rows: 8, required: true, maxLength: 20000 },
  { key: "category", label: "Category", type: "text", maxLength: 100 },
  {
    key: "platform",
    label: "Platform",
    type: "select",
    options: [
      { value: "all", label: "All" },
      { value: "mobile", label: "Mobile" },
      { value: "desktop", label: "Desktop" },
    ],
    defaultValue: "all",
  },
  { key: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
  { key: "isActive", label: "Active", type: "checkbox", defaultValue: true },
];

export default function HelpArticlesPage() {
  const { token, can } = useStore();
  return (
    <ContentManager
      title="Help Articles"
      subtitle="Longer-form help content shown in the app"
      noun="article"
      token={token}
      list={(t) => listHelpArticles(t).then((d) => d.articles)}
      create={createHelpArticle}
      update={updateHelpArticle}
      fields={FIELDS}
      titleKey="title"
      canManage={can(PERMISSIONS.contentManage)}
      subtitleKey="content"
    />
  );
}
