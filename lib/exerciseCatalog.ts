/**
 * PT RYUTA 種目マスタ（確定版）
 * - 有酸素: 分
 * - マシン / フリー: 重量×回数
 * - 部位: 胸 / 背中 / 腹 / 脚 / 腕 / 肩
 * - 画像: 有酸素・レジスタンスのみ（経堂マシン写真）
 */

export type RecordStyle = "minutes" | "weight_reps";
export type AreaGroup = "cardio" | "machine" | "freeweight";
export type BodyPart = "胸" | "背中" | "腹" | "脚" | "腕" | "肩";

export type CatalogItem = {
  id: string;
  name: string;
  group: AreaGroup;
  bodyPart: BodyPart;
  record: RecordStyle;
  note?: string;
  /** public/machines 配下のファイル名（拡張子なし）。未設定はフリーウェイトなど */
  imageId?: string;
};

export const BODY_PARTS: BodyPart[] = ["胸", "背中", "腹", "脚", "腕", "肩"];

export const AREA_LABELS: Record<AreaGroup, string> = {
  cardio: "Cardio",
  machine: "Resistance",
  freeweight: "Free Weight",
};

/** 有酸素（分） — 画像元: 24KYODO-MACHINE cardio_1〜3 */
export const CARDIO_ITEMS: CatalogItem[] = [
  {
    id: "c_treadmill",
    name: "トレッドミル",
    group: "cardio",
    bodyPart: "脚",
    record: "minutes",
    imageId: "c_treadmill",
  },
  {
    id: "c_cross",
    name: "クロストレーナー",
    group: "cardio",
    bodyPart: "脚",
    record: "minutes",
    imageId: "c_cross",
  },
  {
    id: "c_bike",
    name: "バイク",
    group: "cardio",
    bodyPart: "脚",
    record: "minutes",
    note: "旧称: サイクル",
    imageId: "c_bike",
  },
];

/** マシン（重量×回数） — 画像元: 24KYODO-MACHINE resistance_* */
export const MACHINE_ITEMS: CatalogItem[] = [
  {
    id: "m_chest_press",
    name: "チェストプレス",
    group: "machine",
    bodyPart: "胸",
    record: "weight_reps",
    imageId: "m_chest_press",
  },
  {
    id: "m_shoulder_press",
    name: "ショルダープレス",
    group: "machine",
    bodyPart: "肩",
    record: "weight_reps",
    imageId: "m_shoulder_press",
  },
  {
    id: "m_lat_pulldown",
    name: "ラットプルダウン",
    group: "machine",
    bodyPart: "背中",
    record: "weight_reps",
    imageId: "m_lat_pulldown",
  },
  {
    id: "m_row",
    name: "ロー",
    group: "machine",
    bodyPart: "背中",
    record: "weight_reps",
    imageId: "m_row",
  },
  {
    id: "m_leg_press",
    name: "レッグプレス",
    group: "machine",
    bodyPart: "脚",
    record: "weight_reps",
    imageId: "m_leg_press",
  },
  {
    id: "m_leg_ext",
    name: "レッグエクステンション",
    group: "machine",
    bodyPart: "脚",
    record: "weight_reps",
    imageId: "m_leg_ext",
  },
  {
    id: "m_leg_curl",
    name: "レッグカール",
    group: "machine",
    bodyPart: "脚",
    record: "weight_reps",
    imageId: "m_leg_curl",
  },
  {
    id: "m_abdominal",
    name: "アブドミナル",
    group: "machine",
    bodyPart: "腹",
    record: "weight_reps",
    imageId: "m_abdominal",
  },
  {
    id: "m_glute",
    name: "グルート",
    group: "machine",
    bodyPart: "脚",
    record: "weight_reps",
    imageId: "m_glute",
  },
  {
    id: "m_back_ext",
    name: "バックエクステンション",
    group: "machine",
    bodyPart: "背中",
    record: "weight_reps",
    imageId: "m_back_ext",
  },
  {
    id: "m_torso",
    name: "トルソーローテーション",
    group: "machine",
    bodyPart: "腹",
    record: "weight_reps",
    imageId: "m_torso",
  },
  {
    id: "m_pec_fly",
    name: "ペックフライ",
    group: "machine",
    bodyPart: "胸",
    record: "weight_reps",
    imageId: "m_pec_fly",
  },
  {
    id: "m_rear_delt",
    name: "リアデルト",
    group: "machine",
    bodyPart: "肩",
    record: "weight_reps",
    imageId: "m_rear_delt",
  },
  {
    id: "m_abduction",
    name: "アブダクション",
    group: "machine",
    bodyPart: "脚",
    record: "weight_reps",
    imageId: "m_abduction",
  },
  {
    id: "m_adduction",
    name: "アダクション",
    group: "machine",
    bodyPart: "脚",
    record: "weight_reps",
    imageId: "m_adduction",
  },
  {
    id: "m_crunch",
    name: "クランチ",
    group: "machine",
    bodyPart: "腹",
    record: "weight_reps",
    imageId: "m_crunch",
  },
];

