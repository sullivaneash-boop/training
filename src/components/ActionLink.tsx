import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'outline' | 'accent';

const styles: Record<Variant, string> = {
  primary:
    'border border-transparent bg-accent text-white shadow-[0_8px_18px_rgba(13,148,136,0.26)] hover:bg-accent-hover active:bg-accent-hover',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-neutral-50 active:bg-neutral-100',
  outline:
    'border border-border bg-surface text-foreground shadow-[0_1px_2px_rgba(17,24,39,0.04)] hover:border-neutral-300 active:bg-neutral-50',
  accent:
    'border border-accent/25 bg-teal-50 text-accent hover:bg-teal-100 active:bg-teal-100',
};

export function ActionLink({
  to,
  children,
  sub,
  variant = 'primary',
  className = '',
}: {
  to: string;
  children: ReactNode;
  sub?: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`flex min-h-[52px] flex-col items-center justify-center rounded-2xl px-4 py-3 text-center text-[15px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 ${styles[variant]} ${className}`}
    >
      <span className="text-base font-semibold leading-tight">{children}</span>
      {sub && <span className="mt-0.5 text-sm font-normal opacity-80">{sub}</span>}
    </Link>
  );
}

export function ActionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
