"use client";

import { useMemo, useState } from "react";
import { getExerciseKind } from "@/lib/exercises";
import type { Exercise, WorkoutDraft } from "@/lib/types";

type Props = {
  value: WorkoutDraft;
  onChange: (next: WorkoutDraft) => void;
  exercises: Exercise[];
  onRemove?: () => void;
};

export function WorkoutRow({ value, onChange, exercises, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const kind = getExerciseKind(value.exercise);
  const suggestions = useMemo(() => {
    const q = value.exercise.trim().toLowerCase();
    if (!q) return exercises.slice(0, 8);
    return exercises
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [exercises, value.exercise]);

  return (
    <div className="workout-row">
      <div className="row-head">
        <label className="field grow">
          <span>種目（自由入力OK）</span>
          <input
            value={value.exercise}
            onChange={(e) => {
              onChange({ ...value, exercise: e.target.value });
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="例: レッグプレス / バイク"
            autoComplete="off"
          />
        </label>
        {onRemove ? (
          <button type="button" className="icon-btn" onClick={onRemove} aria-label="削除">
            ×
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <div className="suggest">
          {suggestions.map((s) => (
            <button
              key={`${s.category}-${s.name}`}
              type="button"
              onClick={() => {
                onChange({ ...value, exercise: s.name });
                setOpen(false);
              }}
            >
              <strong>{s.name}</strong>
              <span>{s.category}</span>
            </button>
          ))}
        </div>
      ) : null}

      {kind === "cardio" ? (
        <label className="field">
          <span>時間（分）</span>
          <input
            inputMode="numeric"
            value={value.minutes}
            onChange={(e) => onChange({ ...value, minutes: e.target.value })}
            placeholder="20"
          />
        </label>
      ) : (
        <div className="grid-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <label className="field">
            <span>重量kg</span>
            <input
              inputMode="decimal"
              value={value.weight}
              onChange={(e) => onChange({ ...value, weight: e.target.value })}
              placeholder="60"
            />
          </label>
          <label className="field">
            <span>回数</span>
            <input
              inputMode="numeric"
              value={value.reps}
              onChange={(e) => onChange({ ...value, reps: e.target.value })}
              placeholder="10"
            />
          </label>
        </div>
      )}
      <label className="field">
        <span>メモ</span>
        <input
          value={value.memo}
          onChange={(e) => onChange({ ...value, memo: e.target.value })}
          placeholder="フォーム・体調など"
        />
      </label>
    </div>
  );
}
