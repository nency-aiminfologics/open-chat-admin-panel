"use client";

import { useStore } from "@/lib/store";
import ContentManager from "@/components/ContentManager";

export default function FaqsPage() {
  const { faqs, faqs_ } = useStore();
  return (
    <ContentManager
      heading="FAQs"
      subtitle="Questions and answers shown in the app's help section"
      noun="FAQ"
      items={faqs}
      crud={faqs_}
    />
  );
}
