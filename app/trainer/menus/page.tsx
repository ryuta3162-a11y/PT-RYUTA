"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  emptyDraft,
  listClients,
  listExercises,
  listMenus,
  upsertMenu,
} from "@/lib/api";
import type { Client, Exercise, Menu, MenuItem } from "@/lib/types";
import { WorkoutRow } from "@/components/WorkoutRow";

export default function TrainerMenusPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("今週のメニュー");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState([emptyDraft()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("pt-ryuta-trainer") !== "1") {
      window.location.href = "/trainer";
      return;
    }
    void (async () => {
      const [c, e, m] = await Promise.all([
        listClients(),
        listExercises(),
        listMenus(),
      ]);
      setClients(c);
      setExercises(e);
      setMenus(m);
      if (c[0]) setClientId(c[0].id);
    })();
  }, []);

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = clients.find((c) => c.id === clientId);
      if (!client) throw new Error("顧客を選択してください");
      const items: MenuItem[] = rows
        .filter((r) => r.exercise.trim())
        .map((r) => ({
          exercise: r.exercise.trim(),
          weight: r.weight === "" ? null : Number(r.weight),
          reps: r.reps === "" ? null : Number(r.reps),
          sets: r.sets === "" ? null : Number(r.sets),
          note: r.memo,
        }));
      if (!items.length) throw new Error("メニュー種目を入力してください");
      const menu = await upsertMenu({
        clientId: client.id,
        clientName: client.name,
        title,
        notes,
        items,
      });
      setMenus((prev) => [menu, ...prev]);
      setMessage(`メニューを作成しました。共有URLをコピーできます。`);
      setRows([emptyDraft()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("共有リンクをコピーしました");
  }

  return (
    <main className="stack" style={{ paddingTop: 24 }}>
      <div className="topbar">
        <h1>Menus</h1>
        <Link href="/trainer" className="text-link">
          戻る
        </Link>
      </div>
      <nav className="tabs">
        <Link href="/trainer">ホーム</Link>
        <Link href="/trainer/session">セッション</Link>
        <Link className="active" href="/trainer/menus">
          メニュー
        </Link>
      </nav>

      <div className="card stack">
        <label className="field">
          <span>顧客</span>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>タイトル</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>メモ</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

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
        <button className="btn primary" type="button" onClick={save} disabled={busy}>
          {busy ? "作成中…" : "メニューを作成して共有"}
        </button>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>作成済みメニュー</h2>
        <div className="list">
          {menus.map((m) => {
            const url = `${origin}/menu/${m.shareToken}`;
            return (
              <div key={m.id} className="list-item">
                <strong>{m.title}</strong>
                <span className="muted tiny">
                  {m.clientName} / {m.items.length}種目
                </span>
                <button className="btn secondary" type="button" onClick={() => copy(url)}>
                  共有リンクをコピー
                </button>
              </div>
            );
          })}
          {!menus.length ? <p className="muted">まだメニューがありません</p> : null}
        </div>
      </div>
    </main>
  );
}
