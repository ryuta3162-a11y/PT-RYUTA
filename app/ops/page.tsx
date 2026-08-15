"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrainerNav } from "@/components/AppChrome";
import { listClients, listWorkouts } from "@/lib/api";
import { loadStaffPin } from "@/lib/staffAuth";
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
        const pin = loadStaffPin();
        const [c, w] = await Promise.all([
          listClients(pin),
          listWorkouts({ pin, limit: 100 }),
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

  function startRecord(c: Client) {
    saveActiveTrainerClient({ id: c.id, name: c.name, code: c.code });
    router.push("/ops/session");
  }

  return (
    <main className="shell">
      <header className="app-header">
        <h1>ホーム</h1>
        <div className="sub">workout-log Staff</div>
      </header>

      <div className="summary-row">
        <div className="summary-card">
          <div className="num">{clients.length}</div>
          <div className="lbl">会員</div>
        </div>
        <div className="summary-card">
          <div className="num">{todayCount}</div>
          <div className="lbl">今日の記録</div>
        </div>
        <div className="summary-card">
          <div className="num">PT</div>
          <div className="lbl">モード</div>
        </div>
      </div>

      <div className="content">
        {error ? <p className="error">{error}</p> : null}

        <section className="section-card">
          <div className="section-head">
            <h2>今日やること</h2>
          </div>
          <div className="list-plain">
            <Link href="/ops/clients" className="row">
              <strong>会員を選んで記録</strong>
              <span className="muted tiny">会員マスタで人を決めてから記録</span>
            </Link>
            <Link href="/ops/session" className="row">
              <strong>記録を開く</strong>
              <span className="muted tiny">選択中の人のセッション入力</span>
            </Link>
            <Link href="/ops/menus" className="row">
              <strong>メニューを作る</strong>
              <span className="muted tiny">共有リンクを発行</span>
            </Link>
          </div>
        </section>

        <section className="section-card">
          <div className="section-head">
            <h2>会員</h2>
            <Link href="/ops/clients" className="text-link tiny">
              すべて
            </Link>
          </div>
          <div className="list-plain">
            {clients.slice(0, 5).map((c) => (
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
            {!clients.length ? (
              <div className="empty-diary">
                有効な会員がありません。スプレッドシート「会員マスタ」を確認してください。
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <TrainerNav />
    </main>
  );
}
