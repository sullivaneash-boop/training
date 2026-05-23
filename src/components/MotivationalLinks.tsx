import type { MotivationalLink } from '../lib/types';

const TYPE_LABELS: Record<MotivationalLink['type'], string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  quote: 'Quote',
  other: 'Link',
};

export function MotivationalLinks({ links }: { links: MotivationalLink[] }) {
  if (!links.length) return null;

  return (
    <div className="space-y-2">
      <p className="section-label">Picked for you</p>
      <ul className="space-y-2">
        {links.map((link, i) => (
          <li key={`${link.type}-${link.title}-${i}`}>
            {link.type === 'quote' || !link.url ? (
              <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Quote</p>
                <p className="mt-1 text-base leading-relaxed text-foreground">&ldquo;{link.title}&rdquo;</p>
                {link.note && <p className="mt-2 text-sm text-muted">{link.note}</p>}
              </div>
            ) : (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] flex-col justify-center rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-xs font-medium text-accent">
                  {TYPE_LABELS[link.type]}
                </span>
                <span className="mt-0.5 text-base font-semibold text-foreground">{link.title}</span>
                {link.note && <span className="mt-1 text-sm text-muted">{link.note}</span>}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
