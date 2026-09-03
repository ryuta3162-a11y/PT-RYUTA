"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PtaClientEditPanel } from "@/components/PtaClientEditPanel";
import { PtaHeader } from "@/components/PtaHeader";
import {
  listClients,
  listPtSessions,
  peekClients,
  peekPtSessions,
  upsertPtClient,
  upsertPtSession,
} from "@/lib/api";
import { clientRouteKey, isPtClient } from "@/lib/clientKind";
import { normalizeMemberNo } from "@/lib/member";
import type { Client } from "@/lib/types";

function latestSessionHref(client: Client) {
  const key = clientRouteKey(client);
  if (!key) return "";
  const rows = peekPtSessions(key);
  if (!rows?.length) return "";
  const last = [...rows].sort((a, b) => b.sessionNo - a.sessionNo)[0];
  return `/pta/c/${encodeURIComponent(key)}/s/${last.id}`;
}

function formatEnrolled(c: Client) {
  const raw = String(c.enrolledAt || c.createdAt || "").trim();
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return raw || "未入力";
}

function todayTokyo() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export default function PtaHomePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(() => peekClients() || []);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [opening, setOpening] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingKey, setEditingKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [enrolledAt, setEnrolledAt] = useState(todayTokyo);

  useEffect(() => {
    void listClients()
      .then((rows) => {
        setClients(rows);
        const pts = rows.filter(isPtClient);
        pts.forEach((c) => {
          const key = clientRouteKey(c);
          if (!key) return;
          void listPtSessions(key).then((sessions) => {
            if (!sessions.length) return;
            const last = [...sessions].sort(
              (a, b) => b.sessionNo - a.sessionNo
            )[0];
            router.prefetch(
              `/pta/c/${encodeURIComponent(key)}/s/${last.id}`
            );
          });
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [router]);

  const ptClients = useMemo(() => {
    const rows = clients.filter(isPtClient);
    const needle = q.trim().toLowerCase();
    const filtered = !needle
      ? rows
      : rows.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            c.code.includes(needle)
        );
    return [...filtered].sort((a, b) => {
      const da = String(a.enrolledAt || a.createdAt || "");
      const db = String(b.enrolledAt || b.createdAt || "");
      return db.localeCompare(da);
    });
  }, [clients, q]);

  async function openLatest(c: Client) {
    const key = clientRouteKey(c);
    if (!key) return;
    setError("");
    const cachedHref = latestSessionHref(c);
    if (cachedHref) {
      router.push(cachedHref);
      void listPtSessions(key);
      return;
    }
    setOpening(key);
    try {
      const rows = await listPtSessions(key);
      if (rows.length) {
        const last = [...rows].sort((a, b) => b.sessionNo - a.sessionNo)[0];
        router.push(`/pta/c/${encodeURIComponent(key)}/s/${last.id}`);
        return;
      }
      const created = await upsertPtSession({
        clientId: key,
        clientName: c.name,
        sessionNo: 1,
        exercises: [],
        memo: "",
      });
      router.push(`/pta/c/${encodeURIComponent(key)}/s/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOpening("");
    }
  }

  function openSessions(c: Client) {
    const key = clientRouteKey(c);
    if (!key) return;
    router.push(`/pta/c/${encodeURIComponent(key)}`);
  }

  async function addClient(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await upsertPtClient({
        name: name.trim(),
        code: normalizeMemberNo(code),
        enrolledAt,
      });
      const rows = await listClients();
      setClients(rows);
      setName("");
      setCode("");
      setEnrolledAt(todayTokyo());
      setAdding(false);
      await openLatest(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  function onClientSaved(next: Client) {
    setClients((prev) =>
      prev.map((c) =>
        c.id === next.id || clientRouteKey(c) === editingKey ? next : c
      )
    );
    setEditingKey("");
  }

  return (
    <main className="shell pta">
      <PtaHeader
        kicker="回数セッション管理"
        title="PT"
        action={
          <button
            type="button"
            className="btn primary sm pta-hero-add"
            onClick={() => {
              setAdding((v) => !v);
              setEditingKey("");
              setError("");
            }}
          >
            {adding ? "閉じる" : "＋ 会員を追加"}
          </button>
        }
      />

      <div className="content pta-home">
        {error ? <p className="error">{error}</p> : null}

        {adding ? (
          <form className="section-card pta-add-form" onSubmit={addClient}>
            <div className="section-head">
              <h2>PT会員を追加</h2>
              <span className="meta">手打ち</span>
            </div>
            <div className="pta-add-fields pta-add-grid">
              <label className="field">
                <span>氏名</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 森 ヨシオ"
                  required
                  autoComplete="name"
                />
              </label>
              <label className="field">
                <span>会員番号（10桁）</span>
                <input
                  value={code}
                  onChange={(e) => setCode(normalizeMemberNo(e.target.value))}
                  placeholder="1304000000"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                  required
                />
              </label>
              <label className="field">
                <span>入会日</span>
                <input
                  type="date"
                  value={enrolledAt}
                  onChange={(e) => setEnrolledAt(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn primary pta-add-submit"
                disabled={saving}
              >
                {saving ? "追加中…" : "追加して最新セッションを開く"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="pta-toolbar">
          <p className="pta-count">
            <strong>{ptClients.length}</strong>人
          </p>
          <label className="field pta-search">
            <span className="sr-only">検索</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名前・会員番号で検索"
              enterKeyHint="search"
            />
          </label>
        </div>

        <section className="section-card pta-home-list">
          <div className="pta-home-head">
            <span>氏名</span>
            <span>会員番号</span>
            <span>入会日</span>
            <span>操作</span>
          </div>
          <div className="pta-home-body">
            {ptClients.map((c) => {
              const key = clientRouteKey(c);
              if (!key) return null;
              const busy = opening === key;
              const editing = editingKey === key;
              return (
                <div key={key} className="pta-home-block">
                  <div className="pta-home-row">
                    <p className="pta-home-name">{c.name}</p>
                    <p className="pta-home-code">{c.code || "未入力"}</p>
                    <p className="pta-home-date">{formatEnrolled(c)}</p>
                    <div className="pta-home-ops">
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => void openLatest(c)}
                        disabled={Boolean(opening)}
                      >
                        {busy ? "開いています…" : "最新セッション"}
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => openSessions(c)}
                        disabled={Boolean(opening)}
                      >
                        回数一覧
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => {
                          setAdding(false);
                          setEditingKey(editing ? "" : key);
                        }}
                        disabled={Boolean(opening)}
                      >
                        {editing ? "閉じる" : "修正"}
                      </button>
                    </div>
                  </div>
                  <PtaClientEditPanel
                    client={c}
                    open={editing}
                    onClose={() => setEditingKey("")}
                    onSaved={onClientSaved}
                  />
                </div>
              );
            })}
            {!ptClients.length ? (
              <div className="empty-diary">
                まだPT会員がいません。右上の「会員を追加」から氏名・会員番号・入会日を手打ちしてください。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
