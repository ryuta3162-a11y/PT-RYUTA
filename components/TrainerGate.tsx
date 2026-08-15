"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { verifyTrainer } from "@/lib/api";
import { clearStaffPin, loadStaffPin, saveStaffPin } from "@/lib/staffAuth";

type Props = {
  children: ReactNode;
};

export function TrainerGate({ children }: Props) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadStaffPin();
    if (!saved) {
      setReady(true);
      return;
    }
    void verifyTrainer(saved)
      .then((valid) => {
        if (valid) setOk(true);
        else clearStaffPin();
      })
      .catch(() => clearStaffPin())
      .finally(() => setReady(true));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const valid = await verifyTrainer(pin.trim());
      if (!valid) {
        setError("PINが違います");
        return;
      }
      saveStaffPin(pin.trim());
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <LoadingScreen label="Staff" />;
  }

  if (!ok) {
    return (
      <main className="shell plain">
        <div className="hero-gate">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden>
              WL
            </div>
            <h1 className="brand" style={{ fontSize: "1.8rem" }}>
              Staff
            </h1>
            <p className="lead">管理者専用です。一般会員は利用できません。</p>
          </div>
          <form className="gate-card" onSubmit={submit}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>PIN</span>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn primary" type="submit" disabled={busy || !pin.trim()}>
              {busy ? "確認中…" : "入る"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
