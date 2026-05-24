import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border/90 bg-background/90 px-4 py-2 backdrop-blur-md pt-safe-top">
        <Link to="/" className="inline-flex items-center gap-2 focus-visible:outline-none">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/35 bg-surface">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-accent border-r-transparent border-t-transparent" />
          </span>
          <span className="tempo-wordmark text-sm text-foreground">Tempo</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
