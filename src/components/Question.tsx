import type { LucideIcon } from "lucide-react";

interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface RadioCardQuestionProps {
  label: string;
  options: readonly RadioCardOption[];
  value: string | null;
  onChange: (value: string) => void;
  name: string;
}

/** Single-select, card-style question. Supports an optional icon +
 * description per option for the highest-impact questions (degree level,
 * funding preference); plain cards otherwise. Real <input type="radio">
 * under the hood — visually hidden, not removed — so native keyboard
 * navigation and screen-reader behavior are untouched. */
export function RadioCardQuestion({ label, options, value, onChange, name }: RadioCardQuestionProps) {
  const hasIcons = options.some((o) => o.icon);

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-brand-ink">{label}</legend>
      <div className={`grid grid-cols-1 gap-2.5 ${hasIcons ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
        {options.map((opt) => {
          const checked = value === opt.value;
          const Icon = opt.icon;
          return (
            <label
              key={opt.value}
              className={`group relative flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-primary ${
                checked
                  ? "border-brand-primary bg-brand-primary/[0.04] shadow-card"
                  : "border-brand-border/12 bg-white hover:border-brand-primary/30 hover:bg-brand-primary/[0.02]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {Icon && (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    checked ? "bg-brand-primary text-white" : "bg-brand-primary/5 text-brand-primary"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
              )}
              <span className="flex flex-col">
                <span className={checked ? "font-semibold text-brand-primary" : "font-medium text-brand-ink"}>
                  {opt.label}
                </span>
                {opt.description && <span className="text-xs text-brand-muted">{opt.description}</span>}
              </span>
              {checked && (
                <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface CheckboxListQuestionProps {
  label: string;
  options: readonly RadioCardOption[];
  values: string[];
  onChange: (values: string[]) => void;
  name: string;
}

export function CheckboxListQuestion({ label, options, values, onChange, name }: CheckboxListQuestionProps) {
  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-brand-ink">{label}</legend>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-brand-border/12 bg-white p-2">
        {options.map((opt) => {
          const checked = values.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-primary ${
                checked ? "bg-brand-primary/5 font-medium text-brand-primary" : "text-brand-ink hover:bg-brand-background"
              }`}
            >
              <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 rounded border-brand-border/30 text-brand-primary focus:ring-brand-primary"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface NumberInputQuestionProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInputQuestion({ label, value, onChange, placeholder, min, max, step }: NumberInputQuestionProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-brand-ink">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={min}
        max={max}
        step={step ?? "any"}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-xl border border-brand-border/15 bg-white px-4 py-3 text-sm text-brand-ink transition focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
    </div>
  );
}
