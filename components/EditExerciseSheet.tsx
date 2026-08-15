"use client";

import { useEffect, useState } from "react";
import { StepField } from "@/components/StepField";
import { findExerciseImage, getExerciseKind } from "@/lib/exercises";
import type { Workout } from "@/lib/types";

export type EditSetLine = {
  id?: string;
  weight: string;
  reps: string;
  minutes: string;
  memo: string;
};

type Props = {
  exercise: string;
  items: Workout[];
  busy?: boolean;
  onClose: () => void;
  onSave: (lines: EditSetLine[]) => Promise<void>;
  onDeleteAll: () => Promise<void>;
};

function toLines(items: Workout[]): EditSetLine[] {
  if (!items.length) {
    return [{ weight: "", reps: "", minutes: "", memo: "" }];
  }
  return items.map((w) => ({
    id: w.id,
    weight: w.weight != null ? String(w.weight) : "",
    reps: w.reps != null ? String(w.reps) : "",
    minutes: w.minutes != null ? String(w.minutes) : "",
    memo: String(w.memo || "").replace(/^セット\d+$/, ""),
  }));
}

export function EditExerciseSheet({
  exercise,
  items,
  busy,
  onClose,
  onSave,
  onDeleteAll,
}: Props) {
  const kind = getExerciseKind(exercise);
  const thumb = findExerciseImage(exercise, "sm");
  const [lines, setLines] = useState<EditSetLine[]>(() => toLines(items));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLines(toLines(items));
  }, [items]);

  function update(i: number, patch: Partial<EditSetLine>) {
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addLine() {
    setLines((rows) => [
      ...rows,
      {
        weight: rows[rows.length - 1]?.weight || "",
        reps: rows[rows.length - 1]?.reps || "",
        minutes: rows[rows.length - 1]?.minutes || "",
        memo: "",
      },
    ]);
  }

  async function save() {
    setError("");
    if (kind === "cardio") {
      if (!lines.every((l) => l.minutes)) {
        setError("分数を入力してください");
        return;
      }
    } else if (!lines.every((l) => l.weight && l.reps)) {
      setError("重量と回数を入力してください");
      return;
    }
    setSaving(true);
    try {
      await onSave(
        lines.map((l) => ({
          ...l,
          memo: l.memo.trim(),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const locked = busy || saving;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet edit-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${exercise}を編集`}
      >
        <div className="compose-head">
          <div className="compose-title-row">
            {thumb ? (
              <span className="compose-thumb" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" />
              </span>
            ) : null}
            <h2>{exercise}</h2>
          </div>
          <button
            type="button"
            className="text-link tiny"
            onClick={onClose}
            style={{ border: 0, background: "transparent", cursor: "pointer" }}
          >
            閉じる
          </button>
        </div>

        <div className="set-stack">
          {lines.map((line, index) => (
            <div key={line.id || `new-${index}`} className="set-card">
              <div className="set-card-head">
                <span className="set-card-title">
                  SET <strong>{index + 1}</strong>
                </span>
                <button
                  type="button"
                  className="set-remove"
                  disabled={lines.length <= 1 || locked}
                  onClick={() =>
                    setLines((rows) =>
                      rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)
                    )
                  }
                >
                  ×
                </button>
              </div>
              {kind === "cardio" ? (
                <StepField
                  label="時間"
                  unit="分"
                  step={1}
                  startAt={10}
                  min={1}
                  value={line.minutes}
                  onChange={(minutes) => update(index, { minutes })}
                  disabled={locked}
                />
              ) : (
                <div className="set-card-controls">
                  <StepField
                    label="重量"
                    unit="kg"
                    step={5}
                    startAt={20}
                    min={0}
                    value={line.weight}
                    onChange={(weight) => update(index, { weight })}
                    disabled={locked}
                  />
                  <StepField
                    label="回数"
                    unit="回"
                    step={1}
                    startAt={10}
                    min={1}
                    value={line.reps}
                    onChange={(reps) => update(index, { reps })}
                    disabled={locked}
                  />
                </div>
              )}
              <input
                className="set-input memo wide"
                value={line.memo}
                onChange={(e) => update(index, { memo: e.target.value })}
                placeholder="メモ（任意）"
                disabled={locked}
              />
            </div>
          ))}
          <button
            type="button"
            className="set-add"
            onClick={addLine}
            disabled={locked}
          >
            ＋ セット追加
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="row-actions">
          <button
            type="button"
            className="btn secondary"
            disabled={locked}
            onClick={() => void onDeleteAll()}
          >
            種目を削除
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={locked}
            onClick={() => void save()}
          >
            {locked ? "保存中…" : "変更を保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
