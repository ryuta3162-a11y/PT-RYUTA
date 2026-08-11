"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  addWorkouts,
  emptyDraft,
  listExercises,
  listWorkouts,
  verifyClient,
} from "@/lib/api";
import type { Client, Exercise, Workout, WorkoutDraft } from "@/lib/types";
import { WorkoutRow } from "@/components/WorkoutRow";

const KEY = "pt-ryuta-client";

export default function ClientPage() {
  const [code, setCode] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [history, setHistory] = useState<Workout[]>([]);
  const [rows, setRows] = useState<WorkoutDraft[]>([emptyDraft()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Client;
          const latest = await verifyClient(parsed.code);
          if (latest) {
            setClient(latest);
            localStorage.setItem(KEY, JSON.stringify(latest));
          }
        } catch {
          localStorage.removeItem(KEY);
        }
      }
      setExercises(await listExercises());
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!client) return;
    void listWorkouts({ clientId: client.id, limit: 20 }).then(setHistory);
  }, [client]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const found = await verifyClient(code.trim());
      if (!found) {
        setError("コードが見つかりません。トレーナーに確認してください。");
        return;
      }
      localStorage.setItem(KEY, JSON.stringify(found));
      setClient(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await addWorkouts({
        clientId: client.id,
        clientName: client.name,
        mode: "self",
        actor: "client",
        items: rows,
      });
      setMessage(`${saved.length}件の自トレ記録を保存しました`);
      setRows([emptyDraft()]);
      setHistory(await listWorkouts({ clientId: client.id, limit: 20 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(KEY);
    setClient(null);
  }

  if (!ready) return null;

  if (!client) {
    return (
      <main className="stack" style={{ paddingTop: 40 }}>
        <div className="topbar">
          <h1>Client</h1>
          <Link href="/" className="text-link">
            戻る
          </Link>
        </div>
        <form className="card stack" onSubmit={login}>
          <p className="muted">トレーナーから受け取った4桁コードで入ります。</p>
          <label className="field">
            <span>お客様コード</span>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1234"
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit">
            はじめる
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="stack" style={{ paddingTop: 24 }}>
      <div className="topbar">
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>
            Self Training
          </p>
          <h1>{client.name} さん</h1>
        </div>
        <button className="btn secondary" type="button" onClick={logout}>
          ログアウト
        </button>
      </div>

      <form className="card stack" onSubmit={save}>
        <p className="muted">自由に種目名を入力できます。候補をタップしてもOKです。</p>
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
          {busy ? "保存中…" : "記録する"}
        </button>
      </form>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>最近の記録</h2>
        <div className="list">
          {history.map((w) => (
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
          {!history.length ? <p className="muted">まだ記録がありません</p> : null}
        </div>
      </div>
    </main>
  );
}
