import Link from "next/link";
import { ConnectionPanel } from "@/components/ConnectionPanel";

export default function HomePage() {
  return (
    <main className="hero">
      <div className="fade-up">
        <p className="eyebrow">Personal Training Log</p>
        <h1 className="brand">
          PT <span>RYUTA</span>
        </h1>
        <p className="lead">
          セッション中の記録も、お客さまの自トレ記録も、このままスマホで残せます。
          メニューは共有リンクでそのまま渡せます。
        </p>
      </div>

      <div className="cta-row fade-up-delay">
        <Link className="btn primary" href="/trainer">
          トレーナーで入る
        </Link>
        <Link className="btn secondary" href="/client">
          お客さまで入る
        </Link>
      </div>

      <ConnectionPanel />
    </main>
  );
}
