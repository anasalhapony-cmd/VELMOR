'use client';

import { Minus, Plus } from 'lucide-react';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded border border-ink/20">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center text-ink disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="إنقاص الكمية"
      >
        <Minus size={16} />
      </button>
      <span className="w-10 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center text-ink disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="زيادة الكمية"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
