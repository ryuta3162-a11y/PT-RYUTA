const cacheKey = (clientId: string) => `ry-log-wo-cache:${clientId}`;

export function loadWorkoutCache<T>(clientId: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function saveWorkoutCache<T>(clientId: string, rows: T[]) {
  try {
    localStorage.setItem(cacheKey(clientId), JSON.stringify(rows.slice(0, 300)));
  } catch {
    /* quota */
  }
}

export function clearWorkoutCache(clientId?: string) {
  if (!clientId) return;
  localStorage.removeItem(cacheKey(clientId));
}
