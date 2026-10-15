"use client";

import { useStore } from "@/lib/store";
import { PERMISSIONS } from "@/lib/permissions";
import { createSkill, deleteSkill, listSkills, updateSkill } from "@/lib/api";
import TaxonomyManager from "@/components/TaxonomyManager";

export default function SkillsPage() {
  const { token, can } = useStore();
  return (
    <TaxonomyManager
      title="Skills"
      subtitle="Skills users can select for verification and matchmaking"
      noun="Skill"
      token={token}
      list={listSkills}
      create={createSkill}
      update={updateSkill}
      canManage={can(PERMISSIONS.skillsManage)}
      remove={deleteSkill}
    />
  );
}
