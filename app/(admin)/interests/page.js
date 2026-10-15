"use client";

import { useStore } from "@/lib/store";
import { PERMISSIONS } from "@/lib/permissions";
import { createInterest, deleteInterest, listInterests, updateInterest } from "@/lib/api";
import TaxonomyManager from "@/components/TaxonomyManager";

export default function InterestsPage() {
  const { token, can } = useStore();
  return (
    <TaxonomyManager
      title="Interests"
      subtitle="Interests users can select during onboarding and matchmaking"
      noun="Interest"
      token={token}
      list={listInterests}
      create={createInterest}
      update={updateInterest}
      canManage={can(PERMISSIONS.interestsManage)}
      remove={deleteInterest}
    />
  );
}
