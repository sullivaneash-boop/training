import { useState } from 'react';
import type { CoachResponse } from '../lib/types';
import { Card } from './Card';
import { Button } from './FormField';

function signalColor(signal: string): string {
  switch (signal) {
    case 'green':
      return 'text-emerald-400';
    case 'yellow':
      return 'text-amber-400';
    case 'red':
      return 'text-red-400';
    default:
      return 'text-zinc-300';
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
        <p className="text-sm text-zinc-400">DeepSeek thinking…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30">
        <p className="text-sm text-red-400">{error}</p>
        <p className="mt-1 text-xs text-zinc-500">App still works — try again or check API key.</p>
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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-zinc-500">{response.mode}</p>
          <p className={`text-sm font-bold uppercase ${signalColor(response.signal)}`}>
            {response.signal}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyResponse}
            className="text-xs text-[#4a53ff] underline"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="text-xs text-zinc-500">
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs text-zinc-500">Summary</p>
        <p className="text-sm leading-relaxed text-zinc-200">{response.summary}</p>
      </div>

      {response.keyFindings.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500">Key findings</p>
          <ul className="mt-1 space-y-1 text-sm text-zinc-300">
            {response.keyFindings.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs text-zinc-500">Recommended action</p>
        <p className="text-sm font-medium text-[#4a53ff]">{response.recommendedAction}</p>
      </div>

      {response.adjustments.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500">Adjustments</p>
          <ul className="mt-1 space-y-2 text-sm">
            {response.adjustments.map((a, i) => (
              <li key={i} className="rounded-lg bg-black/40 p-2">
                <span className="text-xs uppercase text-zinc-500">{a.priority}</span>
                <p className="text-zinc-200">{a.action}</p>
                <p className="text-xs text-zinc-500">{a.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.warningFlags.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500">Warnings</p>
          <ul className="text-sm text-amber-400">
            {response.warningFlags.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        </div>
      )}

      {response.questionsForUser.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500">Questions for you</p>
          <ul className="text-sm text-zinc-400">
            {response.questionsForUser.map((q) => (
              <li key={q}>· {q}</li>
            ))}
          </ul>
        </div>
      )}

      {showDebug && rawJson && (
        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-500">Raw JSON debug</summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-black p-2 text-zinc-400">
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
