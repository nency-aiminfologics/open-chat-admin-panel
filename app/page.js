"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const { admin, ready } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.replace(admin ? "/dashboard" : "/login");
  }, [admin, ready, router]);
  return null;
}
