"use client";

import { useEffect, useMemo, useState } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { GroupPrefToggle } from "@/components/GroupPrefToggle";
import { StepField } from "@/components/StepField";
import { findCatalogItem, findLatestSession, getExerciseKind } from "@/lib/exercises";
import type { AreaGroup } from "@/lib/exerciseCatalog";
import { emptyDraft, ping } from "@/lib/api";
import { hasAnyGroup, type GroupPrefs } from "@/lib/trainingPrefs";
import type { Workout, WorkoutDraft } from "@/lib/types";

export type SetLine = {
  weight: string;
  reps: string;
  memo: string;
};

type Props = {
  draft: WorkoutDraft;
  onChange: (next: WorkoutDraft) => void;
  prefs: GroupPrefs;
  onPrefsChange: (next: GroupPrefs) => void;
  enabledGroups: AreaGroup[];
  busy: boolean;
  error: string;
  onSubmit: (items: WorkoutDraft[]) => void;
  canSubmitExtra?: boolean;
  /** 複製元になる過去記録 */
  history?: Workout[];
};

function emptySet(prev?: SetLine): SetLine {
  return {
    weight: prev?.weight || "",
    reps: prev?.reps || "",
    memo: "",
  };
}

function linesFromWorkouts(
  items: Array<{
    weight: number | null;
    reps: number | null;
    memo?: string;
  }>
): SetLine[] {
  if (!items.length) return [emptySet()];
  return items.map((w) => ({
    weight: w.weight != null ? String(w.weight) : "",
    reps: w.reps != null ? String(w.reps) : "",
    memo: String(w.memo || "").replace(/^セット\d+$/, ""),
  }));
}

function formatCopyHint(date: string, count: number, kind: "cardio" | "strength") {
  const label = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.slice(5).replace("-", "/")
    : /^s\d+$/.test(date)
      ? `第${date.slice(1)}回`
      : date;
  if (kind === "cardio") return `${label} の内容`;
  return `${label} / ${count}セット`;
}

