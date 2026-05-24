import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[31px] font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
