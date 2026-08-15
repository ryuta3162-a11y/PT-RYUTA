"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/LoadingScreen";

/** 旧ディープリンクは自動ログインせず、トップへ誘導 */
export default function MemberDeepLinkPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return <LoadingScreen label="workout-log" />;
}