export function QuickLogPanel({
  draft,
  onChange,
  prefs,
  onPrefsChange,
  enabledGroups,
  busy,
  error,
  onSubmit,
  canSubmitExtra = true,
  history = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const kind = getExerciseKind(draft.exercise);
  const [setLines, setSetLines] = useState<SetLine[]>([emptySet()]);

  useEffect(() => {
    if (!open) return;
    void ping().catch(() => undefined);
  }, [open]);

  const latestForExercise = useMemo(
    () =>
      draft.exercise ? findLatestSession(history, draft.exercise) : null,
    [history, draft.exercise]
  );

  function ensureGroupOn(exercise: string) {
    const item = findCatalogItem(exercise);
    if (!item) return;
    if (!prefs[item.group]) {
      onPrefsChange({ ...prefs, [item.group]: true });
    }
  }

  function applySession(session: NonNullable<ReturnType<typeof findLatestSession>>) {
    ensureGroupOn(session.exercise);
    const k = getExerciseKind(session.exercise);
    if (k === "cardio") {
      const minutes =
        session.items.find((w) => w.minutes != null)?.minutes ?? null;
      onChange({
        ...emptyDraft(),
        exercise: session.exercise,
        minutes: minutes != null ? String(minutes) : "",
      });
      setSetLines([emptySet()]);
      return;
    }
    onChange({
      ...emptyDraft(),
      exercise: session.exercise,
    });
    setSetLines(linesFromWorkouts(session.items));
  }

  function updateSet(index: number, patch: Partial<SetLine>) {
    setSetLines((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addSet() {
    setSetLines((rows) => [...rows, emptySet(rows[rows.length - 1])]);
  }

  function removeSet(index: number) {
    setSetLines((rows) =>
      rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)
    );
  }

  const strengthReady =
    Boolean(draft.exercise) &&
    kind !== "cardio" &&
    setLines.length > 0 &&
    setLines.every((s) => s.weight && s.reps);

  const cardioReady =
    Boolean(draft.exercise) && kind === "cardio" && Boolean(draft.minutes);

  const canSubmit =
    canSubmitExtra &&
    hasAnyGroup(prefs) &&
    (kind === "cardio" ? cardioReady : strengthReady);

  function handleSubmit() {
    if (!canSubmit || !draft.exercise) return;

    if (kind === "cardio") {
      onSubmit([
        {
          ...draft,
          weight: "",
          reps: "",
          sets: "",
          memo: "",
        },
      ]);
      setOpen(false);
      return;
    }

    const items: WorkoutDraft[] = setLines.map((s) => ({
      ...draft,
      weight: s.weight,
      reps: s.reps,
      sets: "",
      minutes: "",
      memo: s.memo.trim(),
    }));
    onSubmit(items);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-fab-btn"
        onClick={() => setOpen(true)}
      >
        追加
      </button>
    );
  }

  return (
    <section className="compose-card">
      <div className="compose-head">
        <h2>追加</h2>
        <button
          type="button"
          className="text-link tiny"
          onClick={() => setOpen(false)}
          style={{ border: 0, background: "transparent", cursor: "pointer" }}
        >
          閉じる
        </button>
      </div>

      <GroupPrefToggle value={prefs} onChange={onPrefsChange} compact />

      {!hasAnyGroup(prefs) ? (
        <p className="notice">C / R / F を1つ以上選んでください</p>
      ) : (
        <>
          <ExercisePicker
            draft={draft}
            onChange={(next) => {
              onChange(next);
              if (next.exercise !== draft.exercise) {
                setSetLines([emptySet()]);
              }
            }}
            enabledGroups={enabledGroups}
          />

          {draft.exercise &&
          latestForExercise &&
          latestForExercise.exercise === draft.exercise ? (
            <button
              type="button"
              className="copy-last-btn subtle"
              disabled={busy}
              onClick={() => applySession(latestForExercise)}
            >
              <span className="copy-last-main">前回をコピー</span>
              <span className="copy-last-sub">
                {formatCopyHint(
                  latestForExercise.date,
                  latestForExercise.items.length,
                  kind
                )}
              </span>
            </button>
          ) : null}

          {draft.exercise && kind === "cardio" ? (
            <div className="set-card">
              <StepField
                label="時間"
                unit="分"
                step={1}
                startAt={10}
                min={1}
                value={draft.minutes}
                onChange={(minutes) => onChange({ ...draft, minutes })}
                disabled={busy}
              />
            </div>
          ) : null}

          {draft.exercise && kind !== "cardio" ? (
            <div className="set-stack">
              {setLines.map((line, index) => (
                <div key={index} className="set-card">
                  <div className="set-card-head">
                    <span className="set-card-title">
                      SET <strong>{index + 1}</strong>
                    </span>
                    <button
                      type="button"
                      className="set-remove"
                      aria-label="セット削除"
                      disabled={setLines.length <= 1 || busy}
                      onClick={() => removeSet(index)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="set-card-controls">
                    <StepField
                      label="重量"
                      unit="kg"
                      step={5}
                      startAt={20}
                      min={0}
                      value={line.weight}
                      onChange={(weight) => updateSet(index, { weight })}
                      disabled={busy}
                    />
                    <StepField
                      label="回数"
                      unit="回"
                      step={1}
                      startAt={10}
                      min={1}
                      value={line.reps}
                      onChange={(reps) => updateSet(index, { reps })}
                      disabled={busy}
                    />
                  </div>
                  <input
                    className="set-input memo wide"
                    value={line.memo}
                    onChange={(e) =>
                      updateSet(index, { memo: e.target.value })
                    }
                    placeholder="メモ（任意）"
                    aria-label="メモ"
                    disabled={busy}
                  />
                </div>
              ))}

              <button
                type="button"
                className="set-add"
                onClick={addSet}
                aria-label="セット追加"
                disabled={busy}
              >
                ＋ セット追加
              </button>
            </div>
          ) : null}
        </>
      )}

      {error ? <p className="error">{error}</p> : null}

      <button
        className="btn primary"
        type="button"
        disabled={busy || !canSubmit}
        onClick={handleSubmit}
      >
        {busy
          ? "保存中…"
          : kind !== "cardio" && setLines.length > 1
            ? `${setLines.length}セットを記録`
            : "記録する"}
      </button>
    </section>
  );
}
