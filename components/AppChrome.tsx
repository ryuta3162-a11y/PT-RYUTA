"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const trainerItems = [
  { href: "/ops", label: "ホーム", icon: "⌂" },
  { href: "/ops/session", label: "記録", icon: "☰" },
  { href: "/ops/clients", label: "会員", icon: "◎" },
  { href: "/ops/menus", label: "メニュー", icon: "✦" },
];

export function TrainerNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {trainerItems.map((item) => {
        const active =
          item.href === "/ops"
            ? pathname === "/ops"
            : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            <span className="ico">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DateNav({
  date,
  onPrev,
  onNext,
  onToday,
  loadKg,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** その日の総負荷（kg）。0以下や未指定なら非表示 */
  loadKg?: number;
}) {
  const label = formatJa(date);
  const showLoad = typeof loadKg === "number" && loadKg > 0;
  return (
    <div className="date-nav">
      <div className="session-rail date-nav-row">
        <button type="button" className="date-arrow" onClick={onPrev} aria-label="前日">
          ‹
        </button>
        <div className="date-center">
          <button type="button" className="date-label" onClick={onToday}>
            {label}
          </button>
          {showLoad ? (
            <span className="date-load">
              総負荷 {Math.round(loadKg).toLocaleString()} kg
            </span>
          ) : null}
        </div>
        <button type="button" className="date-arrow" onClick={onNext} aria-label="翌日">
          ›
        </button>
      </div>
    </div>
  );
}

export function formatJa(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${week}）`;
}

export function shiftDate(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function todayTokyo() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}
