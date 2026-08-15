"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMenuByToken } from "@/lib/api";
import type { Menu } from "@/lib/types";

export default function SharedMenuPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    void params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setMenu(await getMenuByToken(token));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [token]);

  if (error) {
    return (
      <main className="shell plain">
        <div className="content">
          <p className="error">{error}</p>
          <Link href="/" className="text-link">
            トップへ
          </Link>
        </div>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="shell plain">
        <p className="content muted">メニューを読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="shell plain">
      <header className="app-header">
        <h1>{menu.title}</h1>
        <div className="sub">{menu.clientName || "お客様"} 向けメニュー</div>
      </header>
      <div className="content">
        {menu.notes ? <p className="muted">{menu.notes}</p> : null}
        <section className="section-card">
          {menu.items.map((item, idx) => (
            <div key={`${item.exercise}-${idx}`} className="diary-item">
              <div>
                <div className="title">
                  {idx + 1}. {item.exercise}
                </div>
                <div className="detail">
                  {item.weight ?? "-"} kg / {item.reps ?? "-"} 回 / {item.sets ?? "-"} セット
                  {item.note ? ` / ${item.note}` : ""}
                </div>
              </div>
            </div>
          ))}
        </section>
        <Link className="btn primary" href="/client">
          自トレ記録へ
        </Link>
      </div>
    </main>
  );
}
