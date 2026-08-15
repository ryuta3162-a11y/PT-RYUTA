import {
  EXERCISE_CATALOG,
  machineImageSrc,
  type CatalogItem,
} from "@/lib/exerciseCatalog";

export type ExerciseKind = "cardio" | "strength";

export const EXERCISE_SUGGESTIONS: {
  name: string;
  category: string;
  kind: ExerciseKind;
  bodyPart: string;
}[] = EXERCISE_CATALOG.map((item) => ({
  name: item.name,
  category:
    item.group === "cardio"
      ? "Cardio"
      : item.group === "machine"
        ? "Resistance"
        : "Free Weight",
  kind: item.record === "minutes" ? "cardio" : "strength",
  bodyPart: item.bodyPart,
}));

const CARDIO_ALIASES = new Set(
  ["トレッドミル", "クロストレーナー", "バイク", "サイクル", "エアロバイク"].map((s) =>
    s.toLowerCase()
  )
);

export function getExerciseKind(name: string): ExerciseKind {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return "strength";
  if (CARDIO_ALIASES.has(n)) return "cardio";
  if (n.includes("バイク") || n.includes("トレッド") || n.includes("クロストレ")) {
    return "cardio";
  }
  const hit = EXERCISE_CATALOG.find((e) => e.name.toLowerCase() === n);
  return hit?.record === "minutes" ? "cardio" : "strength";
}

export function formatWorkoutDetail(w: {
  exercise: string;
  minutes?: number | null;
  weight?: number | null;
  reps?: number | null;
  sets?: number | null;
  rpe?: number | null;
  memo?: string;
}): string {
  const kind = getExerciseKind(w.exercise);
  if (kind === "cardio") {
    const parts = [`${w.minutes ?? "-"} 分`];
    if (w.memo && !/^セット\d+$/.test(w.memo)) parts.push(w.memo);
    return parts.join(" · ");
  }
  const parts = [`${w.weight ?? "-"} kg × ${w.reps ?? "-"}`];
  if (w.sets != null && Number(w.sets) > 0) parts[0] += ` × ${w.sets}set`;
  if (w.rpe != null && Number(w.rpe) > 0) parts.push(`RPE ${w.rpe}`);
  if (w.memo && !/^セット\d+$/.test(w.memo)) parts.push(w.memo);
  return parts.join(" · ");
}

export function findCatalogItem(name: string): CatalogItem | undefined {
  return EXERCISE_CATALOG.find((i) => i.name === name);
}

export function findExerciseImage(
  name: string,
  size: "sm" | "md" = "sm"
): string | null {
  return machineImageSrc(findCatalogItem(name), size);
}

export type WorkoutGroup<T extends { exercise: string; timestamp?: string; memo?: string }> = {
  exercise: string;
  items: T[];
};

function setOrder(w: { memo?: string; timestamp?: string }, index: number): number {
  const m = String(w.memo || "").match(/^セット(\d+)$/);
  if (m) return Number(m[1]);
  if (w.timestamp) return new Date(w.timestamp).getTime();
  return index;
}

/** 同じ種目のセットを1グループにまとめる（出現順） */
export function groupWorkoutsByExercise<
  T extends { exercise: string; timestamp?: string; memo?: string },
>(workouts: T[]): WorkoutGroup<T>[] {
  const map = new Map<string, T[]>();
  const order: string[] = [];
  for (const w of workouts) {
    const key = w.exercise;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(w);
  }
  return order
    .map((exercise) => {
      const items = [...(map.get(exercise) || [])].sort(
        (a, b) => setOrder(a, 0) - setOrder(b, 0)
      );
      return { exercise, items };
    })
    .sort((a, b) => {
      const ta = Math.max(
        ...a.items.map((w) => new Date(String(w.timestamp || 0)).getTime() || 0)
      );
      const tb = Math.max(
        ...b.items.map((w) => new Date(String(w.timestamp || 0)).getTime() || 0)
      );
      return tb - ta;
    });
}

/** 直近に記録した種目の1セッション分（同じ date のセット群） */
export function findLatestSession(
  workouts: Array<{
    exercise: string;
    date: string;
    timestamp: string;
    weight: number | null;
    reps: number | null;
    minutes: number | null;
    memo?: string;
  }>,
  exercise?: string
) {
  const sorted = [...workouts].sort((a, b) =>
    String(b.timestamp).localeCompare(String(a.timestamp))
  );
  const latest = exercise
    ? sorted.find((w) => w.exercise === exercise)
    : sorted[0];
  if (!latest) return null;

  const items = sorted
    .filter((w) => w.exercise === latest.exercise && w.date === latest.date)
    .sort((a, b) => setOrder(a, 0) - setOrder(b, 0));

  return {
    exercise: latest.exercise,
    date: latest.date,
    items,
  };
}
