"use client";

import { useStore } from "@/lib/store";
import { createFaq, listFaqs, updateFaq } from "@/lib/api";
import ContentManager from "@/components/ContentManager";

const FIELDS = [
  { key: "question", label: "Question", type: "textarea", rows: 2, required: true, maxLength: 500 },
  { key: "answer", label: "Answer", type: "textarea", rows: 6, required: true, maxLength: 10000 },
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

export default function FaqsPage() {
  const { token } = useStore();
  return (
    <ContentManager
      title="FAQs"
      subtitle="Questions and answers shown in the app's help section"
      noun="FAQ"
      token={token}
      list={(t) => listFaqs(t).then((d) => d.faqs)}
      create={createFaq}
      update={updateFaq}
      fields={FIELDS}
      titleKey="question"
      subtitleKey="answer"
    />
  );
}
