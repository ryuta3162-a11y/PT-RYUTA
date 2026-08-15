"use client";

type Props = {
  value: string;
  onChange: (next: string) => void;
  step: number;
  min?: number;
  max?: number;
  unit: string;
  label: string;
  disabled?: boolean;
  /** 空のとき + で入れる初期値（未指定なら step） */
  startAt?: number;
};

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function StepField({
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  unit,
  label,
  disabled,
  startAt,
}: Props) {
  function bump(dir: 1 | -1) {
    if (disabled) return;
    const cur = toNumber(value);
    let next: number;
    if (cur == null) {
      next = dir > 0 ? startAt ?? step : min;
    } else {
      next = cur + dir * step;
      if (step > 1) {
        next = Math.round(next / step) * step;
      }
    }
    next = Math.min(max, Math.max(min, next));
    onChange(String(next));
  }

  return (
    <div className="step-field">
      <span className="step-field-label">{label}</span>
      <div className="step-field-row">
        <button
          type="button"
          className="step-btn"
          aria-label={`${label}を減らす`}
          disabled={disabled}
          onClick={() => bump(-1)}
        >
          −
        </button>
        <div className="step-field-value">
          <input
            inputMode="decimal"
            value={value}
            disabled={disabled}
            onChange={(e) =>
              onChange(e.target.value.replace(/[^\d.]/g, ""))
            }
            aria-label={label}
            placeholder="0"
          />
          <em>{unit}</em>
        </div>
        <button
          type="button"
          className="step-btn"
          aria-label={`${label}を増やす`}
          disabled={disabled}
          onClick={() => bump(1)}
        >
          ＋
        </button>
      </div>
    </div>
  );
}
