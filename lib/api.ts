import { EXERCISE_SUGGESTIONS } from "@/lib/exercises";
import type {
  Client,
  Exercise,
  Menu,
  MenuItem,
  Workout,
  WorkoutDraft,
  WorkoutMode,
} from "@/lib/types";

type ApiResponse<T> = T & { ok?: boolean; error?: string };

const STORAGE_KEY = "pt-ryuta-local-v1";

type LocalDb = {
  clients: Client[];
  workouts: Workout[];
  menus: Menu[];
  exercises: Exercise[];
  trainerPin: string;
};

function today(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function emptyDb(): LocalDb {
  return {
    clients: [],
    workouts: [],
    menus: [],
    exercises: EXERCISE_SUGGESTIONS.map((e) => ({ ...e })),
    trainerPin: "2468",
  };
}

function readDb(): LocalDb {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = emptyDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }
    return { ...emptyDb(), ...JSON.parse(raw) } as LocalDb;
  } catch {
    return emptyDb();
  }
}

function writeDb(db: LocalDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export const SUGGESTED_GAS_URL =
  "https://script.google.com/macros/s/AKfycbwRjyl8tCXDHyqRRLSvyLTQtZZJ5b8Gv6wZlWGmugqYwh_AZ6n7p-b2wbj_6IjfTxrX/exec";

function gasUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_GAS_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pt-ryuta-gas-url");
    if (saved && saved.trim()) return saved.trim();
    // 承認済みの本番GASをデフォルト利用（未設定時）
    return SUGGESTED_GAS_URL;
  }
  return SUGGESTED_GAS_URL;
}

export function setGasUrl(url: string) {
  localStorage.setItem("pt-ryuta-gas-url", url.trim());
}

export function getGasUrl(): string | null {
  return gasUrl();
}

export function isRemoteMode(): boolean {
  return Boolean(gasUrl());
}

async function callGas<T>(payload: Record<string, unknown>): Promise<ApiResponse<T>> {
  const url = gasUrl();
  if (!url) throw new Error("GAS URL not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`GAS HTTP ${res.status}`);
  }
  const data = (await res.json()) as ApiResponse<T>;
  if (data.ok === false) {
    throw new Error(data.error || "GAS error");
  }
  return data;
}

export async function ping(): Promise<{ mode: "remote" | "local"; message: string }> {
  const url = gasUrl();
  if (!url) {
    return { mode: "local", message: "ローカル保存モード（スプレッドシート未接続）" };
  }
  const data = await callGas<{ app?: string; time?: string }>({ action: "ping" });
  return {
    mode: "remote",
    message: `接続OK / ${data.app || "PT-RYUTA"} / ${data.time || ""}`,
  };
}

export async function setupRemote(): Promise<void> {
  await callGas({ action: "setup" });
}

export async function verifyTrainer(pin: string): Promise<boolean> {
  if (!gasUrl()) {
    return pin === readDb().trainerPin;
  }
  const data = await callGas<{ valid: boolean }>({ action: "verifyTrainer", pin });
  return Boolean(data.valid);
}

export async function verifyClient(code: string): Promise<Client | null> {
  if (!gasUrl()) {
    return readDb().clients.find((c) => c.code === code && c.active) || null;
  }
  const data = await callGas<{ client: Client | null }>({ action: "verifyClient", code });
  return data.client || null;
}

export async function listClients(): Promise<Client[]> {
  if (!gasUrl()) return readDb().clients.filter((c) => c.active);
  const data = await callGas<{ clients: Client[] }>({ action: "listClients" });
  return data.clients || [];
}

export async function upsertClient(input: {
  id?: string;
  name: string;
  code?: string;
  goal?: string;
  notes?: string;
}): Promise<Client> {
  if (!gasUrl()) {
    const db = readDb();
    if (input.id) {
      const idx = db.clients.findIndex((c) => c.id === input.id);
      if (idx < 0) throw new Error("client not found");
      db.clients[idx] = {
        ...db.clients[idx],
        name: input.name,
        code: input.code || db.clients[idx].code,
        goal: input.goal ?? db.clients[idx].goal,
        notes: input.notes ?? db.clients[idx].notes,
      };
      writeDb(db);
      return db.clients[idx];
    }
    const client: Client = {
      id: uid("cli"),
      name: input.name,
      code: input.code || String(Math.floor(Math.random() * 9000) + 1000),
      goal: input.goal || "",
      notes: input.notes || "",
      createdAt: new Date().toISOString(),
      active: true,
    };
    db.clients.push(client);
    writeDb(db);
    return client;
  }
  const data = await callGas<{ client: Client }>({ action: "upsertClient", ...input });
  return data.client;
}

