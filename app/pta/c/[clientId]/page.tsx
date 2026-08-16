"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PtaHeader } from "@/components/PtaHeader";
import { listClients, listPtSessions, peekClients, peekPtSessions, upsertPtSession } from "@/lib/api";
import {
  clientRouteKey,
  findClientByRouteKey,
  isPtClient,
} from "@/lib/clientKind";
import type { Client, PtSession } from "@/lib/types";

function uniqueExerciseCount(s: PtSession) {
  return new Set((s.exercises || []).map((e) => e.name).filter(Boolean)).size;
}

export default function PtaClientSessionsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = decodeURIComponent(String(params.clientId || ""));
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<PtSession[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(c: Client) {
    const rows = await listPtSessions(clientRouteKey(c));
    setSessions(rows);
  }

  useEffect(() => {
    const cachedClients = peekClients();
    const hit0 = cachedClients
      ? findClientByRouteKey(cachedClients, clientId)
      : null;
    if (hit0 && isPtClient(hit0)) {
      setClient(hit0);
      const cached = peekPtSessions(clientRouteKey(hit0));
      if (cached) setSessions(cached);
    }
    void (async () => {
      try {
        const clients = await listClients();
        const hit = findClientByRouteKey(clients, clientId) || null;
        if (!hit || !isPtClient(hit)) {
          setError("PT会員が見つかりません");
          return;
        }
        setClient(hit);
        await refresh(hit);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [clientId]);

  async function createSession() {
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const key = clientRouteKey(client);
      const nextNo =
        sessions.reduce((m, s) => Math.max(m, s.sessionNo), 0) + 1;
      const created = await upsertPtSession({
        clientId: key,
        clientName: client.name,
        sessionNo: nextNo,
        exercises: [],
        memo: "",
      });
      router.push(`/pta/c/${encodeURIComponent(key)}/s/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...sessions].sort((a, b) => b.sessionNo - a.sessionNo);
  const key = clientRouteKey(client || { id: "", code: clientId }) || clientId;

  return (
    <main className="shell pta">
      <PtaHeader
        backHref="/pta"
        backLabel="会員一覧"
        kicker="回数で管理"
        title={client?.name || "PT会員"}
        action={
          <button
            type="button"
            className="btn primary sm pta-hero-add"
            onClick={createSession}
            disabled={busy || !client}
          >
            {busy ? "…" : "＋ 追加"}
          </button>
        }
      />

      <div className="content session-rail pta-page">
        {error ? <p className="error">{error}</p> : null}

        <section className="section-card">
          <div className="section-head">
            <h2>セッション</h2>
            <span className="meta">{sessions.length}回</span>
          </div>
          <div className="list-plain">
            {sorted.map((s) => {
              const n = uniqueExerciseCount(s);
              return (
                <Link
                  key={s.id}
                  href={`/pta/c/${encodeURIComponent(key)}/s/${s.id}`}
                  className="row pta-list-row"
                >
                  <span className="pta-list-main">
                    <strong>第{s.sessionNo}回</strong>
                    <span className="muted tiny">
                      {n ? `${n}種目` : "まだ記録なし"}
                      {s.memo ? ` · ${s.memo.slice(0, 28)}` : ""}
                    </span>
                  </span>
                  <span className="pta-list-go" aria-hidden>
                    ›
                  </span>
                </Link>
              );
            })}
            {!sessions.length ? (
              <div className="empty-diary">
                まだセッションがありません。右上の「追加」から1回目を作ってください。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
