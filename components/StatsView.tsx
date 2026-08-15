"use client";

import { useMemo } from "react";
import {
  bodyPartStats,
  cardioMinutes,
  estimateCardioKcal,
  totalLoadKg,
} from "@/lib/stats";
import type { Workout } from "@/lib/types";

type Props = {
  workouts: Workout[];
  clientName: string;
  onBack: () => void;
};

export function StatsView({ workouts, clientName, onBack }: Props) {
  const parts = useMemo(() => bodyPartStats(workouts), [workouts]);
  const load = useMemo(() => totalLoadKg(workouts), [workouts]);
  const minutes = useMemo(() => cardioMinutes(workouts), [workouts]);
  const kcal = estimateCardioKcal(minutes);
  const maxLoad = Math.max(1, ...parts.map((p) => (p.part === "有酸素" ? p.minutes : p.loadKg)));

  return (
    <div className="stats-view">
      <header className="stats-head">
        <button type="button" className="btn secondary sm" onClick={onBack}>
          ← 戻る
        </button>
        <div>
          <p className="tiny muted" style={{ margin: 0 }}>
            集計データ
          </p>
          <h1 className="stats-title">{clientName}</h1>
        </div>
      </header>

      <section className="stats-hero">
        <div>
          <p className="tiny muted" style={{ margin: 0 }}>
            総負荷
          </p>
          <p className="stats-hero-num">
            {Math.round(load).toLocaleString()}
            <span> kg</span>
          </p>
        </div>
        <div>
          <p className="tiny muted" style={{ margin: 0 }}>
            有酸素
          </p>
          <p className="stats-hero-num">
            {minutes}
            <span> 分</span>
          </p>
          <p className="muted tiny" style={{ margin: "4px 0 0" }}>
            約 {kcal.toLocaleString()} kcal（概算）
          </p>
        </div>
      </section>

      <section className="stats-card">
        <h2>部位別</h2>
        {!parts.length ? (
          <p className="muted tiny">まだ集計できる記録がありません</p>
        ) : (
          <ul className="stats-bars">
            {parts.map((p) => {
              const value = p.part === "有酸素" ? p.minutes : p.loadKg;
              const pct = Math.round((value / maxLoad) * 100);
              return (
                <li key={p.part}>
                  <div className="stats-bar-label">
                    <strong>{p.part}</strong>
                    <span>
                      {p.part === "有酸素"
                        ? `${p.minutes}分 / 約${estimateCardioKcal(p.minutes)}kcal`
                        : `${p.sets}set / ${Math.round(p.loadKg).toLocaleString()}kg`}
                    </span>
                  </div>
                  <div className="stats-bar-track">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="muted tiny" style={{ margin: 0 }}>
        ※消費カロリーは体重未設定のため 8kcal/分の簡易計算です
      </p>
    </div>
  );
}
