"use client";

import { FormEvent, useEffect, useState } from "react";
import { upsertPtClient } from "@/lib/api";
import { normalizeMemberNo } from "@/lib/member";
import type { Client } from "@/lib/types";

type Props = {
  client: Client;
  open: boolean;
  onClose: () => void;
  onSaved: (next: Client) => void;
};

function enrolledValue(c: Client) {
  const raw = String(c.enrolledAt || c.createdAt || "").trim();
  const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] || "";
}

export function PtaClientEditPanel({ client, open, onClose, onSaved }: Props) {
  const [name, setName] = useState(client.name);
  const [code, setCode] = useState(normalizeMemberNo(client.code));
  const [enrolledAt, setEnrolledAt] = useState(enrolledValue(client));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(client.name);
    setCode(normalizeMemberNo(client.code));
    setEnrolledAt(enrolledValue(client));
    setError("");
  }, [open, client]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = await upsertPtClient({
        id: client.id || undefined,
        name: name.trim(),
        code: normalizeMemberNo(code),
        enrolledAt,
      });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="section-card pta-add-form pta-edit-panel" onSubmit={submit}>
      <div className="section-head">
        <h2>会員情報を修正</h2>
        <span className="meta">手打ち</span>
      </div>
      <div className="pta-add-fields">
        {error ? <p className="error">{error}</p> : null}
        <label className="field">
          <span>氏名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
        <label className="field">
          <span>会員番号（10桁）</span>
          <input
            value={code}
            onChange={(e) => setCode(normalizeMemberNo(e.target.value))}
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
        <div className="pta-edit-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={saving}
          >
            キャンセル
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>
    </form>
  );
}