export async function listWorkouts(opts?: {
  clientId?: string;
  mode?: WorkoutMode;
  limit?: number;
}): Promise<Workout[]> {
  if (!gasUrl()) {
    let rows = [...readDb().workouts].reverse();
    if (opts?.clientId) rows = rows.filter((w) => w.clientId === opts.clientId);
    if (opts?.mode) rows = rows.filter((w) => w.mode === opts.mode);
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return rows;
  }
  const data = await callGas<{ workouts: Workout[] }>({
    action: "listWorkouts",
    ...opts,
  });
  return data.workouts || [];
}

export async function addWorkouts(input: {
  clientId: string;
  clientName: string;
  mode: WorkoutMode;
  actor: string;
  date?: string;
  items: WorkoutDraft[];
}): Promise<Workout[]> {
  const payloadItems = input.items
    .filter((i) => i.exercise.trim())
    .map((i) => ({
      exercise: i.exercise.trim(),
      weight: i.weight === "" ? null : Number(i.weight),
      reps: i.reps === "" ? null : Number(i.reps),
      sets: i.sets === "" ? null : Number(i.sets),
      rpe: i.rpe === "" ? null : Number(i.rpe),
      memo: i.memo || "",
    }));

  if (!payloadItems.length) throw new Error("種目を1つ以上入力してください");

  if (!gasUrl()) {
    const db = readDb();
    const created: Workout[] = payloadItems.map((item) => ({
      id: uid("wo"),
      timestamp: new Date().toISOString(),
      date: input.date || today(),
      clientId: input.clientId,
      clientName: input.clientName,
      mode: input.mode,
      exercise: item.exercise,
      weight: item.weight,
      reps: item.reps,
      sets: item.sets,
      rpe: item.rpe,
      memo: item.memo,
      actor: input.actor,
    }));
    db.workouts.push(...created);
    for (const item of created) {
      if (!db.exercises.some((e) => e.name === item.exercise)) {
        db.exercises.push({ name: item.exercise, category: "カスタム" });
      }
    }
    writeDb(db);
    return created;
  }

  const data = await callGas<{ workouts: Workout[] }>({
    action: "addWorkouts",
    clientId: input.clientId,
    clientName: input.clientName,
    mode: input.mode,
    actor: input.actor,
    date: input.date || today(),
    items: payloadItems,
  });
  return data.workouts || [];
}

export async function listExercises(): Promise<Exercise[]> {
  if (!gasUrl()) return readDb().exercises;
  const data = await callGas<{ exercises: Exercise[] }>({ action: "listExercises" });
  return data.exercises || [];
}

export async function listMenus(clientId?: string): Promise<Menu[]> {
  if (!gasUrl()) {
    const rows = [...readDb().menus].reverse();
    return clientId ? rows.filter((m) => m.clientId === clientId) : rows;
  }
  const data = await callGas<{ menus: Menu[] }>({ action: "listMenus", clientId });
  return data.menus || [];
}

export async function upsertMenu(input: {
  id?: string;
  clientId: string;
  clientName: string;
  title: string;
  items: MenuItem[];
  notes?: string;
}): Promise<Menu> {
  if (!gasUrl()) {
    const db = readDb();
    if (input.id) {
      const idx = db.menus.findIndex((m) => m.id === input.id);
      if (idx < 0) throw new Error("menu not found");
      db.menus[idx] = {
        ...db.menus[idx],
        ...input,
        notes: input.notes || "",
        updatedAt: new Date().toISOString(),
        published: true,
      };
      writeDb(db);
      return db.menus[idx];
    }
    const menu: Menu = {
      id: uid("menu"),
      clientId: input.clientId,
      clientName: input.clientName,
      title: input.title,
      shareToken: uid("shr").replace(/_/g, "").slice(0, 16),
      items: input.items,
      notes: input.notes || "",
      updatedAt: new Date().toISOString(),
      published: true,
    };
    db.menus.push(menu);
    writeDb(db);
    return menu;
  }
  const data = await callGas<{ menu: Menu }>({ action: "upsertMenu", ...input });
  return data.menu;
}

export async function getMenuByToken(token: string): Promise<Menu> {
  if (!gasUrl()) {
    const menu = readDb().menus.find((m) => m.shareToken === token);
    if (!menu) throw new Error("menu not found");
    return menu;
  }
  const data = await callGas<{ menu: Menu }>({ action: "getMenuByToken", token });
  return data.menu;
}

export function emptyDraft(): WorkoutDraft {
  return { exercise: "", weight: "", reps: "", sets: "3", rpe: "", memo: "" };
}
