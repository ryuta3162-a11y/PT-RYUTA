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
      <main className="stack" style={{ paddingTop: 40 }}>
        <p className="error">{error}</p>
        <Link href="/" className="text-link">
          トップへ
        </Link>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="stack" style={{ paddingTop: 40 }}>
        <p className="muted">メニューを読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="stack" style={{ paddingTop: 28 }}>
      <p className="eyebrow">Shared Menu</p>
      <h1 className="brand" style={{ fontSize: "clamp(2rem, 8vw, 3.4rem)" }}>
        PT <span>RYUTA</span>
      </h1>
      <div className="card stack">
        <p className="pill">{menu.clientName || "お客様"} 向け</p>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>{menu.title}</h2>
        {menu.notes ? <p className="muted">{menu.notes}</p> : null}
        <div className="menu-board">
          {menu.items.map((item, idx) => (
            <article key={`${item.exercise}-${idx}`}>
              <p className="muted tiny">0{idx + 1}</p>
              <h3 style={{ margin: "4px 0" }}>{item.exercise}</h3>
              <p className="muted">
                {item.weight ?? "-"}kg / {item.reps ?? "-"}回 / {item.sets ?? "-"}セット
              </p>
              {item.note ? <p className="tiny">{item.note}</p> : null}
            </article>
          ))}
        </div>
      </div>
      <Link href="/client" className="btn secondary">
        自トレ記録へ
      </Link>
    </main>
  );
}
