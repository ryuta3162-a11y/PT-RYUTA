/** スタッフ画面は URL（/ops）分離のみ。PIN入力はしない */

export function staffAuth(): { staff: true } {
  return { staff: true };
}

/** @deprecated staffAuth() を使う */
export function loadStaffPin(): string {
  return "";
}

export function saveStaffPin(_pin: string) {}

export function clearStaffPin() {}
