const STAFF_PIN_KEY = "ry-log-ops-pin";

export function saveStaffPin(pin: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STAFF_PIN_KEY, pin.trim());
}

export function loadStaffPin(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STAFF_PIN_KEY) || "";
}

export function clearStaffPin() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STAFF_PIN_KEY);
}
