"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrainerNav } from "@/components/AppChrome";
import { listClients } from "@/lib/api";
import { loadStaffPin } from "@/lib/staffAuth";
import {
  loadActiveTrainerClient,
  saveActiveTrainerClient,
  type ActiveTrainerClient,
} from "@/lib/trainerActiveClient";
import type { Client } from "@/lib/types";

export default function OpsClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [active, setActive] = useState<ActiveTrainerClient | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setActive(loadActiveTrainerClient());
    void listClients(loadStaffPin())
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function selectClient(c: Client) {
    const next = { id: c.id, name: c.name, code: c.code };
    saveActiveTrainerClient(next);
    setActive(next);
  }

  function goRecord(c: Client) {
    selectClient(c);
    router.push("/ops/session");
  }

  return (
    <main className="shell">
      <header className="app-header">
        <h1>会員</h1>
        <div className="sub">ここで記録する人を選ぶ</div>
      </header>

      <div className="summary-row">
        <div className="summary-card">
          <div className="num">{clients.length}</div>
          <div className="lbl">有効会員</div>
        </div>
        <div className="summary-card">
          <div className="num">{active ? "ON" : "-"}</div>
          <div className="lbl">選択中</div>
        </div>
        <div className="summary-card">
          <div className="num" style={{ fontSize: active ? "0.95rem" : "1.25rem" }}>
            {active?.name || "未選択"}
          </div>
          <div className="lbl">記録する人</div>
        </div>
      </div>

      <div className="content">
        {error ? <p className="error">{error}</p> : null}

        <section className="section-card">
          <div className="section-head">
            <h2>会員マスタ</h2>
            <span className="meta">{clients.length}人</span>
          </div>
          <div className="list-plain">
            {clients.map((c) => {
              const on = active?.id === c.id;
              return (
                <div key={c.id} className={on ? "member-pick on" : "member-pick"}>
                  <button
                    type="button"
                    className="member-pick-main"
                    onClick={() => selectClient(c)}
                  >
                    <strong>{c.name}</strong>
                    <span className="muted tiny">
                      {c.code}
                      {c.goal ? ` / ${c.goal}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => goRecord(c)}
                  >
                    記録
                  </button>
                </div>
              );
            })}
            {!clients.length ? (
              <div className="empty-diary">有効な会員がありません。</div>
            ) : null}
          </div>
        </section>

        {active ? (
          <Link className="btn primary" href="/ops/session">
            {active.name} の記録へ
          </Link>
        ) : (
          <p className="muted tiny" style={{ margin: 0 }}>
            会員を選んでから記録画面を開いてください。
          </p>
        )}

        <p className="muted tiny">
          会員の追加・変更・削除は Googleスプレッドシートの「会員マスタ」シートからのみ行えます。
        </p>
      </div>

      <TrainerNav />
    </main>
  );
}
