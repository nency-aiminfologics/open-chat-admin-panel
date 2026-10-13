"use client";

import { useStore } from "@/lib/store";
import { createInterest, deleteInterest, listInterests, updateInterest } from "@/lib/api";
import TaxonomyManager from "@/components/TaxonomyManager";

const toList = (d) => (Array.isArray(d) ? d : d?.interests || d?.items || []);

export default function InterestsPage() {
  const { token } = useStore();
  return (
    <TaxonomyManager
      title="Interests"
      subtitle="Interests users can select during onboarding and matchmaking"
      noun="Interest"
      token={token}
      list={(t) => listInterests(t).then(toList)}
      create={createInterest}
      update={updateInterest}
      remove={deleteInterest}
    />
  );
}
