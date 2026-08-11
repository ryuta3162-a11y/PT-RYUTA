"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  addWorkouts,
  emptyDraft,
  listClients,
  listExercises,
  upsertClient,
} from "@/lib/api";
import type { Client, Exercise, WorkoutDraft } from "@/lib/types";
import { WorkoutRow } from "@/components/WorkoutRow";

export default function TrainerSessionPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [clientId, setClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [rows, setRows] = useState<WorkoutDraft[]>([emptyDraft()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("pt-ryuta-trainer") !== "1") {
      window.location.href = "/trainer";
      return;
    }
    void (async () => {
      const [c, e] = await Promise.all([listClients(), listExercises()]);
      setClients(c);
      setExercises(e);
      if (c[0]) setClientId(c[0].id);
    })();
  }, []);

  async function createClient() {
    if (!newName.trim()) return;
    const client = await upsertClient({ name: newName.trim() });
    setClients((prev) => [...prev, client]);
    setClientId(client.id);
    setNewName("");
    setMessage(`顧客「${client.name}」を追加（コード: ${client.code}）`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = clients.find((c) => c.id === clientId);
      if (!client) throw new Error("顧客を選択してください");
      const saved = await addWorkouts({
        clientId: client.id,
        clientName: client.name,
        mode: "pt",
        actor: "trainer",
        items: rows,
      });
      setMessage(`${saved.length}件のセッション記録を保存しました`);
      setRows([emptyDraft()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="stack" style={{ paddingTop: 24 }}>
      <div className="topbar">
        <h1>Session Log</h1>
        <Link href="/trainer" className="text-link">
          戻る
        </Link>
      </div>
      <nav className="tabs">
        <Link href="/trainer">ホーム</Link>
        <Link className="active" href="/trainer/session">
          セッション
        </Link>
        <Link href="/trainer/menus">メニュー</Link>
      </nav>

      <form className="card stack" onSubmit={onSubmit}>
        <label className="field">
          <span>顧客</span>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">選択してください</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}（{c.code}）
              </option>
            ))}
          </select>
        </label>

        <div className="stack" style={{ gridTemplateColumns: "1fr auto", display: "grid" }}>
          <label className="field">
            <span>新規顧客を追加</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="山田 太郎"
            />
          </label>
          <button className="btn secondary" type="button" onClick={createClient}>
            追加
          </button>
        </div>

        {rows.map((row, idx) => (
          <WorkoutRow
            key={idx}
            value={row}
            exercises={exercises}
            onChange={(next) =>
              setRows((prev) => prev.map((r, i) => (i === idx ? next : r)))
            }
            onRemove={
              rows.length > 1
                ? () => setRows((prev) => prev.filter((_, i) => i !== idx))
                : undefined
            }
          />
        ))}

        <button
          className="btn secondary"
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyDraft()])}
        >
          種目を追加
        </button>

        {message ? <p className="flash">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "保存中…" : "セッションを保存"}
        </button>
      </form>
    </main>
  );
}
