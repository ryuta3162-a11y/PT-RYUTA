"use client";

import { useMemo, useState } from "react";
import {
  BODY_PARTS,
  EXERCISE_CATALOG,
  isLineIcon,
  machineImageSrc,
  type AreaGroup,
  type BodyPart,
  type CatalogItem,
} from "@/lib/exerciseCatalog";
import { findExerciseImage, getExerciseKind } from "@/lib/exercises";
import type { WorkoutDraft } from "@/lib/types";

const PART_META: Record<
  BodyPart,
  { mark: string; label: string }
> = {
  胸: { mark: "CH", label: "Chest" },
  背中: { mark: "BK", label: "Back" },
  腹: { mark: "AB", label: "Abs" },
  脚: { mark: "LG", label: "Legs" },
  腕: { mark: "AR", label: "Arms" },
  肩: { mark: "SH", label: "Shoulders" },
};

type Props = {
  draft: WorkoutDraft;
  onChange: (next: WorkoutDraft) => void;
  enabledGroups: AreaGroup[];
};

export function ExercisePicker({ draft, onChange, enabledGroups }: Props) {
  const [part, setPart] = useState<BodyPart | null>(null);
  const [open, setOpen] = useState(!draft.exercise);

  const filtered = useMemo(() => {
    return EXERCISE_CATALOG.filter((item) => {
      if (!enabledGroups.includes(item.group)) return false;
      if (part && item.bodyPart !== part) return false;
      return true;
    });
  }, [enabledGroups, part]);

  const grouped = useMemo(() => {
    if (part) {
      return [{ part, items: filtered }];
    }
    return BODY_PARTS.map((p) => ({
      part: p,
      items: filtered.filter((item) => item.bodyPart === p),
    })).filter((g) => g.items.length > 0);
  }, [filtered, part]);

  const kind = getExerciseKind(draft.exercise);
  const pickedImg = findExerciseImage(draft.exercise, "sm");
  const showMachineGrid = filtered.some((item) => item.imageId);

  function selectItem(item: CatalogItem) {
    onChange({ ...draft, exercise: item.name });
    setOpen(false);
  }

  function togglePart(p: BodyPart) {
    setPart((prev) => (prev === p ? null : p));
  }

  if (!enabledGroups.length) {
    return (
      <p className="error">先に CRF（C / R / F）を選んでください</p>
    );
  }

  if (draft.exercise && !open) {
    return (
      <div className="picked-bar">
        <div className="picked-main">
          {pickedImg ? (
            <span className="picked-thumb" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pickedImg} alt="" />
            </span>
          ) : null}
          <div>
            <p className="tiny muted" style={{ margin: 0 }}>
              Equipment
            </p>
            <p className="picked-name">
              {draft.exercise}
              <span className="picked-kind">
                {kind === "cardio" ? "min" : "kg×rep"}
              </span>
            </p>
          </div>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
          変更
        </button>
      </div>
    );
  }

  return (
    <div className="picker-panel">
      <div className="picker-parts">
        {BODY_PARTS.map((p) => {
          const meta = PART_META[p];
          const active = part === p;
          return (
            <button
              key={p}
              type="button"
              className={active ? "part-dot on" : "part-dot"}
              onClick={() => togglePart(p)}
              aria-pressed={active}
              title={meta.label}
            >
              <span className="part-dot-mark">{meta.mark}</span>
              <span className="part-dot-label">{meta.label}</span>
            </button>
          );
        })}
      </div>

      <div className={showMachineGrid ? "picker-list machine-mode" : "picker-list"}>
        {grouped.map((group) => (
          <div key={group.part} className="picker-group">
            {!part ? (
              <p className="picker-group-title">
                <span>{PART_META[group.part].mark}</span>
                {PART_META[group.part].label}
              </p>
            ) : null}

            <div className="machine-grid">
              {group.items.map((item) => {
                const src = machineImageSrc(item, "sm");
                const on = draft.exercise === item.name;
                const icon = isLineIcon(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      "machine-card",
                      on ? "on" : "",
                      icon ? "icon" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectItem(item)}
                  >
                    <span className="machine-card-media">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" loading="lazy" />
                      ) : null}
                    </span>
                    <span className="machine-card-name">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!filtered.length ? (
          <span className="muted tiny">該当する種目がありません</span>
        ) : null}
      </div>

      {draft.exercise ? (
        <button
          type="button"
          className="text-link tiny"
          onClick={() => setOpen(false)}
          style={{ border: 0, background: "transparent", cursor: "pointer" }}
        >
          閉じる
        </button>
      ) : null}
    </div>
  );
}
