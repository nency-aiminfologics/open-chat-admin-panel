"use client";

import { useStore } from "@/lib/store";
import ContentManager from "@/components/ContentManager";

export default function PoliciesPage() {
  const { policies, policies_ } = useStore();
  return (
    <ContentManager
      heading="Policy Pages"
      subtitle="Privacy policy, terms and other legal content"
      noun="policy"
      items={policies}
      crud={policies_}
    />
  );
}
