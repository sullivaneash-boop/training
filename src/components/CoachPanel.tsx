import { useState } from 'react';
import type { CoachResponse } from '../lib/types';
import { Card } from './Card';
import { Button } from './FormField';

function signalColor(signal: string): string {
  switch (signal) {
    case 'green':
      return 'text-[#1f7b5d]';
    case 'yellow':
      return 'text-[#8a6545]';
    case 'red':
      return 'text-[#9a4f47]';
    default:
      return 'text-foreground';
  }
}

export function CoachPanel({
  response,
  loading,
  error,
  rawJson,
  showDebug,
  onDismiss,
}: {
  response: CoachResponse | null;
  loading: boolean;
  error: string | null;
  rawJson?: string | null;
  showDebug?: boolean;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <p className="text-sm text-muted">Coach thinking…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-[#edcfcd] bg-[#f9efee]">
        <p className="text-sm text-[#9a4f47]">{error}</p>
        <p className="mt-1 text-sm text-muted">App still works — try again or check API key.</p>
      </Card>
    );
  }

  if (!response) return null;

  async function copyResponse() {
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="space-y-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted">{response.mode.replace(/_/g, ' ')}</p>
          <p className={`app-heading text-xs uppercase ${signalColor(response.signal)}`}>
            {response.signal}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyResponse}
            className="text-sm text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="text-sm text-muted">
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted">Summary</p>
        <p className="text-sm leading-relaxed text-foreground">{response.summary}</p>
      </div>

      {response.keyFindings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Key findings</p>
          <ul className="mt-1 space-y-1 text-sm text-foreground/90">
            {response.keyFindings.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted">Recommended action</p>
        <p className="text-sm font-medium text-accent">{response.recommendedAction}</p>
      </div>

      {response.adjustments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Adjustments</p>
          <ul className="mt-1 space-y-2 text-sm">
            {response.adjustments.map((a, i) => (
              <li key={i} className="rounded-xl border border-border bg-background p-2.5">
                <span className="text-xs font-medium uppercase text-muted">{a.priority}</span>
                <p className="text-foreground">{a.action}</p>
                <p className="text-xs text-muted">{a.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.warningFlags.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Warnings</p>
          <ul className="text-sm text-[#8a6545]">
            {response.warningFlags.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {response.questionsForUser.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Questions for you</p>
          <ul className="text-sm text-muted">
            {response.questionsForUser.map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {showDebug && rawJson && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">Raw JSON debug</summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-neutral-100 p-2 text-neutral-700">
            {rawJson}
          </pre>
        </details>
      )}
    </Card>
  );
}

export function AskDeepSeekButton({
  label,
  onClick,
  loading,
  disabled,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} disabled={loading || disabled}>
      {loading ? '…' : label}
    </Button>
  );
}
