export function ActionCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-[0.99] ${
        selected
          ? 'border-accent bg-teal-50/80'
          : 'border-border bg-surface hover:border-neutral-300'
      }`}
    >
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </button>
  );
}
