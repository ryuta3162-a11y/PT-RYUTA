"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditExerciseSheet, type EditSetLine } from "@/components/EditExerciseSheet";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  findExerciseImage,
  getExerciseKind,
  groupWorkoutsByExercise,
  usesWeight,
} from "@/lib/exercises";
import { dropSetLabel, isDropSetMemo } from "@/lib/dropSet";
import {
  applyExerciseOrder,
  loadExerciseOrder,
  saveExerciseOrder,
} from "@/lib/workoutOrder";
import type { Workout } from "@/lib/types";

type Props = {
  workouts: Workout[];
  loading?: boolean;
  emptyText?: string;
  clientId?: string;
  date?: string;
  busy?: boolean;
  onSaveGroup?: (input: {
    exercise: string;
    existing: Workout[];
    lines: EditSetLine[];
  }) => Promise<void>;
  onDeleteGroup?: (items: Workout[]) => Promise<void>;
};

function displayMemo(memo?: string) {
  const raw = String(memo || "").trim();
  if (!raw || /^セット\d+$/.test(raw) || isDropSetMemo(raw)) return "";
  // 旧「種目メモ」結合形式の先頭だけ使う
  return raw.split(" / ")[0]?.trim() || "";
}

export function SessionLog({
  workouts,
  loading,
  emptyText = "まだ記録がありません",
  clientId,
  date,
  busy,
  onSaveGroup,
  onDeleteGroup,
}: Props) {
  const baseGroups = useMemo(
    () => groupWorkoutsByExercise(workouts),
    [workouts]
  );
  const [order, setOrder] = useState<string[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    if (!clientId || !date) {
      setOrder(baseGroups.map((g) => g.exercise));
      return;
    }
    const saved = loadExerciseOrder(clientId, date);
    const names = baseGroups.map((g) => g.exercise);
    if (!saved.length) {
      setOrder(names);
      return;
    }
    setOrder(
      applyExerciseOrder(
        names.map((exercise) => ({ exercise })),
        saved
      ).map((g) => g.exercise)
    );
  }, [baseGroups, clientId, date]);

  const groups = useMemo(() => {
    const map = new Map(baseGroups.map((g) => [g.exercise, g]));
    const ordered = order
      .map((name) => map.get(name))
      .filter(Boolean) as typeof baseGroups;
    for (const g of baseGroups) {
      if (!ordered.some((x) => x.exercise === g.exercise)) ordered.unshift(g);
    }
    return ordered;
  }, [baseGroups, order]);

  const editingGroup = editing
    ? groups.find((g) => g.exercise === editing) || null
    : null;

  function persist(next: string[]) {
    setOrder(next);
    if (clientId && date) saveExerciseOrder(clientId, date, next);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= groups.length || from === to) return;
    const names = groups.map((g) => g.exercise);
    const [item] = names.splice(from, 1);
    names.splice(to, 0, item);
    persist(names);
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function onOrdPointerDown() {
    longPressed.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setReorderMode(true);
    }, 350);
  }

  function onOrdPointerUp(exercise: string) {
    clearLongPress();
    if (longPressed.current || reorderMode) {
      longPressed.current = false;
      return;
    }
    setEditing(exercise);
  }

  if (loading) {
    return (
      <section className="log-board">
        <LoadingScreen label="記録を取得" full={false} />
      </section>
    );
  }

  if (!groups.length) {
    return (
      <section className="log-board">
        <div className="empty-diary">{emptyText}</div>
      </section>
    );
  }

  return (
    <section className="log-board">
      <div className="reorder-bar">
        <p className="muted tiny" style={{ margin: 0 }}>
          {reorderMode
            ? "↑↓で順番を変更"
            : "番号を長押しで並べ替え / 種目タップで編集"}
        </p>
        <button
          type="button"
          className="text-link tiny"
          onClick={() => setReorderMode((v) => !v)}
          style={{ border: 0, background: "transparent", cursor: "pointer" }}
        >
          {reorderMode ? "完了" : "並替"}
        </button>
      </div>

      {groups.map((g, gi) => {
        const kind = getExerciseKind(g.exercise);
        const thumb = findExerciseImage(g.exercise, "sm");

        return (
          <article key={g.exercise} className="ex-block compact">
            <header className="ex-block-head">
              <button
                type="button"
                className="ex-ord"
                aria-label="並べ替え"
                onPointerDown={onOrdPointerDown}
                onPointerUp={() => onOrdPointerUp(g.exercise)}
                onPointerCancel={clearLongPress}
              >
                {gi + 1}
              </button>
              {thumb ? (
                <button
                  type="button"
                  className="ex-thumb tap"
                  onClick={() => {
                    if (!reorderMode) setEditing(g.exercise);
                  }}
                  aria-label={`${g.exercise}を編集`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" />
                </button>
              ) : null}
              <button
                type="button"
                className="ex-block-title tap"
                onClick={() => {
                  if (!reorderMode) setEditing(g.exercise);
                }}
              >
                <h3>{g.exercise}</h3>
              </button>
              {reorderMode ? (
                <div className="ex-move">
                  <button
                    type="button"
                    className="ex-move-btn"
                    disabled={gi === 0}
                    onClick={() => move(gi, gi - 1)}
                    aria-label="上へ"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ex-move-btn"
                    disabled={gi === groups.length - 1}
                    onClick={() => move(gi, gi + 1)}
                    aria-label="下へ"
                  >
                    ↓
                  </button>
                </div>
              ) : (
                <span className="ex-block-meta">
                  {kind === "cardio"
                    ? `${g.items.reduce((a, w) => a + (w.minutes || 0), 0)}分`
                    : `${g.items.length}set`}
                </span>
              )}
            </header>
            <ul className="ex-set-list">
              {g.items.map((w, i) => {
                const setMemo = displayMemo(w.memo);
                const drop = isDropSetMemo(w.memo);
                const rounds = w.sets != null && Number(w.sets) > 0 ? Number(w.sets) : 1;
                return (
                  <li
                    key={w.id}
                    className="ex-set-row"
                    onClick={() => {
                      if (!reorderMode) setEditing(g.exercise);
                    }}
                  >
                    <span className="ex-set-no">
                      <strong>{i + 1}</strong>
                      <em>{drop ? "ドロップ" : "セット"}</em>
                    </span>
                    <div className="ex-set-body inline">
                      {kind === "cardio" ? (
                        <span className="ex-set-main">
                          {w.minutes ?? "-"} 分
                        </span>
                      ) : drop ? (
                        <span className="ex-set-main drop">
                          <strong>×{rounds}</strong>
                          <span className="unit"> {dropSetLabel(w.memo)}</span>
                        </span>
                      ) : usesWeight(g.exercise) ? (
                        <span className="ex-set-main">
                          <strong>{w.weight ?? "-"}</strong>
                          <span className="unit">kg</span>
                          <span className="times">×</span>
                          <strong>{w.reps ?? "-"}</strong>
                          <span className="unit">回</span>
                        </span>
                      ) : (
                        <span className="ex-set-main">
                          <strong>{w.reps ?? "-"}</strong>
                          <span className="unit">回</span>
                        </span>
                      )}
                      {setMemo ? (
                        <span className="ex-set-memo-inline">{setMemo}</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}

      {editingGroup && onSaveGroup && onDeleteGroup ? (
        <EditExerciseSheet
          exercise={editingGroup.exercise}
          items={editingGroup.items}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (lines) => {
            await onSaveGroup({
              exercise: editingGroup.exercise,
              existing: editingGroup.items,
              lines,
            });
            setEditing(null);
          }}
          onDeleteAll={async () => {
            await onDeleteGroup(editingGroup.items);
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}
