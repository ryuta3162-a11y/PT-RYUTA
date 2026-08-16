"use client";

import { Suspense } from "react";
import OpsClientsInner from "./ClientsInner";

export default function OpsClientsPage() {
  return (
    <Suspense
      fallback={
        <main className="shell">
          <p className="muted">読み込み中…</p>
        </main>
      }
    >
      <OpsClientsInner />
    </Suspense>
  );
}
