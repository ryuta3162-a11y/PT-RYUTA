"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { verifyTrainer } from "@/lib/api";

const KEY = "pt-ryuta-trainer";

export default function TrainerGatePage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(KEY) === "1");
    setReady(true);
  }, []);

  async function login() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const ok = await verifyTrainer(pin.trim());
      if (!ok) {
        setError("PINが違います（初期値は 2468）");
        return;
      }
      sessionStorage.setItem(KEY, "1");
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void login();
  }

  if (!ready) {
    return (
      <main className="stack" style={{ paddingTop: 40 }}>
        <p className="muted">読み込み中…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="stack" style={{ paddingTop: 40 }}>
        <div className="topbar">
          <h1>Trainer</h1>
          <Link href="/" className="text-link">
            戻る
          </Link>
        </div>
        <form
          className="card stack"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void login();
          }}
        >
          <p className="muted">トレーナー用PINを入力してください。</p>
          <label className="field">
            <span>PIN</span>
            <input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="2468"
              autoFocus
              disabled={busy}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {busy ? (
            <p className="muted tiny">確認中です。初回は数秒かかることがあります…</p>
          ) : null}
          <button className="btn primary" type="submit" disabled={busy || !pin.trim()}>
            {busy ? "確認中…" : "入室する"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="stack" style={{ paddingTop: 24 }}>
      <div className="topbar">
        <h1>Trainer Home</h1>
        <Link href="/" className="text-link">
          トップ
        </Link>
      </div>
      <nav className="tabs">
        <Link className="active" href="/trainer">
          ホーム
        </Link>
        <Link href="/trainer/session">セッション</Link>
        <Link href="/trainer/menus">メニュー</Link>
      </nav>
      <div className="card stack">
        <p className="pill">PT SESSION</p>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>今日の記録</h2>
        <p className="muted">
          パーソナルトレーニング中に、種目・重量・回数をその場で残せます。
        </p>
        <Link className="btn primary" href="/trainer/session">
          セッション記録を開始
        </Link>
        <Link className="btn secondary" href="/trainer/clients">
          顧客リスト
        </Link>
        <Link className="btn secondary" href="/trainer/menus">
          メニュー作成・共有
        </Link>
      </div>
    </main>
  );
}
