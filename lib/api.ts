import { EXERCISE_SUGGESTIONS } from "@/lib/exercises";
import { normalizeMemberNo } from "@/lib/member";
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
    exercises: EXERCISE_SUGGESTIONS.map((e) => ({
      name: e.name,
      category: e.category,
      bodyPart: e.bodyPart,
    })),
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
  "https://script.google.com/macros/s/AKfycbzrAS_BeNdPbyYQSmB753FnAomjXGwJoZ-UxZ9B-_KxpRW_bja4hnjhUpmh4PznLsrD/exec";

const LEGACY_GAS_URLS = new Set([
  "https://script.google.com/macros/s/AKfycbzBzUwaex0f5VnNBRoaHUCuEdIJWuxSDHH54aDZnHkGCx7HbX5U-ArilqBN-db4i486/exec",
  "https://script.google.com/macros/s/AKfycbwRjyl8tCXDHyqRRLSvyLTQtZZJ5b8Gv6wZlWGmugqYwh_AZ6n7p-b2wbj_6IjfTxrX/exec",
  "https://script.google.com/macros/s/AKfycbyQTSm0SHj-efIfavP16nnTBF_Nw9JCPqjv_2vtBsQjyGssMAefZXA7h15a19D1hoFD/exec",
]);

function gasUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_GAS_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pt-ryuta-gas-url");
    if (saved && saved.trim()) {
      const url = saved.trim();
      // 古いデプロイ（更新APIなし）は自動で差し替え
      if (LEGACY_GAS_URLS.has(url)) {
        localStorage.setItem("pt-ryuta-gas-url", SUGGESTED_GAS_URL);
        return SUGGESTED_GAS_URL;
      }
      return url;
    }
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
  const memberNo = normalizeMemberNo(code);
  if (!memberNo) return null;
  if (!gasUrl()) {
    return (
      readDb().clients.find(
        (c) => normalizeMemberNo(c.code) === memberNo && c.active
      ) || null
    );
  }
  const data = await callGas<{ client: Client | null }>({
    action: "verifyClient",
    code: memberNo,
  });
  return data.client || null;
}

export async function updateNickname(input: {
  code: string;
  nickname: string;
}): Promise<Client> {
  const memberNo = normalizeMemberNo(input.code);
  const nickname = String(input.nickname || "").trim();
  if (!memberNo || !nickname) {
    throw new Error("会員番号とニックネームを入力してください");
  }
  if (!gasUrl()) {
    const db = readDb();
    const idx = db.clients.findIndex(
      (c) => normalizeMemberNo(c.code) === memberNo && c.active
    );
    if (idx < 0) throw new Error("会員番号が違います");
    db.clients[idx] = { ...db.clients[idx], nickname };
    writeDb(db);
    return db.clients[idx];
  }
  const data = await callGas<{ client: Client }>({
    action: "updateNickname",
    code: memberNo,
    nickname,
  });
  return data.client;
}

export async function listClients(pin: string): Promise<Client[]> {
  if (!gasUrl()) return readDb().clients.filter((c) => c.active);
  const data = await callGas<{ clients: Client[] }>({
    action: "listClients",
    pin,
  });
  return data.clients || [];
}

export async function upsertClient(input: {
  id?: string;
  name: string;
  code: string;
  goal?: string;
  notes?: string;
}): Promise<Client> {
  void input;
  throw new Error("会員の追加・変更はスプレッドシート「会員マスタ」からのみ行えます");
}

export async function adminSyncMembers(input: {
  pin: string;
  members: {
    name: string;
    code: string;
    nickname?: string;
    goal?: string;
    notes?: string;
  }[];
}): Promise<Client[]> {
  if (!gasUrl()) {
    throw new Error("スプレッドシート未接続のため同期できません");
  }
  const data = await callGas<{ clients: Client[] }>({
    action: "adminSyncMembers",
    ...input,
  });
  return data.clients || [];
}

