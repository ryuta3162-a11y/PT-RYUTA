export const MEMBER_KEY = "pt-ryuta-client";

export function normalizeMemberNo(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function isValidMemberNo(value: string): boolean {
  return /^\d{10}$/.test(normalizeMemberNo(value));
}

export function assertMemberNo(value: string): string {
  const memberNo = normalizeMemberNo(value);
  if (!isValidMemberNo(memberNo)) {
    throw new Error("会員番号は10桁の数字で入力してください");
  }
  return memberNo;
}

export function clearMemberSession() {
  localStorage.removeItem(MEMBER_KEY);
}

export function displayName(client: { nickname?: string; name: string }): string {
  const nick = String(client.nickname || "").trim();
  return nick || client.name;
}
