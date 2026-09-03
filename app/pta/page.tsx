"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  return raw || "—";
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

  async function openClient(c: Client) {
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
      await openClient(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
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
              setError("");
            }}
          >
            {adding ? "閉じる" : "＋ 追加"}
          </button>
        }
      />

      <div className="content session-rail pta-page">
        {error ? <p className="error">{error}</p> : null}

        {adding ? (
          <form className="section-card pta-add-form" onSubmit={addClient}>
            <div className="section-head">
              <h2>PT会員を追加</h2>
              <span className="meta">手打ち</span>
            </div>
            <div className="pta-add-fields">
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
                className="btn primary"
                disabled={saving}
              >
                {saving ? "追加中…" : "追加してセッションを開く"}
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
              placeholder="名前・会員番号"
              enterKeyHint="search"
            />
          </label>
        </div>

        <section className="section-card">
          <div className="list-plain">
            {ptClients.map((c) => {
              const key = clientRouteKey(c);
              if (!key) return null;
              const busy = opening === key;
              return (
                <button
                  key={key}
                  type="button"
                  className="row pta-list-row"
                  onClick={() => void openClient(c)}
                  disabled={Boolean(opening)}
                >
                  <span className="pta-list-main">
                    <strong>{c.name}</strong>
                    <span className="pta-list-meta muted tiny">
                      {busy ? (
                        "開いています…"
                      ) : (
                        <>
                          <span>会員番号 {c.code}</span>
                          <span>入会 {formatEnrolled(c)}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="pta-list-go" aria-hidden>
                    ›
                  </span>
                </button>
              );
            })}
            {!ptClients.length ? (
              <div className="empty-diary">
                まだPT会員がいません。右上の「追加」から氏名・会員番号・入会日を手打ちしてください。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
