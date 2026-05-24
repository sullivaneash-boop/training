import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warning';

const variants: Record<Variant, string> = {
  primary:
    'border border-transparent bg-accent text-white shadow-[0_8px_18px_rgba(13,148,136,0.26)] hover:bg-accent-hover active:bg-accent-hover focus-visible:ring-accent',
  secondary:
    'border border-border bg-surface text-foreground shadow-[0_1px_2px_rgba(17,24,39,0.04)] hover:bg-neutral-50 active:bg-neutral-100',
  ghost:
    'border border-transparent bg-transparent text-foreground hover:bg-neutral-100 active:bg-neutral-200',
  warning:
    'border border-[#efd7c3] bg-[#faf4ee] text-[#8a6545] hover:bg-[#f7eadf] active:bg-[#f7eadf]',
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
      className={`min-h-[50px] rounded-2xl px-4 py-3 text-base font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
