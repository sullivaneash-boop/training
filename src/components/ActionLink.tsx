import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'outline' | 'accent';

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white active:bg-accent-hover',
  secondary: 'bg-neutral-100 text-foreground active:bg-neutral-200',
  outline: 'border border-border bg-surface text-foreground active:bg-neutral-50',
  accent: 'border border-accent/30 bg-teal-50 text-accent active:bg-teal-100',
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
      className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl px-4 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.98] ${styles[variant]} ${className}`}
    >
      <span className="text-base font-semibold leading-tight">{children}</span>
      {sub && <span className="mt-0.5 text-sm font-normal opacity-80">{sub}</span>}
    </Link>
  );
}

export function ActionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
