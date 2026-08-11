"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listClients, listWorkouts, upsertClient } from "@/lib/api";
import type { Client, Workout } from "@/lib/types";

export default function TrainerClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  async function refresh() {
    const c = await listClients();
    setClients(c);
  }

  useEffect(() => {
    if (sessionStorage.getItem("pt-ryuta-trainer") !== "1") {
      window.location.href = "/trainer";
      return;
    }
    void refresh();
  }, []);

  useEffect(() => {
    if (!selected) {
      setWorkouts([]);
      return;
    }
    void listWorkouts({ clientId: selected, limit: 30 }).then(setWorkouts);
  }, [selected]);

  async function add() {
    if (!name.trim()) return;
    const client = await upsertClient({ name: name.trim(), goal });
    setName("");
    setGoal("");
    await refresh();
    setSelected(client.id);
  }

  return (
    <main className="stack" style={{ paddingTop: 24 }}>
      <div className="topbar">
        <h1>Clients</h1>
        <Link href="/trainer" className="text-link">
          戻る
        </Link>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>顧客を追加</h2>
        <label className="field">
          <span>氏名</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>目標</span>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="筋力アップ" />
        </label>
        <button className="btn primary" type="button" onClick={add}>
          追加する
        </button>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>顧客リスト</h2>
        <div className="list">
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              className="list-item"
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelected(c.id)}
            >
              <strong>{c.name}</strong>
              <span className="muted tiny">コード {c.code} / {c.goal || "目標未設定"}</span>
            </button>
          ))}
          {!clients.length ? <p className="muted">まだ顧客がいません</p> : null}
        </div>
      </div>

      {selected ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>直近の記録</h2>
          <div className="list">
            {workouts.map((w) => (
              <div key={w.id} className="list-item">
                <strong>
                  {w.exercise}{" "}
                  <span className="pill">{w.mode === "pt" ? "PT" : "自トレ"}</span>
                </strong>
                <span className="muted tiny">
                  {w.date} / {w.weight ?? "-"}kg × {w.reps ?? "-"}回 × {w.sets ?? "-"}set
                </span>
              </div>
            ))}
            {!workouts.length ? <p className="muted">記録がありません</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
