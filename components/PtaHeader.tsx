import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  backHref?: string;
  backLabel?: string;
  kicker: string;
  title: string;
  action?: ReactNode;
};

export function PtaHeader({
  backHref,
  backLabel = "戻る",
  kicker,
  title,
  action,
}: Props) {
  return (
    <header className="pta-hero">
      <div className="session-rail pta-hero-inner">
        {backHref ? (
          <Link href={backHref} className="pta-hero-back" aria-label={backLabel}>
            ←
          </Link>
        ) : (
          <div className="brand-mark sm pta" aria-hidden>
            PT
          </div>
        )}
        <div className="pta-hero-text">
          <p className="pta-kicker">{kicker}</p>
          <h1>{title}</h1>
        </div>
        {action ? <div className="pta-hero-action">{action}</div> : null}
      </div>
    </header>
  );
}
