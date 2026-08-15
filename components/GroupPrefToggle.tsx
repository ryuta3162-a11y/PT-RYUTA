"use client";

import type { AreaGroup } from "@/lib/exerciseCatalog";
import type { GroupPrefs } from "@/lib/trainingPrefs";

const OPTIONS: {
  id: AreaGroup;
  mark: string;
  title: string;
}[] = [
  { id: "cardio", mark: "C", title: "Cardio" },
  { id: "machine", mark: "R", title: "Resistance" },
  { id: "freeweight", mark: "F", title: "Free Weight" },
];

type Props = {
  value: GroupPrefs;
  onChange: (next: GroupPrefs) => void;
  compact?: boolean;
};

export function GroupPrefToggle({ value, onChange, compact }: Props) {
  function toggle(id: AreaGroup) {
    onChange({ ...value, [id]: !value[id] });
  }

  return (
    <div className={compact ? "group-pref compact" : "group-pref"}>
      <p className="group-pref-title">CRF</p>
      <div className="group-pref-grid">
        {OPTIONS.map((opt) => {
          const on = value[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              className={on ? "group-pref-card on" : "group-pref-card"}
              onClick={() => toggle(opt.id)}
              aria-pressed={on}
            >
              <span className="group-pref-mark" aria-hidden>
                {opt.mark}
              </span>
              <span className="group-pref-name">{opt.title}</span>
            </button>
          );
        })}
      </div>
      {!value.cardio && !value.machine && !value.freeweight ? (
        <p className="notice">C / R / F を1つ以上選んでください</p>
      ) : null}
    </div>
  );
}
