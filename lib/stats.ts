import {
  BODY_PARTS,
  EXERCISE_CATALOG,
  type BodyPart,
} from "@/lib/exerciseCatalog";
import { getExerciseKind } from "@/lib/exercises";
import type { Workout } from "@/lib/types";

export function totalLoadKg(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => {
    if (getExerciseKind(w.exercise) === "cardio") return sum;
    const weight = Number(w.weight) || 0;
    const reps = Number(w.reps) || 0;
    return sum + weight * reps;
  }, 0);
}

/** 有酸素の概算消費カロリー（体重未入力のため 8kcal/分の簡易見積） */
export function estimateCardioKcal(minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  return Math.round(minutes * 8);
}

export function cardioMinutes(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => {
    if (getExerciseKind(w.exercise) !== "cardio") return sum;
    return sum + (Number(w.minutes) || 0);
  }, 0);
}

export type PartStat = {
  part: string;
  sets: number;
  loadKg: number;
  minutes: number;
};

export function bodyPartStats(workouts: Workout[]): PartStat[] {
  const map = new Map<string, PartStat>();
  for (const part of BODY_PARTS) {
    map.set(part, { part, sets: 0, loadKg: 0, minutes: 0 });
  }

  for (const w of workouts) {
    const kind = getExerciseKind(w.exercise);
    if (kind === "cardio") {
      const key = "有酸素";
      if (!map.has(key)) map.set(key, { part: key, sets: 0, loadKg: 0, minutes: 0 });
      const row = map.get(key)!;
      row.sets += 1;
      row.minutes += Number(w.minutes) || 0;
      continue;
    }
    const item = EXERCISE_CATALOG.find((e) => e.name === w.exercise);
    const part: string = (item?.bodyPart as BodyPart) || "その他";
    if (!map.has(part)) map.set(part, { part, sets: 0, loadKg: 0, minutes: 0 });
    const row = map.get(part)!;
    row.sets += 1;
    row.loadKg += (Number(w.weight) || 0) * (Number(w.reps) || 0);
  }

  return [...map.values()].filter((r) => r.sets > 0 || r.loadKg > 0 || r.minutes > 0);
}
