"use client";

type Props = {
  label?: string;
  sub?: string;
  /** true: 画面全体を覆うオーバーレイ（保存・同期用） */
  overlay?: boolean;
  /** true: ページ全体のローディングシェル */
  full?: boolean;
};

export function LoadingScreen({
  label = "Loading",
  sub,
  overlay = false,
  full = true,
}: Props) {
  const body = (
    <div className="loader" role="status" aria-live="polite" aria-busy="true">
      <div className="loader-mark">
        <span>RY</span>
        <i className="loader-ring" />
      </div>
      <p className="loader-label">{label}</p>
      {sub ? <p className="loader-sub">{sub}</p> : null}
      <div className="loader-bar" aria-hidden>
        <i />
      </div>
    </div>
  );

  if (overlay) {
    return <div className="loader-overlay">{body}</div>;
  }

  if (!full) return body;
  return <main className="shell plain loader-shell">{body}</main>;
}
