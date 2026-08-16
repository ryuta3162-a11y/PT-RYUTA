"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrainerNav } from "@/components/AppChrome";
import { listClients, listWorkouts } from "@/lib/api";
import {
  isPtClient,
  recordPathForClient,
  toActiveClient,
} from "@/lib/clientKind";
import { saveActiveTrainerClient } from "@/lib/trainerActiveClient";
import type { Client } from "@/lib/types";

export default function OpsHomePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [c, w] = await Promise.all([
          listClients(),
          listWorkouts({ staff: true, limit: 100 }),
        ]);
        setClients(c);
        const today = new Date().toLocaleDateString("sv-SE", {
          timeZone: "Asia/Tokyo",
        });
        setTodayCount(w.filter((x) => x.date === today).length);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  const ptClients = useMemo(() => clients.filter(isPtClient), [clients]);
  const logClients = useMemo(
    () => clients.filter((c) => !isPtClient(c)),
    [clients]
  );

  function startRecord(c: Client) {
    saveActiveTrainerClient(toActiveClient(c));
    router.push(recordPathForClient(c));
  }

  return (
    <main className="shell">
      <header className="app-header">
        <h1>ホーム</h1>
        <div className="sub">work-admin</div>
      </header>

      <div className="summary-row">
        <div className="summary-card">
          <div className="num">{clients.length}</div>
          <div className="lbl">会員</div>
        </div>
        <div className="summary-card">
          <div className="num">{ptClients.length}</div>
          <div className="lbl">PT</div>
        </div>
        <div className="summary-card">
          <div className="num">{todayCount}</div>
          <div className="lbl">今日の記録</div>
        </div>
      </div>

      <div className="content">
        {error ? <p className="error">{error}</p> : null}

        <section className="section-card">
          <div className="section-head">
            <h2>今日やること</h2>
          </div>
          <div className="list-plain">
            <Link href="/ops/session" className="row">
              <strong>workout-log</strong>
              <span className="muted tiny">一般会員の記録（メモがPT以外）</span>
            </Link>
            <Link href="/pta" className="row">
              <strong>PT</strong>
              <span className="muted tiny">回数セッション管理（別アプリ）</span>
            </Link>
            <Link href="/ops/clients" className="row">
              <strong>会員を選ぶ</strong>
              <span className="muted tiny">PT / 一般を切り替えて選択</span>
            </Link>
            <Link href="/ops/menus" className="row">
              <strong>メニューを作る</strong>
              <span className="muted tiny">共有リンクを発行</span>
            </Link>
          </div>
        </section>

        <section className="section-card">
          <div className="section-head">
            <h2>PT会員</h2>
            <Link href="/ops/clients?tab=pt" className="text-link tiny">
              すべて
            </Link>
          </div>
          <div className="list-plain">
            {ptClients.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                className="row"
                onClick={() => startRecord(c)}
                style={{
                  width: "100%",
                  border: 0,
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <strong>
                  {c.name}
                  <span className="pt-badge">PT</span>
                </strong>
                <span className="muted tiny">タップでPT記録</span>
              </button>
            ))}
            {!ptClients.length ? (
              <div className="empty-diary">
                メモが「PT」の会員がいません。スプレッドシートで設定してください。
              </div>
            ) : null}
          </div>
        </section>

        <section className="section-card">
          <div className="section-head">
            <h2>一般会員</h2>
            <Link href="/ops/clients?tab=log" className="text-link tiny">
              すべて
            </Link>
          </div>
          <div className="list-plain">
            {logClients.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                className="row"
                onClick={() => startRecord(c)}
                style={{
                  width: "100%",
                  border: 0,
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <strong>{c.name}</strong>
                <span className="muted tiny">タップで記録</span>
              </button>
            ))}
            {!logClients.length ? (
              <div className="empty-diary">一般会員がいません。</div>
            ) : null}
          </div>
        </section>
      </div>

      <TrainerNav />
    </main>
  );
}
