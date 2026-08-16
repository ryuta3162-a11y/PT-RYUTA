"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PtaHeader } from "@/components/PtaHeader";
import { listClients } from "@/lib/api";
import { clientRouteKey, isPtClient } from "@/lib/clientKind";
import type { Client } from "@/lib/types";

export default function PtaHomePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    void listClients()
      .then(setClients)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const ptClients = useMemo(() => {
    const rows = clients.filter(isPtClient);
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.code.includes(needle)
    );
  }, [clients, q]);

  return (
    <main className="shell pta">
      <PtaHeader kicker="回数セッション管理" title="PT" />

      <div className="content session-rail pta-page">
        {error ? <p className="error">{error}</p> : null}

        <div className="pta-toolbar">
          <p className="pta-count">
            <strong>{ptClients.length}</strong>人
          </p>
          <label className="field pta-search">
            <span className="sr-only">検索</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名前・会員番号"
              enterKeyHint="search"
            />
          </label>
        </div>

        <section className="section-card">
          <div className="list-plain">
            {ptClients.map((c) => {
              const key = clientRouteKey(c);
              if (!key) return null;
              return (
                <Link
                  key={key}
                  href={`/pta/c/${encodeURIComponent(key)}`}
                  className="row pta-list-row"
                >
                  <span className="pta-list-main">
                    <strong>{c.name}</strong>
                    <span className="muted tiny">{c.code}</span>
                  </span>
                  <span className="pta-list-go" aria-hidden>
                    ›
                  </span>
                </Link>
              );
            })}
            {!ptClients.length ? (
              <div className="empty-diary">
                メモが「PT」の会員がいません。会員マスタのメモに PT
                と入力してください。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
