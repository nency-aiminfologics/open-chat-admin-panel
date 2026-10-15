"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { firstAllowedPage } from "@/lib/permissions";

export default function Home() {
  const { admin, ready } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!admin) {
      router.replace("/login");
      return;
    }
    // A sub-admin may not hold dashboard.read, so land on the first page they can open.
    router.replace(admin.mustChangePassword ? "/change-password" : firstAllowedPage(admin) || "/change-password");
  }, [admin, ready, router]);
  return null;
}
