export type DropStep = {
  weight: string;
  reps: string;
};

const PREFIX = "DROPSET ";

export function isDropSetMemo(memo?: string | null): boolean {
  return String(memo || "").trim().startsWith("DROPSET");
}

export function encodeDropSet(
  steps: DropStep[],
  withWeight: boolean
): string {
  const chain = steps
    .filter((s) => s.reps)
    .map((s) =>
      withWeight && s.weight ? `${s.weight}kg×${s.reps}` : `${s.reps}回`
    )
    .join(" → ");
  return `${PREFIX}${chain}`.trim();
}

export function parseDropSet(memo?: string | null): DropStep[] {
  const raw = String(memo || "").trim();
  if (!raw.startsWith("DROPSET")) return [];
  const body = raw.replace(/^DROPSET\s*/, "").split("|")[0].trim();
  if (!body) return [];
  return body.split(/\s*→\s*/).map((part) => {
    const kg = part.match(/^([\d.]+)\s*kg\s*[×x]\s*(\d+)/i);
    if (kg) return { weight: kg[1], reps: kg[2] };
    const reps = part.match(/^(\d+)\s*回?/);
    return { weight: "", reps: reps?.[1] || "" };
  }).filter((s) => s.reps);
}

export function dropSetLabel(memo?: string | null): string {
  return String(memo || "")
    .trim()
    .replace(/^DROPSET\s*/, "")
    .split("|")[0]
    .trim();
}
