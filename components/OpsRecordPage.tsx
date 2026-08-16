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
  const [busy, setBusy] = useState(false);
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

  async function save(items: WorkoutDraft[]) {
    if (!active) {
      setError("会員マスタで記録する人を選んでください");
      return;
    }
    if (!items.length || !findCatalogItem(items[0].exercise)) {
      setError("種目を選んでください");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const saved = await addWorkouts({
        clientId: active.id,
        clientName: active.name,
        mode,
        actor: isPt ? "trainer" : "staff",
        date,
        items,
        staff: true,
      });
      setWorkouts((prev) => [...saved, ...prev]);
      setDraft(emptyDraft());
      void refreshWorkouts(active.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveGroup(input: {
    exercise: string;
    existing: Workout[];
    lines: EditSetLine[];
  }) {
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      const kindEx = getExerciseKind(input.exercise);
      const withW = usesWeight(input.exercise);
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(items: Workout[]) {
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      await deleteWorkouts(
        items.map((w) => w.id),
        { staff: true }
      );
      setWorkouts((prev) => {
        const ids = new Set(items.map((w) => w.id));
        return prev.filter((w) => !ids.has(w.id));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
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
      {busy ? (
        <LoadingScreen overlay label="記録を反映しています…" />
      ) : null}
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
          busy={busy}
          onSaveGroup={saveGroup}
          onDeleteGroup={deleteGroup}
        />

        <QuickLogPanel
          draft={draft}
          onChange={setDraft}
          prefs={prefs}
          onPrefsChange={updatePrefs}
          enabledGroups={groups}
          busy={busy}
          error={error}
          onSubmit={save}
          canSubmitExtra={Boolean(active)}
          history={workouts}
        />
      </div>

      <TrainerNav />
    </main>
  );
}
