export type WorkoutMode = "pt" | "self";

export type Client = {
  id: string;
  name: string;
  code: string;
  goal: string;
  notes: string;
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
  weight: number | null;
  reps: number | null;
  sets: number | null;
  rpe: number | null;
  memo: string;
  actor: string;
};

export type MenuItem = {
  exercise: string;
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
};

export type WorkoutDraft = {
  exercise: string;
  weight: string;
  reps: string;
  sets: string;
  rpe: string;
  memo: string;
};
