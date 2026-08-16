"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PtaHeader } from "@/components/PtaHeader";
import {
  listClients,
  listPtSessions,
  peekClients,
  peekPtSessions,
  upsertPtSession,
} from "@/lib/api";
import { clientRouteKey, isPtClient } from "@/lib/clientKind";
import type { Client } from "@/lib/types";

function latestSessionHref(client: Client) {
  const key = clientRouteKey(client);
  if (!key) return "";
  const rows = peekPtSessions(key);
  if (!rows?.length) return "";
  const last = [...rows].sort((a, b) => b.sessionNo - a.sessionNo)[0];
  return `/pta/c/${encodeURIComponent(key)}/s/${last.id}`;
}

export default function PtaHomePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(() => peekClients() || []);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [opening, setOpening] = useState("");

  useEffect(() => {
    void listClients()
      .then((rows) => {
        setClients(rows);
        const pts = rows.filter(isPtClient);
        pts.forEach((c) => {
          const key = clientRouteKey(c);
          if (!key) return;
          void listPtSessions(key).then((sessions) => {
            if (!sessions.length) return;
            const last = [...sessions].sort(
              (a, b) => b.sessionNo - a.sessionNo
            )[0];
            router.prefetch(
              `/pta/c/${encodeURIComponent(key)}/s/${last.id}`
            );
          });
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [router]);

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

  async function openClient(c: Client) {
    const key = clientRouteKey(c);
    if (!key) return;
    setError("");
    const cachedHref = latestSessionHref(c);
    if (cachedHref) {
      router.push(cachedHref);
      void listPtSessions(key);
      return;
    }
    setOpening(key);
    try {
      const rows = await listPtSessions(key);
      if (rows.length) {
        const last = [...rows].sort((a, b) => b.sessionNo - a.sessionNo)[0];
        router.push(`/pta/c/${encodeURIComponent(key)}/s/${last.id}`);
        return;
      }
      const created = await upsertPtSession({
        clientId: key,
        clientName: c.name,
        sessionNo: 1,
        exercises: [],
        memo: "",
      });
      router.push(`/pta/c/${encodeURIComponent(key)}/s/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOpening("");
    }
  }

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
              const busy = opening === key;
              return (
                <button
                  key={key}
                  type="button"
                  className="row pta-list-row"
                  onClick={() => void openClient(c)}
                  disabled={Boolean(opening)}
                >
                  <span className="pta-list-main">
                    <strong>{c.name}</strong>
                    <span className="muted tiny">
                      {busy ? "開いています…" : c.code}
                    </span>
                  </span>
                  <span className="pta-list-go" aria-hidden>
                    ›
                  </span>
                </button>
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
