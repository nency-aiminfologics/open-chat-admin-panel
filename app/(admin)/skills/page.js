"use client";

import { useStore } from "@/lib/store";
import { createSkill, deleteSkill, listSkills, updateSkill } from "@/lib/api";
import TaxonomyManager from "@/components/TaxonomyManager";

const toList = (d) => (Array.isArray(d) ? d : d?.skills || d?.items || []);

export default function SkillsPage() {
  const { token } = useStore();
  return (
    <TaxonomyManager
      title="Skills"
      subtitle="Skills users can select for verification and matchmaking"
      noun="Skill"
      token={token}
      list={(t) => listSkills(t).then(toList)}
      create={createSkill}
      update={updateSkill}
      remove={deleteSkill}
    />
  );
}
