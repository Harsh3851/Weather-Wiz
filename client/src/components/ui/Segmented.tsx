import { clsx } from 'clsx';
import { useId, type KeyboardEvent } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Accessible single-choice toggle group (radio group semantics, arrow-key navigation). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  hideLabel,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  hideLabel?: boolean;
}) {
  const id = useId();
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((o) => o.value === value);
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + options.length) % options.length;
    else return;
    e.preventDefault();
    const option = options[next]!;
    onChange(option.value);
    (e.currentTarget.querySelectorAll('[role="radio"]')[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        onKeyDown={onKeyDown}
        className="inline-flex w-fit rounded-xl border border-border bg-surface-2 p-0.5"
      >
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.value)}
              className={clsx(
                'whitespace-nowrap rounded-[10px] font-medium transition-colors',
                size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
                checked ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
