"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DateNav,
  shiftDate,
  todayTokyo,
} from "@/components/AppChrome";
import { LoadingScreen } from "@/components/LoadingScreen";
import { QuickLogPanel } from "@/components/QuickLogPanel";
import { SessionLog } from "@/components/SessionLog";
import { StatsView } from "@/components/StatsView";
import {
  addWorkouts,
  deleteWorkouts,
  emptyDraft,
  listWorkouts,
  ping,
  updateNickname,
  updateWorkout,
  verifyClient,
} from "@/lib/api";
import type { EditSetLine } from "@/components/EditExerciseSheet";
import { findCatalogItem, getExerciseKind, usesWeight } from "@/lib/exercises";
import {
  MEMBER_KEY,
  clearMemberSession,
  displayName,
} from "@/lib/member";
import {
  clearWorkoutCache,
  loadWorkoutCache,
  saveWorkoutCache,
} from "@/lib/workoutCache";
import { totalLoadKg } from "@/lib/stats";
import {
  enabledGroups,
  loadGroupPrefs,
  saveGroupPrefs,
  type GroupPrefs,
} from "@/lib/trainingPrefs";
import type { Client, Workout, WorkoutDraft } from "@/lib/types";

type View = "log" | "stats";

export default function MemberHomePage() {
  const [code, setCode] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [needsNickSetup, setNeedsNickSetup] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [date, setDate] = useState(todayTokyo());
  const [draft, setDraft] = useState<WorkoutDraft>(emptyDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [view, setView] = useState<View>("log");
  const [prefs, setPrefs] = useState<GroupPrefs>({
    cardio: true,
    machine: true,
    freeweight: true,
  });

  const groups = enabledGroups(prefs);

  const dayWorkouts = useMemo(
    () => workouts.filter((w) => w.date === date),
    [workouts, date]
  );

  const dayLoad = useMemo(() => totalLoadKg(dayWorkouts), [dayWorkouts]);

  async function refreshWorkouts(
    member: Client,
    opts?: { silent?: boolean }
  ) {
    if (!opts?.silent) setWorkoutsLoading(true);
    try {
      const rows = await listWorkouts({
        clientId: member.id,
        limit: 200,
        code: member.code,
      });
      setWorkouts(rows);
      saveWorkoutCache(member.id, rows);
    } finally {
      setWorkoutsLoading(false);
    }
  }

  useEffect(() => {
    setPrefs(loadGroupPrefs());
    void (async () => {
      const saved = localStorage.getItem(MEMBER_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Client;
          const cached = loadWorkoutCache<Workout>(parsed.id);
          if (cached?.length) setWorkouts(cached);
          setClient(parsed);
          setReady(true);

          try {
            const [latest, rows] = await Promise.all([
              verifyClient(parsed.code),
              listWorkouts({
                clientId: parsed.id,
                limit: 200,
                code: parsed.code,
              }),
            ]);
            if (latest) {
              localStorage.setItem(MEMBER_KEY, JSON.stringify(latest));
              setClient(latest);
              setWorkouts(rows);
              saveWorkoutCache(latest.id, rows);
              if (!String(latest.nickname || "").trim()) {
                setNickDraft("");
                setNeedsNickSetup(true);
              }
            } else {
              clearMemberSession();
              setClient(null);
              setWorkouts([]);
            }
            void ping().catch(() => undefined);
          } catch {
            // オフライン等: ログイン状態を維持
          }
        } catch {
          clearMemberSession();
        } finally {
          setWorkoutsLoading(false);
          setReady(true);
        }
        return;
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    function onPopState() {
      setView("log");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openStats() {
    setView("stats");
    window.history.pushState({ view: "stats" }, "", "#stats");
  }

  function closeStats() {
    setView("log");
    if (window.location.hash === "#stats") {
      window.history.back();
    }
  }

  function updatePrefs(next: GroupPrefs) {
    setPrefs(next);
    saveGroupPrefs(next);
    const item = findCatalogItem(draft.exercise);
    if (item && !next[item.group]) setDraft(emptyDraft());
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const found = await verifyClient(code.trim());
      if (!found) {
        setError("会員番号が違います");
        return;
      }
      localStorage.setItem(MEMBER_KEY, JSON.stringify(found));
      const cached = loadWorkoutCache<Workout>(found.id);
      if (cached?.length) {
        setWorkouts(cached);
        setWorkoutsLoading(false);
      } else {
        setWorkoutsLoading(true);
      }
      setClient(found);
      setNickDraft(String(found.nickname || "").trim());
      setNeedsNickSetup(true);
      void ping().catch(() => undefined);
      void refreshWorkouts(found, { silent: Boolean(cached?.length) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveNickname(e: FormEvent) {
    e.preventDefault();
    if (!client) return;
    const nextNick = nickDraft.trim();
    if (!nextNick) {
      setError("ニックネームを入力してください");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const updated = await updateNickname({
        code: client.code,
        nickname: nextNick,
      });
      localStorage.setItem(MEMBER_KEY, JSON.stringify(updated));
      setClient(updated);
      setNeedsNickSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function numOrNull(v?: string | number | null) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function draftsToLocal(items: WorkoutDraft[]): Workout[] {
    if (!client) return [];
    return items.map((item) => {
      const kind = getExerciseKind(item.exercise);
      const withW = usesWeight(item.exercise);
      return {
        id: `tmp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        date,
        clientId: client.id,
        clientName: displayName(client),
        mode: "self",
        exercise: item.exercise,
        minutes: kind === "cardio" ? numOrNull(item.minutes) : null,
        weight: kind === "cardio" || !withW ? null : numOrNull(item.weight),
        reps: kind === "cardio" ? null : numOrNull(item.reps),
        sets: numOrNull(item.sets),
        rpe: numOrNull(item.rpe),
        memo: item.memo || "",
        actor: "client",
      };
    });
  }

  function save(items: WorkoutDraft[]) {
    if (!client) return;
    if (!items.length || !findCatalogItem(items[0].exercise)) {
      setError("種目を選んでください");
      return;
    }

    setError("");
    const optimistic = draftsToLocal(items);
    const tempIds = new Set(optimistic.map((w) => w.id));
    setWorkouts((prev) => {
      const next = [...optimistic, ...prev];
      saveWorkoutCache(client.id, next);
      return next;
    });
    setDraft(emptyDraft());

    void addWorkouts({
      clientId: client.id,
      clientName: displayName(client),
      mode: "self",
      actor: "client",
      date,
      items,
      code: client.code,
    })
      .then((saved) => {
        setWorkouts((prev) => {
          const next = [...saved, ...prev.filter((w) => !tempIds.has(w.id))];
          saveWorkoutCache(client.id, next);
          return next;
        });
      })
      .catch((err) => {
        setWorkouts((prev) => {
          const next = prev.filter((w) => !tempIds.has(w.id));
          saveWorkoutCache(client.id, next);
          return next;
        });
        setError(err instanceof Error ? err.message : String(err));
      });
  }

  async function saveGroup(input: {
    exercise: string;
    existing: Workout[];
    lines: EditSetLine[];
  }) {
    if (!client) return;
    setError("");
    const kind = getExerciseKind(input.exercise);
    const withW = usesWeight(input.exercise);
    const existingIds = new Set(input.existing.map((w) => w.id));
    const rollback = workouts;
    const rebuilt: Workout[] = input.lines.map((line) => {
      const prev = line.id ? workouts.find((w) => w.id === line.id) : undefined;
      return {
        id: prev?.id || `tmp_${Math.random().toString(36).slice(2, 10)}`,
        timestamp: prev?.timestamp || new Date().toISOString(),
        date,
        clientId: client.id,
        clientName: displayName(client),
        mode: "self",
        exercise: input.exercise,
        minutes: kind === "cardio" ? numOrNull(line.minutes) : null,
        weight: kind === "cardio" || !withW ? null : numOrNull(line.weight),
        reps: kind === "cardio" ? null : numOrNull(line.reps),
        sets: prev?.sets ?? null,
        rpe: null,
        memo: line.memo || "",
        actor: "client",
      };
    });
    const nextLocal = [
      ...workouts.filter((w) => !existingIds.has(w.id)),
      ...rebuilt,
    ];
    setWorkouts(nextLocal);
    saveWorkoutCache(client.id, nextLocal);

    void (async () => {
      try {
        const results = await Promise.all(
          input.lines.map(async (line) => {
            if (line.id) {
              await updateWorkout({
                id: line.id,
                exercise: input.exercise,
                weight:
                  kind === "cardio" || !withW
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
                code: client.code,
              });
              return line.id;
            }
            const created = await addWorkouts({
              clientId: client.id,
              clientName: displayName(client),
              mode: "self",
              actor: "client",
              date,
              items: [
                {
                  exercise: input.exercise,
                  weight: kind === "cardio" || !withW ? "" : line.weight,
                  reps: kind === "cardio" ? "" : line.reps,
                  minutes: kind === "cardio" ? line.minutes : "",
                  sets: "",
                  rpe: "",
                  memo: line.memo,
                },
              ],
              code: client.code,
            });
            return created.map((c) => c.id);
          })
        );
        const kept = new Set(results.flat());
        const removeIds = input.existing
          .map((w) => w.id)
          .filter((id) => !kept.has(id));
        if (removeIds.length) {
          await deleteWorkouts(removeIds, { code: client.code });
        }
        const rows = await listWorkouts({
          clientId: client.id,
          limit: 200,
          code: client.code,
        });
        setWorkouts(rows);
        saveWorkoutCache(client.id, rows);
      } catch (err) {
        setWorkouts(rollback);
        saveWorkoutCache(client.id, rollback);
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }

  async function deleteGroup(items: Workout[]) {
    if (!client) return;
    setError("");
    const ids = new Set(items.map((w) => w.id));
    const rollback = workouts;
    setWorkouts((prev) => {
      const next = prev.filter((w) => !ids.has(w.id));
      saveWorkoutCache(client.id, next);
      return next;
    });
    void deleteWorkouts(
      items.map((w) => w.id).filter((id) => !id.startsWith("tmp_")),
      { code: client.code }
    ).catch((err) => {
      setWorkouts(rollback);
      saveWorkoutCache(client.id, rollback);
      setError(err instanceof Error ? err.message : String(err));
    });
  }

  function logout() {
    if (client) clearWorkoutCache(client.id);
    clearMemberSession();
    setClient(null);
    setNeedsNickSetup(false);
    setNickDraft("");
    setCode("");
    setWorkouts([]);
    setView("log");
  }

  if (!ready) {
    return <LoadingScreen label="workout-log" />;
  }

  if (!client) {
    return (
      <main className="shell plain">
        <div className="hero-gate">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden>
              WL
            </div>
            <h1 className="brand">workout-log</h1>
            <p className="lead">
              会員番号（10桁）でログインして、自分の記録だけを残します。
            </p>
          </div>
          <form className="gate-card" onSubmit={login}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>会員番号（10桁）</span>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="1313002331"
                maxLength={10}
                autoFocus
                autoComplete="username"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button
              className="btn primary"
              type="submit"
              disabled={busy || code.length < 10}
            >
              {busy ? "確認中…" : "ログイン"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (needsNickSetup) {
    return (
      <main className="shell plain">
        <div className="hero-gate">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden>
              WL
            </div>
            <h1 className="brand" style={{ fontSize: "1.8rem" }}>
              ニックネーム
            </h1>
            <p className="lead">
              アプリに表示する名前を決めてください。ログインのたびに変更できます。
            </p>
          </div>
          <form className="gate-card" onSubmit={saveNickname}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>表示名（ニックネーム）</span>
              <input
                value={nickDraft}
                onChange={(e) => setNickDraft(e.target.value.slice(0, 40))}
                placeholder="例: 日下竜太"
                autoFocus
                maxLength={40}
                autoComplete="nickname"
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button
              className="btn primary"
              type="submit"
              disabled={busy || !nickDraft.trim()}
            >
              {busy ? "保存中…" : "はじめる"}
            </button>
            <button
              type="button"
              className="text-link tiny"
              onClick={logout}
              style={{ border: 0, background: "transparent", cursor: "pointer" }}
            >
              ログアウト
            </button>
          </form>
        </div>
      </main>
    );
  }

  const showLoading =
    workoutsLoading && dayWorkouts.length === 0 && workouts.length === 0;
  const shownName = displayName(client);

  if (view === "stats") {
    return (
      <main className="shell member session wide">
        <div className="content session-flow session-rail">
          <StatsView
            workouts={workouts}
            clientName={shownName}
            onBack={closeStats}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="shell member session wide">
      <header className="member-hero">
        <div className="session-rail member-hero-inner">
          <div className="member-hero-left">
            <div className="brand-mark sm" aria-hidden>
              WL
            </div>
            <div>
              <p className="member-hero-brand">workout-log</p>
              <h1 className="member-hero-name">{shownName}</h1>
            </div>
          </div>
          <div className="member-hero-actions">
            <button type="button" className="btn ghost sm" onClick={openStats}>
              集計データ
            </button>
            <button type="button" className="text-link tiny logout-btn" onClick={logout}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <DateNav
        date={date}
        onPrev={() => setDate((d) => shiftDate(d, -1))}
        onNext={() => setDate((d) => shiftDate(d, 1))}
        onToday={() => setDate(todayTokyo())}
        loadKg={dayLoad}
      />

      <div className="content session-flow session-rail">
        <div className="session-log-area">
          <SessionLog
            workouts={dayWorkouts}
            loading={showLoading}
            emptyText="まだ記録がありません"
            clientId={client.id}
            date={date}
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
          canSubmitExtra={Boolean(client)}
          history={workouts}
          stayOpen
        />
      </div>
    </main>
  );
}
