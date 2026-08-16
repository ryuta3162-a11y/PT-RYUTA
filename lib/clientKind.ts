import type { Client } from "@/lib/types";

/** 会員マスタ「メモ」が PT のときパーソナルトレーナー対象 */
export function isPtClient(client: {
  notes?: string | null;
}): boolean {
  return String(client.notes || "")
    .trim()
    .toUpperCase() === "PT";
}

export function recordPathForClient(client: {
  notes?: string | null;
}): "/ops/pt" | "/ops/session" {
  return isPtClient(client) ? "/ops/pt" : "/ops/session";
}

/** URL・セッション紐づけ用。id 空の手入力行は会員番号を使う */
export function clientRouteKey(client: {
  id?: string | null;
  code?: string | null;
}): string {
  return String(client.id || client.code || "").trim();
}

export function findClientByRouteKey(
  clients: Client[],
  key: string
): Client | undefined {
  const k = String(key || "").trim();
  if (!k) return undefined;
  return clients.find(
    (c) => c.id === k || c.code === k || clientRouteKey(c) === k
  );
}

export function toActiveClient(c: Client) {
  return {
    id: clientRouteKey(c) || c.id,
    name: c.name,
    code: c.code,
    notes: c.notes || "",
  };
}
