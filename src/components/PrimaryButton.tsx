import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warning';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover active:bg-accent-hover focus-visible:ring-accent',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-neutral-50 active:bg-neutral-100',
  ghost:
    'border border-transparent bg-transparent text-foreground hover:bg-neutral-100 active:bg-neutral-200',
  warning:
    'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 active:bg-amber-100',
};

export function PrimaryButton({
  children,
  variant = 'primary',
  fullWidth = true,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={`min-h-[48px] rounded-xl px-4 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
