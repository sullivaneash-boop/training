import type { ReactNode } from 'react';

export function ActionCard({
  icon,
  title,
  description,
  actionLabel = 'Open',
  selected,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.99] ${
        selected
          ? 'border-accent/40 bg-teal-50/80'
          : 'border-border bg-surface hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-muted">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="app-heading text-[15px] text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-accent">{actionLabel} →</span>
      </div>
    </button>
  );
}