export async function listWorkouts(opts: {
  clientId?: string;
  mode?: WorkoutMode;
  limit?: number;
  /** 会員認証（会員番号） */
  code?: string;
  pin?: string;
}): Promise<Workout[]> {
  if (!gasUrl()) {
    let rows = [...readDb().workouts].reverse();
    if (opts.clientId) rows = rows.filter((w) => w.clientId === opts.clientId);
    if (opts.mode) rows = rows.filter((w) => w.mode === opts.mode);
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return rows;
  }
  const data = await callGas<{ workouts: Workout[] }>({
    action: "listWorkouts",
    clientId: opts.clientId,
    mode: opts.mode,
    limit: opts.limit,
    code: opts.code,
    pin: opts.pin,
  });
  return (data.workouts || []).map((w) => ({
    ...w,
    date: normalizeWorkoutDate(w.date),
    minutes: w.minutes ?? null,
  }));
}

function normalizeWorkoutDate(value: string): string {
  const raw = String(value || "");
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  }
  return raw;
}

export async function addWorkouts(input: {
  clientId: string;
  clientName: string;
  mode: WorkoutMode;
  actor: string;
  date?: string;
  items: WorkoutDraft[];
  code?: string;
  pin?: string;
}): Promise<Workout[]> {
  const payloadItems = input.items
    .filter((i) => i.exercise.trim())
    .map((i) => ({
      exercise: i.exercise.trim(),
      minutes: i.minutes === "" ? null : Number(i.minutes),
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
      minutes: item.minutes,
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
    code: input.code,
    pin: input.pin,
  });
  return data.workouts || [];
}

export async function updateWorkout(input: {
  id: string;
  exercise?: string;
  minutes?: number | null;
  weight?: number | null;
  reps?: number | null;
  sets?: number | null;
  rpe?: number | null;
  memo?: string;
  date?: string;
  code?: string;
  pin?: string;
}): Promise<Workout> {
  if (!gasUrl()) {
    const db = readDb();
    const idx = db.workouts.findIndex((w) => w.id === input.id);
    if (idx < 0) throw new Error("workout not found");
    db.workouts[idx] = {
      ...db.workouts[idx],
      ...(input.exercise !== undefined ? { exercise: input.exercise } : {}),
      ...(input.minutes !== undefined ? { minutes: input.minutes } : {}),
      ...(input.weight !== undefined ? { weight: input.weight } : {}),
      ...(input.reps !== undefined ? { reps: input.reps } : {}),
      ...(input.sets !== undefined ? { sets: input.sets } : {}),
      ...(input.rpe !== undefined ? { rpe: input.rpe } : {}),
      ...(input.memo !== undefined ? { memo: input.memo } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
    };
    writeDb(db);
    return db.workouts[idx];
  }
  const data = await callGas<{ workout: Workout }>({
    action: "updateWorkout",
    ...input,
  });
  return data.workout;
}

export async function deleteWorkouts(
  ids: string[],
  auth?: { code?: string; pin?: string }
): Promise<number> {
  if (!ids.length) return 0;
  if (!gasUrl()) {
    const db = readDb();
    const before = db.workouts.length;
    db.workouts = db.workouts.filter((w) => !ids.includes(w.id));
    writeDb(db);
    return before - db.workouts.length;
  }
  const data = await callGas<{ deleted: number }>({
    action: "deleteWorkouts",
    ids,
    code: auth?.code,
    pin: auth?.pin,
  });
  return data.deleted || 0;
}

export async function listExercises(): Promise<Exercise[]> {
  if (!gasUrl()) return readDb().exercises;
  const data = await callGas<{ exercises: Exercise[] }>({ action: "listExercises" });
  return data.exercises || [];
}

export async function listMenus(
  pin: string,
  clientId?: string
): Promise<Menu[]> {
  if (!gasUrl()) {
    const rows = [...readDb().menus].reverse();
    return clientId ? rows.filter((m) => m.clientId === clientId) : rows;
  }
  const data = await callGas<{ menus: Menu[] }>({
    action: "listMenus",
    pin,
    clientId,
  });
  return data.menus || [];
}

export async function upsertMenu(input: {
  id?: string;
  clientId: string;
  clientName: string;
  title: string;
  items: MenuItem[];
  notes?: string;
  pin: string;
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
  return {
    exercise: "",
    minutes: "",
    weight: "",
    reps: "",
    sets: "3",
    rpe: "",
    memo: "",
  };
}
