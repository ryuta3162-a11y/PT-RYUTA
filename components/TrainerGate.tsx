import type { ReactNode } from "react";

/** スタッフは /ops URL だけで入れる（PINなし） */
export function TrainerGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
