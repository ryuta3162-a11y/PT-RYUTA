"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/LoadingScreen";

/** 互換用。一般向けアプリの入口は / */
export default function ClientRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <LoadingScreen label="RY-LOG" />;
}