/** フリーウェイト（重量×回数） */
export const FREEWEIGHT_ITEMS: CatalogItem[] = [
  { id: "f_squat", name: "スクワット", group: "freeweight", bodyPart: "脚", record: "weight_reps", imageId: "fw_squat" },
  { id: "f_deadlift", name: "デッドリフト", group: "freeweight", bodyPart: "背中", record: "weight_reps", imageId: "fw_deadlift" },
  { id: "f_rdl", name: "RDL", group: "freeweight", bodyPart: "脚", record: "weight_reps", imageId: "fw_deadlift" },
  { id: "f_bench", name: "ベンチプレス", group: "freeweight", bodyPart: "胸", record: "weight_reps", imageId: "fw_bench" },
  { id: "f_ohp", name: "オーバーヘッドプレス", group: "freeweight", bodyPart: "肩", record: "weight_reps", imageId: "fw_ohp" },
  { id: "f_smith_squat", name: "スミススクワット", group: "freeweight", bodyPart: "脚", record: "weight_reps", imageId: "fw_smith" },
  { id: "f_incline_press", name: "インクラインプレス", group: "freeweight", bodyPart: "胸", record: "weight_reps", imageId: "fw_bench" },
  { id: "f_db_press", name: "ダンベルプレス", group: "freeweight", bodyPart: "胸", record: "weight_reps", imageId: "fw_dumbbell" },
  { id: "f_db_shoulder", name: "ダンベルショルダープレス", group: "freeweight", bodyPart: "肩", record: "weight_reps", imageId: "fw_dumbbell" },
  { id: "f_db_curl", name: "ダンベルカール", group: "freeweight", bodyPart: "腕", record: "weight_reps", imageId: "fw_dumbbell" },
  { id: "f_side_raise", name: "サイドレイズ", group: "freeweight", bodyPart: "肩", record: "weight_reps", imageId: "fw_dumbbell" },
  { id: "f_incline_curl", name: "インクラインカール", group: "freeweight", bodyPart: "腕", record: "weight_reps", imageId: "fw_dumbbell" },
  { id: "f_pushdown", name: "プッシュダウン", group: "freeweight", bodyPart: "腕", record: "weight_reps", imageId: "fw_cable" },
  { id: "f_rope_pressdown", name: "ローププレスダウン", group: "freeweight", bodyPart: "腕", record: "weight_reps", imageId: "fw_cable" },
  { id: "f_cable_curl", name: "ケーブルカール", group: "freeweight", bodyPart: "腕", record: "weight_reps", imageId: "fw_cable" },
  { id: "f_cable_side", name: "ケーブルサイドレイズ", group: "freeweight", bodyPart: "肩", record: "weight_reps", imageId: "fw_cable" },
  { id: "f_seated_row", name: "シーテッドロー", group: "freeweight", bodyPart: "背中", record: "weight_reps", imageId: "fw_row" },
];

export const EXERCISE_CATALOG: CatalogItem[] = [
  ...CARDIO_ITEMS,
  ...MACHINE_ITEMS,
  ...FREEWEIGHT_ITEMS,
];

export function catalogByBodyPart(part: BodyPart): CatalogItem[] {
  return EXERCISE_CATALOG.filter((i) => i.bodyPart === part);
}

export function catalogByGroup(group: AreaGroup): CatalogItem[] {
  return EXERCISE_CATALOG.filter((i) => i.group === group);
}

export function machineImageSrc(
  item: Pick<CatalogItem, "imageId" | "group"> | undefined | null,
  size: "sm" | "md" = "md"
): string | null {
  const id = item?.imageId;
  if (!id) return null;
  const file = size === "sm" ? `${id}-sm.webp` : `${id}.webp`;
  return `/machines/${file}?v=2`;
}

export function isLineIcon(item: Pick<CatalogItem, "imageId" | "group"> | undefined | null): boolean {
  return Boolean(item?.imageId?.startsWith("fw_"));
}
