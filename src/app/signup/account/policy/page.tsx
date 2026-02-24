"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PolicyIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signup/account/policy/terms");
  }, [router]);

  return null;
}
