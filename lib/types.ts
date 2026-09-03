export type WorkoutMode = "pt" | "self";

export type Client = {
  id: string;
  name: string;
  code: string;
  /** アプリ表示用の呼び名（本人が設定） */
  nickname?: string;
  goal: string;
  notes: string;
  /** 入会日 YYYY-MM-DD */
  enrolledAt?: string;
  createdAt: string;
  active: boolean;
};

export type Workout = {
  id: string;
  timestamp: string;
  date: string;
  clientId: string;
  clientName: string;
  mode: WorkoutMode | string;
  exercise: string;
  minutes: number | null;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  rpe: number | null;
  memo: string;
  actor: string;
};

export type MenuItem = {
  exercise: string;
  minutes?: number | null;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  note?: string;
};

export type Menu = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  shareToken: string;
  items: MenuItem[];
  notes: string;
  updatedAt: string;
  published: boolean;
};

export type Exercise = {
  name: string;
  category: string;
  bodyPart?: string;
};

export type WorkoutDraft = {
  exercise: string;
  minutes: string;
  weight: string;
  reps: string;
  sets: string;
  rpe: string;
  memo: string;
};

/** PT管理アプリ: 回数ベースのセッション（1行＝1セット、個人ログと同じ） */
export type PtSessionExercise = {
  id?: string;
  name: string;
  weight?: string;
  reps?: string;
  sets?: string;
  minutes?: string;
  note?: string;
};

export type PtSession = {
  id: string;
  clientId: string;
  clientName: string;
  sessionNo: number;
  exercises: PtSessionExercise[];
  memo: string;
  createdAt: string;
  updatedAt: string;
};
