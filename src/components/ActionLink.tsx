import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'outline' | 'accent';

const styles: Record<Variant, string> = {
  primary: 'bg-[#4a53ff] text-white active:bg-[#3d46e0]',
  secondary: 'bg-white/10 text-white active:bg-white/15',
  outline: 'border border-white/25 bg-transparent text-white active:bg-white/5',
  accent: 'bg-white text-black active:bg-zinc-200',
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
      className={`flex min-h-[52px] flex-col items-center justify-center rounded-2xl px-4 py-3.5 text-center transition-colors ${styles[variant]} ${className}`}
    >
      <span className="text-sm font-semibold leading-tight">{children}</span>
      {sub && <span className="mt-0.5 text-[11px] font-normal opacity-80">{sub}</span>}
    </Link>
  );
}

export function ActionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
