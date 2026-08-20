"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DateNav,
  TrainerNav,
  shiftDate,
  todayTokyo,
} from "@/components/AppChrome";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuickLogPanel } from "@/components/QuickLogPanel";
import { SessionLog } from "@/components/SessionLog";
import {
  addWorkouts,
  deleteWorkouts,
  emptyDraft,
  listClients,
  listWorkouts,
  updateWorkout,
} from "@/lib/api";
import type { EditSetLine } from "@/components/EditExerciseSheet";
import { isPtClient, toActiveClient } from "@/lib/clientKind";
import {
  findCatalogItem,
  getExerciseKind,
  groupWorkoutsByExercise,
  usesWeight,
} from "@/lib/exercises";
import {
  loadActiveTrainerClient,
  saveActiveTrainerClient,
  type ActiveTrainerClient,
} from "@/lib/trainerActiveClient";
import {
  enabledGroups,
  loadGroupPrefs,
  saveGroupPrefs,
  type GroupPrefs,
} from "@/lib/trainingPrefs";
import type { Workout, WorkoutDraft, WorkoutMode } from "@/lib/types";

type Kind = "log" | "pt";

type Props = {
  kind: Kind;
};

export function OpsRecordPage({ kind }: Props) {
  const router = useRouter();
  const isPt = kind === "pt";
  const mode: WorkoutMode = isPt ? "pt" : "self";
  const clientsHref = isPt ? "/ops/clients?tab=pt" : "/ops/clients?tab=log";

  const [active, setActive] = useState<ActiveTrainerClient | null>(null);
  const [date, setDate] = useState(todayTokyo());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [draft, setDraft] = useState<WorkoutDraft>(emptyDraft());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<GroupPrefs>({
    cardio: true,
    machine: true,
    freeweight: true,
  });

  const groups = enabledGroups(prefs);

  const dayWorkouts = useMemo(
    () =>
      workouts.filter(
        (w) => w.date === date && (!active || w.clientId === active.id)
      ),
    [workouts, date, active]
  );

  const summary = useMemo(() => {
    const grouped = groupWorkoutsByExercise(dayWorkouts);
    const minutes = dayWorkouts.reduce((a, w) => a + (w.minutes || 0), 0);
    const sets = dayWorkouts.filter(
      (w) => findCatalogItem(w.exercise)?.record !== "minutes"
    ).length;
    return { exercises: grouped.length, sets, minutes };
  }, [dayWorkouts]);

  async function refreshWorkouts(clientId: string) {
    const rows = await listWorkouts({
      clientId,
      limit: 200,
      staff: true,
    });
    setWorkouts(rows);
  }

  useEffect(() => {
    setPrefs(loadGroupPrefs());
    void (async () => {
      try {
        const saved = loadActiveTrainerClient();
        const clients = await listClients();
        if (saved) {
          const latest = clients.find((c) => c.id === saved.id);
          if (latest) {
            const next = toActiveClient(latest);
            saveActiveTrainerClient(next);
            const clientIsPt = isPtClient(latest);
            if (isPt && !clientIsPt) {
              router.replace("/ops/session");
              return;
            }
            if (!isPt && clientIsPt) {
              router.replace("/ops/pt");
              return;
            }
            setActive(next);
            await refreshWorkouts(next.id);
          } else {
            setActive(null);
          }
        } else {
          setActive(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [isPt, router]);

  function updatePrefs(next: GroupPrefs) {
    setPrefs(next);
    saveGroupPrefs(next);
    const item = findCatalogItem(draft.exercise);
    if (item && !next[item.group]) setDraft(emptyDraft());
  }

  function numOrNull(v?: string | number | null) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function draftsToLocal(items: WorkoutDraft[]): Workout[] {
    if (!active) return [];
    return items.map((item) => {
      const kindEx = getExerciseKind(item.exercise);
      const withW = usesWeight(item.exercise);
      return {
        id: `tmp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        date,
        clientId: active.id,
        clientName: active.name,
        mode,
        exercise: item.exercise,
        minutes: kindEx === "cardio" ? numOrNull(item.minutes) : null,
        weight: kindEx === "cardio" || !withW ? null : numOrNull(item.weight),
        reps: kindEx === "cardio" ? null : numOrNull(item.reps),
        sets: numOrNull(item.sets),
        rpe: numOrNull(item.rpe),
        memo: item.memo || "",
        actor: isPt ? "trainer" : "staff",
      };
    });
  }

  function save(items: WorkoutDraft[]) {
    if (!active) {
      setError("会員マスタで記録する人を選んでください");
      return;
    }
    if (!items.length || !findCatalogItem(items[0].exercise)) {
      setError("種目を選んでください");
      return;
    }

    setError("");
    const optimistic = draftsToLocal(items);
    const tempIds = new Set(optimistic.map((w) => w.id));
    setWorkouts((prev) => [...optimistic, ...prev]);
    setDraft(emptyDraft());

    void addWorkouts({
      clientId: active.id,
      clientName: active.name,
      mode,
      actor: isPt ? "trainer" : "staff",
      date,
      items,
      staff: true,
    })
      .then((saved) => {
        setWorkouts((prev) => [
          ...saved,
          ...prev.filter((w) => !tempIds.has(w.id)),
        ]);
      })
      .catch((err) => {
        setWorkouts((prev) => prev.filter((w) => !tempIds.has(w.id)));
        setError(err instanceof Error ? err.message : String(err));
      });
  }

  async function saveGroup(input: {
    exercise: string;
    existing: Workout[];
    lines: EditSetLine[];
  }) {
    if (!active) return;
    setError("");
    const kindEx = getExerciseKind(input.exercise);
    const withW = usesWeight(input.exercise);
    const existingIds = new Set(input.existing.map((w) => w.id));
    const rollback = workouts;
    const rebuilt: Workout[] = input.lines.map((line) => {
      const prev = line.id ? workouts.find((w) => w.id === line.id) : undefined;
      return {
        id: prev?.id || `tmp_${Math.random().toString(36).slice(2, 10)}`,
        timestamp: prev?.timestamp || new Date().toISOString(),
        date,
        clientId: active.id,
        clientName: active.name,
        mode,
        exercise: input.exercise,
        minutes: kindEx === "cardio" ? numOrNull(line.minutes) : null,
        weight: kindEx === "cardio" || !withW ? null : numOrNull(line.weight),
        reps: kindEx === "cardio" ? null : numOrNull(line.reps),
        sets: prev?.sets ?? null,
        rpe: null,
        memo: line.memo || "",
        actor: isPt ? "trainer" : "staff",
      };
    });
    setWorkouts([
      ...workouts.filter((w) => !existingIds.has(w.id)),
      ...rebuilt,
    ]);

    void (async () => {
      try {
        const results = await Promise.all(
          input.lines.map(async (line) => {
            if (line.id) {
              await updateWorkout({
                id: line.id,
                exercise: input.exercise,
                weight:
                  kindEx === "cardio" || !withW
                    ? null
                    : line.weight === ""
                      ? null
                      : Number(line.weight),
                reps:
                  kindEx === "cardio"
                    ? null
                    : line.reps === ""
                      ? null
                      : Number(line.reps),
                minutes:
                  kindEx === "cardio"
                    ? line.minutes === ""
                      ? null
                      : Number(line.minutes)
                    : null,
                memo: line.memo,
                staff: true,
              });
              return line.id;
            }
            const created = await addWorkouts({
              clientId: active.id,
              clientName: active.name,
              mode,
              actor: isPt ? "trainer" : "staff",
              date,
              items: [
                {
                  exercise: input.exercise,
                  weight: kindEx === "cardio" || !withW ? "" : line.weight,
                  reps: kindEx === "cardio" ? "" : line.reps,
                  minutes: kindEx === "cardio" ? line.minutes : "",
                  sets: "",
                  rpe: "",
                  memo: line.memo,
                },
              ],
              staff: true,
            });
            return created.map((c) => c.id);
          })
        );
        const kept = new Set(results.flat());
        const removeIds = input.existing
          .map((w) => w.id)
          .filter((id) => !kept.has(id));
        if (removeIds.length) await deleteWorkouts(removeIds, { staff: true });
        await refreshWorkouts(active.id);
      } catch (err) {
        setWorkouts(rollback);
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }

  async function deleteGroup(items: Workout[]) {
    if (!active) return;
    setError("");
    const ids = new Set(items.map((w) => w.id));
    const rollback = workouts;
    setWorkouts((prev) => prev.filter((w) => !ids.has(w.id)));
    void deleteWorkouts(
      items.map((w) => w.id).filter((id) => !id.startsWith("tmp_")),
      { staff: true }
    ).catch((err) => {
      setWorkouts(rollback);
      setError(err instanceof Error ? err.message : String(err));
    });
  }

  if (loading) {
    return (
      <main className="shell session">
        <LoadingScreen
          label={isPt ? "PTを開いています…" : "記録を開いています…"}
          full={false}
        />
        <TrainerNav />
      </main>
    );
  }

  if (!active) {
    return (
      <main className="shell session">
        <div className="content session-flow" style={{ paddingTop: 24 }}>
          <section className="compose-card">
            <h2 style={{ margin: 0 }}>
              {isPt ? "PT会員が未選択です" : "記録する人が未選択です"}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {isPt
                ? "メモが「PT」の会員を選んでください。"
                : "会員マスタから選んでください。"}
            </p>
            <Link className="btn primary" href={clientsHref}>
              会員マスタへ
            </Link>
          </section>
        </div>
        <TrainerNav />
      </main>
    );
  }

  return (
    <main className="shell session">
      <div className="compact-bar">
        <div className="top-stats">
          <span>
            <strong>{summary.exercises}</strong> 種目
          </span>
          <span>
            <strong>{summary.sets}</strong> セット
          </span>
          <span>
            有酸素 <strong>{summary.minutes}</strong> 分
          </span>
        </div>
        <div className="active-member-bar">
          <div>
            <p className="tiny muted" style={{ margin: 0 }}>
              {isPt ? "PT 記録中" : "記録中"}
            </p>
            <p className="active-member-name">
              {active.name}
              {isPt ? <span className="pt-badge">PT</span> : null}
            </p>
          </div>
          <Link href={clientsHref} className="text-link tiny">
            会員で変更
          </Link>
        </div>
      </div>

      <DateNav
        date={date}
        onPrev={() => setDate((d) => shiftDate(d, -1))}
        onNext={() => setDate((d) => shiftDate(d, 1))}
        onToday={() => setDate(todayTokyo())}
      />

      <div className="content session-flow">
        <SessionLog
          workouts={dayWorkouts}
          emptyText="まだありません"
          clientId={active.id}
          date={date}
          busy={false}
          onSaveGroup={saveGroup}
          onDeleteGroup={deleteGroup}
        />

        <QuickLogPanel
          draft={draft}
          onChange={setDraft}
          prefs={prefs}
          onPrefsChange={updatePrefs}
          enabledGroups={groups}
          busy={false}
          error={error}
          onSubmit={save}
          canSubmitExtra={Boolean(active)}
          history={workouts}
          stayOpen
        />
      </div>

      <TrainerNav />
    </main>
  );
}
