"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { EditSetLine } from "@/components/EditExerciseSheet";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PtaHeader } from "@/components/PtaHeader";
import { QuickLogPanel } from "@/components/QuickLogPanel";
import { SessionLog } from "@/components/SessionLog";
import {
  deletePtSession,
  emptyDraft,
  listClients,
  listPtSessions,
  peekClients,
  peekPtSessions,
  upsertPtSession,
} from "@/lib/api";
import { createLatestWriter } from "@/lib/bgPersist";
import {
  clientRouteKey,
  findClientByRouteKey,
  isPtClient,
} from "@/lib/clientKind";
import { findCatalogItem, getExerciseKind, usesWeight } from "@/lib/exercises";
import {
  enabledGroups,
  loadGroupPrefs,
  saveGroupPrefs,
  type GroupPrefs,
} from "@/lib/trainingPrefs";
import type {
  Client,
  PtSession,
  PtSessionExercise,
  Workout,
  WorkoutDraft,
} from "@/lib/types";

function numOrNull(v?: string | number | null) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function uidLocal() {
  return `pts_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function exercisesToWorkouts(
  session: PtSession,
  client: Client
): Workout[] {
  const clientId = clientRouteKey(client);
  return (session.exercises || []).map((ex, i) => ({
    id: ex.id || `${session.id}_${i}`,
    timestamp: session.updatedAt || session.createdAt || "",
    date: `s${session.sessionNo}`,
    clientId,
    clientName: client.name,
    mode: "pt",
    exercise: ex.name,
    minutes: numOrNull(ex.minutes),
    weight: numOrNull(ex.weight),
    reps: numOrNull(ex.reps),
    sets: numOrNull(ex.sets),
    rpe: null,
    memo: ex.note || "",
    actor: "trainer",
  }));
}

function workoutsToExercises(rows: Workout[]): PtSessionExercise[] {
  return rows.map((w) => ({
    id: w.id,
    name: w.exercise,
    weight: w.weight != null ? String(w.weight) : "",
    reps: w.reps != null ? String(w.reps) : "",
    sets: w.sets != null ? String(w.sets) : "",
    minutes: w.minutes != null ? String(w.minutes) : "",
    note: w.memo || "",
  }));
}

function draftToWorkout(
  item: WorkoutDraft,
  client: Client,
  session: PtSession
): Workout {
  const kind = getExerciseKind(item.exercise);
  const withW = usesWeight(item.exercise);
  return {
    id: uidLocal(),
    timestamp: new Date().toISOString(),
    date: `s${session.sessionNo}`,
    clientId: clientRouteKey(client),
    clientName: client.name,
    mode: "pt",
    exercise: item.exercise,
    minutes: kind === "cardio" ? numOrNull(item.minutes) : null,
    weight: kind === "cardio" || !withW ? null : numOrNull(item.weight),
    reps: kind === "cardio" ? null : numOrNull(item.reps),
    sets: numOrNull(item.sets),
    rpe: numOrNull(item.rpe),
    memo: item.memo || "",
    actor: "trainer",
  };
}

export default function PtaSessionEditPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = decodeURIComponent(String(params.clientId || ""));
  const sessionId = String(params.sessionId || "");

  const [client, setClient] = useState<Client | null>(null);
  const [session, setSession] = useState<PtSession | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [memo, setMemo] = useState("");
  const [draft, setDraft] = useState<WorkoutDraft>(emptyDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<GroupPrefs>({
    cardio: true,
    machine: true,
    freeweight: true,
  });

  const workoutsRef = useRef(workouts);
  const memoRef = useRef(memo);
  const clientRef = useRef(client);
  const sessionRef = useRef(session);
  workoutsRef.current = workouts;
  memoRef.current = memo;
  clientRef.current = client;
  sessionRef.current = session;

  const writerRef = useRef(
    createLatestWriter<{ workouts: Workout[]; memo: string }>(async (snap) => {
      const c = clientRef.current;
      const s = sessionRef.current;
      if (!c || !s) return;
      try {
        const updated = await upsertPtSession({
          id: s.id,
          clientId: clientRouteKey(c),
          clientName: c.name,
          sessionNo: s.sessionNo,
          exercises: workoutsToExercises(snap.workouts),
          memo: snap.memo,
        });
        setSession(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })
  );

  useEffect(() => writerRef.current.onSyncing(setSyncing), []);

  const groups = enabledGroups(prefs);
  const backHref = `/pta/c/${encodeURIComponent(clientRouteKey(client || { id: clientId, code: clientId }))}`;

  useEffect(() => {
    setPrefs(loadGroupPrefs());
    const cachedClients = peekClients();
    const cachedHit = cachedClients
      ? findClientByRouteKey(cachedClients, clientId)
      : null;
    if (cachedHit && isPtClient(cachedHit)) {
      setClient(cachedHit);
      const key = clientRouteKey(cachedHit);
      const cachedSess = peekPtSessions(key)?.find((x) => x.id === sessionId);
      if (cachedSess) {
        setSession(cachedSess);
        setMemo(cachedSess.memo || "");
        setWorkouts(exercisesToWorkouts(cachedSess, cachedHit));
        setLoading(false);
      }
    }
    void (async () => {
      try {
        const clients = await listClients();
        const hit = findClientByRouteKey(clients, clientId) || null;
        if (!hit || !isPtClient(hit)) {
          setError("PT会員が見つかりません");
          return;
        }
        setClient(hit);
        const key = clientRouteKey(hit);
        const rows = await listPtSessions(key);
        const s = rows.find((x) => x.id === sessionId) || null;
        if (!s) {
          setError("セッションが見つかりません");
          return;
        }
        setSession(s);
        setMemo(s.memo || "");
        setWorkouts(exercisesToWorkouts(s, hit));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, sessionId]);

  const history = useMemo(() => workouts, [workouts]);

  function persistLocal(nextWorkouts: Workout[], nextMemo = memoRef.current) {
    workoutsRef.current = nextWorkouts;
    memoRef.current = nextMemo;
    setWorkouts(nextWorkouts);
    setMemo(nextMemo);
    setError("");
    writerRef.current.push({ workouts: nextWorkouts, memo: nextMemo });
  }

  function updatePrefs(next: GroupPrefs) {
    setPrefs(next);
    saveGroupPrefs(next);
    const item = findCatalogItem(draft.exercise);
    if (item && !next[item.group]) setDraft(emptyDraft());
  }

  function save(items: WorkoutDraft[]) {
    if (!client || !session) return;
    if (!items.length || !findCatalogItem(items[0].exercise)) {
      setError("種目を選んでください");
      return;
    }
    const added = items.map((item) => draftToWorkout(item, client, session));
    persistLocal([...workoutsRef.current, ...added]);
    setDraft(emptyDraft());
  }

  async function saveGroup(input: {
    exercise: string;
    existing: Workout[];
    lines: EditSetLine[];
  }) {
    if (!client || !session) return;
    const kind = getExerciseKind(input.exercise);
    const withW = usesWeight(input.exercise);
    const existingIds = new Set(input.existing.map((w) => w.id));
    const rebuilt: Workout[] = [];
    for (const line of input.lines) {
      const prev = line.id
        ? workoutsRef.current.find((w) => w.id === line.id)
        : undefined;
      rebuilt.push({
        id: prev?.id || uidLocal(),
        timestamp: prev?.timestamp || new Date().toISOString(),
        date: `s${session.sessionNo}`,
        clientId: clientRouteKey(client),
        clientName: client.name,
        mode: "pt",
        exercise: input.exercise,
        minutes: kind === "cardio" ? numOrNull(line.minutes) : null,
        weight: kind === "cardio" || !withW ? null : numOrNull(line.weight),
        reps: kind === "cardio" ? null : numOrNull(line.reps),
        sets: prev?.sets ?? null,
        rpe: null,
        memo: line.memo || "",
        actor: "trainer",
      });
    }
    persistLocal([
      ...workoutsRef.current.filter((w) => !existingIds.has(w.id)),
      ...rebuilt,
    ]);
  }

  async function deleteGroup(items: Workout[]) {
    if (!client || !session) return;
    const ids = new Set(items.map((w) => w.id));
    persistLocal(workoutsRef.current.filter((w) => !ids.has(w.id)));
  }

  function saveMemo() {
    if (!client || !session) return;
    persistLocal(workoutsRef.current, memo);
  }

  async function removeSession() {
    if (!session || !client) return;
    if (!window.confirm(`第${session.sessionNo}回を削除しますか？`)) return;
    setBusy(true);
    try {
      await deletePtSession(session.id, clientRouteKey(client));
      router.replace(backHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (loading && !client) {
    return (
      <main className="shell member session wide pta">
        <LoadingScreen label="セッションを開いています…" full={false} />
      </main>
    );
  }

  return (
    <main className="shell member session wide pta">
      {busy ? (
        <LoadingScreen overlay label="セッションを削除しています…" />
      ) : null}
      <PtaHeader
        backHref={backHref}
        backLabel="セッション一覧"
        kicker={
          session
            ? syncing
              ? `第${session.sessionNo}回 · 同期中`
              : `第${session.sessionNo}回`
            : "セッション"
        }
        title={client?.name || "PT会員"}
        action={
          <button
            type="button"
            className="text-link tiny pta-delete"
            onClick={removeSession}
            disabled={busy}
          >
            削除
          </button>
        }
      />

      <div className="content session-flow session-rail">
        {error ? <p className="error">{error}</p> : null}

        <label className="field pta-session-memo">
          <span>セッションメモ</span>
          <textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => void saveMemo()}
            placeholder="体調、方針、次回への申し送り"
          />
        </label>

        <div className="session-log-area">
          <SessionLog
            workouts={workouts}
            emptyText="まだ記録がありません"
            clientId={client ? clientRouteKey(client) : undefined}
            date={session ? `s${session.sessionNo}` : undefined}
            busy={false}
            onSaveGroup={saveGroup}
            onDeleteGroup={deleteGroup}
          />
        </div>

        <QuickLogPanel
          draft={draft}
          onChange={setDraft}
          prefs={prefs}
          onPrefsChange={updatePrefs}
          enabledGroups={groups}
          busy={false}
          error={error}
          onSubmit={save}
          canSubmitExtra={Boolean(client && session)}
          history={history}
          startOpen
          stayOpen
        />
      </div>
    </main>
  );
}
