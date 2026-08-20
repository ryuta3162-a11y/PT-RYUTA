"use client";

import { useEffect, useMemo, useState } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { GroupPrefToggle } from "@/components/GroupPrefToggle";
import { StepField } from "@/components/StepField";
import { findCatalogItem, findLatestSession, getExerciseKind, usesWeight } from "@/lib/exercises";
import { encodeDropSet, isDropSetMemo, parseDropSet } from "@/lib/dropSet";
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
  startOpen?: boolean;
  stayOpen?: boolean;
  /** 会員アプリ向け（カーディオ非表示・画像なし・見た目刷新） */
  variant?: "default" | "member";
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
  startOpen = false,
  stayOpen = false,
  variant = "default",
}: Props) {
  const member = variant === "member";
  const [open, setOpen] = useState(startOpen);
  const kind = getExerciseKind(draft.exercise);
  const withWeight = usesWeight(draft.exercise);
  const [setLines, setSetLines] = useState<SetLine[]>([emptySet()]);
  const [dropMode, setDropMode] = useState(false);
  const [dropRounds, setDropRounds] = useState("1");

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
    const dropItem = session.items.find((w) => isDropSetMemo(w.memo));
    if (dropItem) {
      const parsed = parseDropSet(dropItem.memo);
      setSetLines(parsed.length ? parsed.map((s) => ({ ...s, memo: "" })) : linesFromWorkouts(session.items));
      setDropMode(true);
      setDropRounds(dropItem.sets != null ? String(dropItem.sets) : "1");
      return;
    }
    setDropMode(false);
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

  const lineReady = (s: SetLine) =>
    Boolean(s.reps) && (withWeight ? Boolean(s.weight) : true);

  const strengthReady =
    Boolean(draft.exercise) &&
    kind !== "cardio" &&
    setLines.length > 0 &&
    setLines.every(lineReady) &&
    (!dropMode || Boolean(dropRounds));

  const cardioReady =
    Boolean(draft.exercise) && kind === "cardio" && Boolean(draft.minutes);

  const canSubmit =
    canSubmitExtra &&
    hasAnyGroup(member ? { ...prefs, cardio: false } : prefs) &&
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
      if (!stayOpen) setOpen(false);
      return;
    }

    if (dropMode) {
      onSubmit([
        {
          ...draft,
          weight: withWeight ? setLines[0].weight : "",
          reps: setLines[0].reps,
          sets: dropRounds || "1",
          minutes: "",
          memo: encodeDropSet(setLines, withWeight),
        },
      ]);
    } else {
      const items: WorkoutDraft[] = setLines.map((s) => ({
        ...draft,
        weight: withWeight ? s.weight : "",
        reps: s.reps,
        sets: "",
        minutes: "",
        memo: s.memo.trim(),
      }));
      onSubmit(items);
    }
    if (!stayOpen) setOpen(false);
    setDropMode(false);
    setDropRounds("1");
    setSetLines([emptySet()]);
  }

  if (!open) {
    return (
      <button
        type="button"
        className={member ? "add-fab-btn member-fab" : "add-fab-btn"}
        onClick={() => setOpen(true)}
      >
        ＋ 種目を追加
      </button>
    );
  }

  return (
    <section className={member ? "compose-card compose-member" : "compose-card"}>
      <div className="compose-head">
        <div>
          {member ? <p className="compose-kicker">Log set</p> : null}
          <h2>{member ? "記録する" : "追加"}</h2>
        </div>
        <button
          type="button"
          className="text-link tiny"
          onClick={() => setOpen(false)}
          style={{ border: 0, background: "transparent", cursor: "pointer" }}
        >
          閉じる
        </button>
      </div>

      <GroupPrefToggle
        value={prefs}
        onChange={onPrefsChange}
        compact
        hideGroups={member ? ["cardio"] : []}
      />

      {hasAnyGroup(member ? { ...prefs, cardio: false } : prefs) ? (
        <>
          <ExercisePicker
            draft={draft}
            onChange={(next) => {
              onChange(next);
              if (next.exercise !== draft.exercise) {
                setSetLines([emptySet()]);
                setDropMode(false);
                setDropRounds("1");
              }
            }}
            enabledGroups={enabledGroups}
            showImages={!member}
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
              {dropMode ? (
                <div className="drop-banner">
                  <strong>ドロップセット</strong>
                  <span>
                    下の段階を1セットにまとめ、何回繰り返したかを入力
                  </span>
                </div>
              ) : null}
              {setLines.map((line, index) => (
                <div key={index} className="set-card">
                  <div className="set-card-head">
                    <span className="set-card-title">
                      {dropMode ? "段階" : "SET"} <strong>{index + 1}</strong>
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
                    {withWeight ? (
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
                    ) : null}
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
                  {dropMode ? null : (
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
                  )}
                </div>
              ))}

              <button
                type="button"
                className="set-add"
                onClick={addSet}
                aria-label="セット追加"
                disabled={busy}
              >
                {dropMode ? "＋ 段階を追加" : "＋ セット追加"}
              </button>

              {dropMode ? (
                <div className="drop-rounds">
                  <StepField
                    label="リピート"
                    unit="セット"
                    step={1}
                    startAt={1}
                    min={1}
                    value={dropRounds}
                    onChange={setDropRounds}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="text-link tiny"
                    onClick={() => {
                      setDropMode(false);
                      setDropRounds("1");
                    }}
                    style={{ border: 0, background: "transparent" }}
                  >
                    通常セットに戻す
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="drop-toggle"
                  disabled={busy}
                  onClick={() => {
                    setDropMode(true);
                    setSetLines((rows) =>
                      rows.length >= 2 ? rows : [...rows, emptySet(rows[0])]
                    );
                  }}
                >
                  ドロップセットにする
                </button>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <button
        className={member ? "btn primary compose-submit" : "btn primary"}
        type="button"
        disabled={busy || !canSubmit}
        onClick={handleSubmit}
      >
        {busy
          ? "保存中…"
          : dropMode
            ? `ドロップ ×${dropRounds || 1} を記録`
            : kind !== "cardio" && setLines.length > 1
            ? `${setLines.length}セットを記録`
            : "記録する"}
      </button>
    </section>
  );
}
