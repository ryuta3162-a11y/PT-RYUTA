const KEY = "pt-ryuta-trainer-active-client";

export type ActiveTrainerClient = {
  id: string;
  name: string;
  code: string;
  /** 会員マスタのメモ（PT判定用） */
  notes?: string;
};

export function loadActiveTrainerClient(): ActiveTrainerClient | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTrainerClient;
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveTrainerClient(client: ActiveTrainerClient) {
  localStorage.setItem(KEY, JSON.stringify(client));
}

export function clearActiveTrainerClient() {
  localStorage.removeItem(KEY);
}
