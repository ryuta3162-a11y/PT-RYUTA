const orderKey = (clientId: string, date: string) =>
  `ry-log-ex-order:${clientId}:${date}`;

export function loadExerciseOrder(clientId: string, date: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(orderKey(clientId, date));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveExerciseOrder(
  clientId: string,
  date: string,
  order: string[]
) {
  localStorage.setItem(orderKey(clientId, date), JSON.stringify(order));
}

/** 保存済み順を優先し、未知の種目は先頭に足す */
export function applyExerciseOrder<T extends { exercise: string }>(
  groups: T[],
  savedOrder: string[]
): T[] {
  if (!groups.length) return groups;
  const map = new Map(groups.map((g) => [g.exercise, g]));
  const used = new Set<string>();
  const next: T[] = [];

  for (const name of savedOrder) {
    const g = map.get(name);
    if (g) {
      next.push(g);
      used.add(name);
    }
  }
  // 新規種目は先頭（新しいもの優先）
  const unknowns = groups.filter((g) => !used.has(g.exercise));
  return [...unknowns, ...next];
}
