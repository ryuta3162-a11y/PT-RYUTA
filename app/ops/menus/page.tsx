"use client";

import { useEffect, useMemo, useState } from "react";
import { TrainerNav } from "@/components/AppChrome";
import {
  listClients,
  listExercises,
  listMenus,
  upsertMenu,
} from "@/lib/api";
import type { Client, Exercise, Menu, MenuItem } from "@/lib/types";

export default function OpsMenusPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("今週のメニュー");
  const [notes, setNotes] = useState("");
  const [exercise, setExercise] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const origin = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.origin),
    []
  );

  useEffect(() => {
    void (async () => {
      try {
        const [c, e, m] = await Promise.all([
          listClients(),
          listExercises(),
          listMenus(),
        ]);
        setClients(c);
        setExercises(e);
        setMenus(m);
        if (c[0]) setClientId(c[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  function addItem() {
    if (!exercise.trim()) return;
    setItems((prev) => [...prev, { exercise: exercise.trim(), sets: 3, reps: 10 }]);
    setExercise("");
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = clients.find((c) => c.id === clientId);
      if (!client) throw new Error("会員を選択してください");
      if (!items.length) throw new Error("種目を1つ以上追加してください");
      const menu = await upsertMenu({
        clientId: client.id,
        clientName: client.name,
        title,
        notes,
        items,
      });
      setMenus((prev) => [menu, ...prev]);
      setItems([]);
      setOpen(false);
      setMessage("メニューを作成しました。共有リンクをコピーできます。");
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
    <main className="shell">
      <header className="app-header">
        <h1>メニュー</h1>
        <div className="sub">作成して共有リンクを送る</div>
      </header>

      <div className="content">
        {message ? <p className="flash">{message}</p> : null}
        {error && !open ? <p className="error">{error}</p> : null}

        <section className="section-card">
          <div className="section-head">
            <h2>作成済み</h2>
            <span className="meta">{menus.length}件</span>
          </div>
          <div className="list-plain">
            {menus.map((m) => {
              const url = `${origin}/menu/${m.shareToken}`;
              return (
                <div key={m.id} className="row">
                  <strong>{m.title}</strong>
                  <span className="muted tiny">
                    {m.clientName} / {m.items.length}種目
                  </span>
                  <button
                    className="btn secondary"
                    type="button"
                    style={{ marginTop: 8 }}
                    onClick={() => copy(url)}
                  >
                    共有リンクをコピー
                  </button>
                </div>
              );
            })}
            {!menus.length ? (
              <div className="empty-diary">まだメニューがありません。＋から作成。</div>
            ) : null}
          </div>
        </section>
      </div>

      <button className="fab" type="button" onClick={() => setOpen(true)}>
        +
      </button>

      {open ? (
        <div className="sheet-backdrop" onClick={() => !busy && setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>メニュー作成</h3>
            <label className="field">
              <span>会員</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}（{c.code}）
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
            <label className="field">
              <span>種目を追加</span>
              <input
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                placeholder="レッグプレス"
                list="exercise-list"
              />
              <datalist id="exercise-list">
                {exercises.map((e) => (
                  <option key={e.name} value={e.name} />
                ))}
              </datalist>
            </label>
            <button className="btn secondary" type="button" onClick={addItem}>
              種目リストに追加
            </button>
            <div
              className="list-plain"
              style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 12 }}
            >
              {items.map((item, idx) => (
                <div key={`${item.exercise}-${idx}`} className="row">
                  <strong>{item.exercise}</strong>
                  <span className="muted tiny">
                    {item.sets ?? "-"} set / {item.reps ?? "-"} rep
                  </span>
                </div>
              ))}
              {!items.length ? <div className="empty-diary">種目未追加</div> : null}
            </div>
            {error ? <p className="error">{error}</p> : null}
            <div className="row-actions">
              <button className="btn secondary" type="button" onClick={() => setOpen(false)}>
                キャンセル
              </button>
              <button className="btn primary" type="button" onClick={save} disabled={busy}>
                {busy ? "作成中…" : "作成する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TrainerNav />
    </main>
  );
}
