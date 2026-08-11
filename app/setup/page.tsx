import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="stack" style={{ paddingTop: 28 }}>
      <div className="topbar">
        <h1>Setup</h1>
        <Link href="/" className="text-link">
          トップ
        </Link>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>全自動で作った構成</h2>
        <p className="muted">
          フロント: Next.js（Vercel想定） / データ: Google スプレッドシート /
          API: Google Apps Script
        </p>
        <ol className="muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>
          <li>
            スプレッドシート ID:
            <br />
            <code>1jBDb9MmwoACaEkTYEzo4mGchsDSiyTJT1q5P9TT1p08</code>
          </li>
          <li>
            Apps Script プロジェクトを clasp で作成済み
            <br />
            <code>gas/</code> フォルダを <code>clasp push</code>
          </li>
          <li>
            Apps Script で「デプロイ → 新しいデプロイ → ウェブアプリ」
            <br />
            アクセス: 全員 / 実行: 自分
          </li>
          <li>発行された URL をトップ画面の「データ接続」に貼る</li>
          <li>初回接続で Clients / Workouts / Menus / Exercises シートが自動生成</li>
        </ol>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>初期PIN</h2>
        <p className="muted">
          トレーナーPIN初期値は <strong>2468</strong> です。Config シートの
          trainerPin で変更できます。
        </p>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>使い方</h2>
        <p className="muted">
          トレーナーはセッション中に記録。お客さまは4桁コードで自トレ記録。
          メニューは共有リンクで閲覧できます。種目は自由入力＋経堂マシン候補つきです。
        </p>
      </div>
    </main>
  );
}
