"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { findCatalogItem, getExerciseKind, groupWorkoutsByExercise } from "@/lib/exercises";
import { loadStaffPin } from "@/lib/staffAuth";
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
import type { Workout, WorkoutDraft } from "@/lib/types";

export default function OpsSessionPage() {
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
      pin: loadStaffPin(),
    });
    setWorkouts(rows);
  }

  useEffect(() => {
    setPrefs(loadGroupPrefs());
    void (async () => {
      try {
        const pin = loadStaffPin();
        const saved = loadActiveTrainerClient();
        const clients = await listClients(pin);
        if (saved) {
          const latest = clients.find((c) => c.id === saved.id);
          if (latest) {
            const next = {
              id: latest.id,
              name: latest.name,
              code: latest.code,
            };
            saveActiveTrainerClient(next);
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
  }, []);

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
        mode: "pt",
        actor: "trainer",
        date,
        items,
        pin: loadStaffPin(),
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
      const pin = loadStaffPin();
      const kind = getExerciseKind(input.exercise);
      const results = await Promise.all(
        input.lines.map(async (line) => {
          if (line.id) {
            await updateWorkout({
              id: line.id,
              exercise: input.exercise,
              weight:
                kind === "cardio"
                  ? null
                  : line.weight === ""
                    ? null
                    : Number(line.weight),
              reps:
                kind === "cardio"
                  ? null
                  : line.reps === ""
                    ? null
                    : Number(line.reps),
              minutes:
                kind === "cardio"
                  ? line.minutes === ""
                    ? null
                    : Number(line.minutes)
                  : null,
              memo: line.memo,
              pin,
            });
            return line.id;
          }
          const created = await addWorkouts({
            clientId: active.id,
            clientName: active.name,
            mode: "pt",
            actor: "trainer",
            date,
            items: [
              {
                exercise: input.exercise,
                weight: kind === "cardio" ? "" : line.weight,
                reps: kind === "cardio" ? "" : line.reps,
                minutes: kind === "cardio" ? line.minutes : "",
                sets: "",
                rpe: "",
                memo: line.memo,
              },
            ],
            pin,
          });
          return created.map((c) => c.id);
        })
      );
      const kept = new Set(results.flat());
      const removeIds = input.existing
        .map((w) => w.id)
        .filter((id) => !kept.has(id));
      if (removeIds.length) await deleteWorkouts(removeIds, { pin });
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
        { pin: loadStaffPin() }
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
        <LoadingScreen label="記録を開いています…" full={false} />
        <TrainerNav />
      </main>
    );
  }

  if (!active) {
    return (
      <main className="shell session">
        <div className="content session-flow" style={{ paddingTop: 24 }}>
          <section className="compose-card">
            <h2 style={{ margin: 0 }}>記録する人が未選択です</h2>
            <p className="muted" style={{ margin: 0 }}>
              会員マスタから選んでください。
            </p>
            <Link className="btn primary" href="/ops/clients">
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
              記録中
            </p>
            <p className="active-member-name">{active.name}</p>
          </div>
          <Link href="/ops/clients" className="text-link tiny">
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
