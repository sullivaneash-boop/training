import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputClass =
  'w-full min-h-[48px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-neutral-400 shadow-[0_1px_2px_rgba(17,24,39,0.03)] transition-colors focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return <select className={`${inputClass} ${className}`} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`${inputClass} min-h-[96px] ${className}`} {...rest} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-muted">{children}</label>;
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const variants = {
    primary:
      'border border-transparent bg-accent text-white shadow-[0_8px_18px_rgba(13,148,136,0.26)] hover:bg-accent-hover focus-visible:ring-accent',
    ghost:
      'border border-border bg-surface text-foreground hover:bg-neutral-50 focus-visible:ring-accent',
    danger:
      'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-500',
  };
  return (
    <button
      className={`min-h-[48px] w-full rounded-2xl px-4 py-3 text-base font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-lg font-semibold tabular-nums text-accent">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="h-2 w-full"
      />
    </div>
  );
}
