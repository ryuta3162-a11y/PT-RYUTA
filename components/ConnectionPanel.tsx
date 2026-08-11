"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getGasUrl,
  isRemoteMode,
  ping,
  setGasUrl,
  setupRemote,
  SUGGESTED_GAS_URL,
} from "@/lib/api";

export function ConnectionPanel() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("確認中…");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await ping();
      setStatus(res.message);
    } catch (e) {
      setStatus(`接続エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useEffect(() => {
    setUrl(getGasUrl() || SUGGESTED_GAS_URL);
    void refresh();
  }, []);

  async function save() {
    setBusy(true);
    try {
      setGasUrl(url);
      await setupRemote();
      await refresh();
    } catch (e) {
      setStatus(
        `設定エラー: ${e instanceof Error ? e.message : String(e)}（ローカル保存のまま使えます。GASの「全員」公開承認後に再接続してください）`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="connection">
      <summary>データ接続（スプレッドシート）</summary>
      <p className="muted">
        現在: {isRemoteMode() ? "リモート設定あり（接続テスト参照）" : "ローカル保存"}
      </p>
      <p className="status">{status}</p>
      <label className="field">
        <span>Apps Script Web App URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={SUGGESTED_GAS_URL}
        />
      </label>
      <button type="button" className="btn secondary" onClick={save} disabled={busy}>
        {busy ? "接続中…" : "保存して初期化"}
      </button>
      <p className="muted tiny">
        Sheets連携済みならこのまま使えます。接続を切り替えるときだけURLを保存してください。
      </p>
      <Link className="text-link" href="/setup">
        セットアップ手順を見る
      </Link>
    </details>
  );
}
