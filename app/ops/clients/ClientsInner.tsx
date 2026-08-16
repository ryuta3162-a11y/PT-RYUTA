"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrainerNav } from "@/components/AppChrome";
import { listClients } from "@/lib/api";
import {
  isPtClient,
  recordPathForClient,
  toActiveClient,
} from "@/lib/clientKind";
import {
  loadActiveTrainerClient,
  saveActiveTrainerClient,
  type ActiveTrainerClient,
} from "@/lib/trainerActiveClient";
import type { Client } from "@/lib/types";

type Tab = "all" | "pt" | "log";

export default function OpsClientsInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialTab = (search.get("tab") as Tab) || "all";
  const [tab, setTab] = useState<Tab>(
    initialTab === "pt" || initialTab === "log" ? initialTab : "all"
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [active, setActive] = useState<ActiveTrainerClient | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setActive(loadActiveTrainerClient());
    void listClients()
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const filtered = useMemo(() => {
    if (tab === "pt") return clients.filter(isPtClient);
    if (tab === "log") return clients.filter((c) => !isPtClient(c));
    return clients;
  }, [clients, tab]);

  const ptCount = useMemo(
    () => clients.filter(isPtClient).length,
    [clients]
  );

  function selectClient(c: Client) {
    const next = toActiveClient(c);
    saveActiveTrainerClient(next);
    setActive(next);
  }

  function goRecord(c: Client) {
    selectClient(c);
    router.push(recordPathForClient(c));
  }

  return (
    <main className="shell">
      <header className="app-header">
        <h1>会員</h1>
        <div className="sub">メモが PT の人はパーソナルトレーナー用へ</div>
      </header>

      <div className="summary-row">
        <div className="summary-card">
          <div className="num">{clients.length}</div>
          <div className="lbl">有効会員</div>
        </div>
        <div className="summary-card">
          <div className="num">{ptCount}</div>
          <div className="lbl">PT</div>
        </div>
        <div className="summary-card">
          <div
            className="num"
            style={{ fontSize: active ? "0.95rem" : "1.25rem" }}
          >
            {active?.name || "未選択"}
          </div>
          <div className="lbl">記録する人</div>
        </div>
      </div>

      <div className="content">
        {error ? <p className="error">{error}</p> : null}

        <div className="ops-tabs">
          {(
            [
              ["all", "すべて"],
              ["pt", "PT"],
              ["log", "一般"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "ops-tab on" : "ops-tab"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="section-card">
          <div className="section-head">
            <h2>会員マスタ</h2>
            <span className="meta">{filtered.length}人</span>
          </div>
          <div className="list-plain">
            {filtered.map((c) => {
              const on = active?.id === c.id;
              const pt = isPtClient(c);
              return (
                <div
                  key={c.id}
                  className={on ? "member-pick on" : "member-pick"}
                >
                  <button
                    type="button"
                    className="member-pick-main"
                    onClick={() => selectClient(c)}
                  >
                    <strong>
                      {c.name}
                      {pt ? <span className="pt-badge">PT</span> : null}
                    </strong>
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
                    {pt ? "PT" : "記録"}
                  </button>
                </div>
              );
            })}
            {!filtered.length ? (
              <div className="empty-diary">
                {tab === "pt"
                  ? "メモが「PT」の会員がいません。"
                  : "該当する会員がありません。"}
              </div>
            ) : null}
          </div>
        </section>

        {active ? (
          <Link
            className="btn primary"
            href={recordPathForClient({ notes: active.notes })}
          >
            {active.name} の
            {isPtClient({ notes: active.notes }) ? "PT" : "記録"}へ
          </Link>
        ) : (
          <p className="muted tiny" style={{ margin: 0 }}>
            会員を選んでから記録画面を開いてください。
          </p>
        )}

        <p className="muted tiny">
          スプレッドシート「会員マスタ」のメモに <strong>PT</strong>{" "}
          と書くと、パーソナルトレーナー用ページになります。
        </p>
      </div>

      <TrainerNav />
    </main>
  );
}
