import type { AreaGroup } from "@/lib/exerciseCatalog";

export type GroupPrefs = Record<AreaGroup, boolean>;

export const DEFAULT_GROUP_PREFS: GroupPrefs = {
  cardio: true,
  machine: true,
  freeweight: true,
};

const STORAGE_KEY = "pt-ryuta-group-prefs";

export function loadGroupPrefs(): GroupPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_GROUP_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GROUP_PREFS };
    const parsed = JSON.parse(raw) as Partial<GroupPrefs>;
    return {
      cardio: Boolean(parsed.cardio),
      machine: Boolean(parsed.machine),
      freeweight: Boolean(parsed.freeweight),
    };
  } catch {
    return { ...DEFAULT_GROUP_PREFS };
  }
}

export function saveGroupPrefs(prefs: GroupPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function enabledGroups(prefs: GroupPrefs): AreaGroup[] {
  return (Object.keys(prefs) as AreaGroup[]).filter((k) => prefs[k]);
}

export function hasAnyGroup(prefs: GroupPrefs): boolean {
  return enabledGroups(prefs).length > 0;
}
