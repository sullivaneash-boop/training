import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlanAssistant } from '../context/PlanAssistantContext';
import { useTrainingData } from '../hooks/useTrainingData';
import { callDeepSeek, DeepSeekClientError } from '../lib/deepseek';
import { inferPlanPatchFromText, normalizePlanPatch } from '../lib/planPatchInfer';
import { validatePlan } from '../lib/planParser';
import {
  appendChatMessage,
  applyPlanPatch,
  clearChatSession,
  isAiEnabled,
  loadChatSession,
  mergePlanUpdate,
  savePlan,
} from '../lib/storage';
import { daysUntilRace, getPhaseLabel, getWeekNumber, getWeekPlan } from '../lib/weekUtils';
import type { PlanPatch, TrainingPlan } from '../lib/types';
import { Button } from './FormField';

const QUICK_CHIPS = [
  'Starting later',
  'Missed workouts',
  'Feeling beat up',
  'Ahead of schedule',
  'Travel/camping week',
  'Shoulder feels off',
];

const CHIP_TO_PROMPT: Record<string, string> = {
  'Starting later': "I'm starting later than planned. Can you shift my start safely?",
  'Missed workouts': "I missed a few workouts this week. Please adjust without cramming.",
  'Feeling beat up': "I'm feeling beat up this week and need a safer volume adjustment.",
  'Ahead of schedule': "I'm ahead of schedule. Can we progress a little faster safely?",
  'Travel/camping week': "I have a travel/camping week coming up. Help me adapt that week.",
  'Shoulder feels off': 'My shoulder feels off. Suggest changes to reduce risk.',
};

const EMPTY_PROMPT_SUGGESTIONS = [
  'Push my start to June 1 — camping this week',
  'Missed Tue + Thu workouts, keep weekend long session',
  'Reduce this week volume 20% but keep race date',
];

function applyPatchOrPlan(
  plan: TrainingPlan,
  patch: PlanPatch | null,
  fullPlan: TrainingPlan | undefined,
): { merged: TrainingPlan; patch: PlanPatch | null } {
  if (patch) {
    return { merged: applyPlanPatch(plan, patch), patch };
  }
  if (fullPlan) {
    return { merged: mergePlanUpdate(plan, { ...fullPlan, id: plan.id }), patch: null };
  }
  return { merged: plan, patch: null };
}

export function PlanAssistantChat() {
  const { plan, athlete, workouts, readiness, settings, updatePlan, refresh } = useTrainingData();
  const { isOpen: open, setOpen, close } = usePlanAssistant();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<TrainingPlan | null>(null);
  const [pendingPatch, setPendingPatch] = useState<PlanPatch | null>(null);
  const [messages, setMessages] = useState(() =>
    plan ? loadChatSession(plan.id).messages : [],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (plan) setMessages(loadChatSession(plan.id).messages);
  }, [plan?.id]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!plan || !isAiEnabled()) return null;
  const showFab = location.pathname !== '/coach' && !open;
  const weekNum = getWeekNumber(plan);
  const weekPlan = getWeekPlan(plan, weekNum);
  const daysLeft = daysUntilRace(plan);
  const phaseLabel = getPhaseLabel(weekPlan?.phase);

  async function sendMessage(text: string, isRetry = false) {
    const trimmed = text.trim();
    if (!trimmed || loading || !plan) return;

    setError(null);
    if (!isRetry) {
      setPendingPlan(null);
      setPendingPatch(null);
      setLastFailedMessage(null);
      setInput('');
      appendChatMessage(plan.id, { role: 'user', content: trimmed });
    }
    setLoading(true);

    const history = [...loadChatSession(plan.id).messages];
    setMessages(history);

    try {
      const result = await callDeepSeek(
        {
          mode: 'plan_assistant',
          plan,
          athleteProfile: athlete ?? undefined,
          workoutLogs: workouts,
          readinessChecks: readiness,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          date: new Date().toISOString().slice(0, 10),
        },
        settings.deepseekModel,
      );

      let patch = result.planPatch ? normalizePlanPatch(result.planPatch) : null;
      if (!patch && !result.plan) {
        patch = inferPlanPatchFromText(trimmed, plan);
      }

      const reply =
        result.assistantMessage ?? result.coach.summary ?? 'Done — see details below.';
      const hasChange = Boolean(patch || result.plan);

      appendChatMessage(plan.id, {
        role: 'assistant',
        content: reply,
        hasPlanProposal: hasChange,
      });
      setMessages(loadChatSession(plan.id).messages);

      if (hasChange) {
        const { merged, patch: usedPatch } = applyPatchOrPlan(plan, patch, result.plan);
        setPendingPatch(usedPatch);
        setPendingPlan(merged);
      }
    } catch (e) {
      const inferred = inferPlanPatchFromText(trimmed, plan);
      if (e instanceof DeepSeekClientError) {
        setError(e.message);
        setLastFailedMessage(trimmed);
        if (inferred) {
          setPendingPatch(inferred);
          setPendingPlan(applyPlanPatch(plan, inferred));
          appendChatMessage(plan.id, {
            role: 'assistant',
            content:
              'The coach had a hiccup parsing its reply, but I detected your date change locally. Review and apply below if it looks right.',
            hasPlanProposal: true,
          });
          setMessages(loadChatSession(plan.id).messages);
          setError(null);
        }
      } else {
        setError(e instanceof Error ? e.message : 'Could not reach coach');
        setLastFailedMessage(trimmed);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function buildProposalSummary() {
    if (!pendingPlan || !plan) return null;
    const changes: string[] = [];
    const unchanged: string[] = [
      'Logged workouts and history remain unchanged.',
      'Your plan structure stays intact unless listed below.',
    ];
    const warnings: string[] = [];

    const nextStart = pendingPatch?.startDate ?? pendingPlan.startDate;
    const nextRace = pendingPatch?.raceDate ?? pendingPlan.raceDate;
    if (nextStart && nextStart !== plan.startDate) {
      changes.push(`Start date moves from ${plan.startDate ?? 'unset'} to ${nextStart}.`);
    }
    if (nextRace && nextRace !== plan.raceDate) {
      changes.push(`Race date moves from ${plan.raceDate ?? 'unset'} to ${nextRace}.`);
    }
    if (pendingPatch?.shiftPhasesWeeksBy) {
      const direction = pendingPatch.shiftPhasesWeeksBy > 0 ? 'later' : 'earlier';
      changes.push(
        `Phase progression shifts ${Math.abs(pendingPatch.shiftPhasesWeeksBy)} week(s) ${direction}.`,
      );
      warnings.push('Phase shifts can alter peak timing; watch fatigue and long-session quality.');
    }
    if (pendingPatch?.adaptationNote) {
      changes.push(pendingPatch.adaptationNote);
    }
    if (!changes.length) {
      changes.push('Coach proposed a schedule adjustment for the current plan window.');
    }
    if (nextRace && plan.raceDate && nextRace < plan.raceDate) {
      warnings.push('Earlier race timing can compress build weeks and increase recovery risk.');
    }
    if (!warnings.length) {
      warnings.push('Review the next 10 days before applying to confirm load feels sustainable.');
    }

    return { changes, unchanged, warnings };
  }

  const proposalSummary = buildProposalSummary();
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  function applyPlan() {
    if (!pendingPlan || !plan) return;
    const errors = validatePlan(pendingPlan);
    if (errors.length > 2) {
      setError(`Plan validation: ${errors.join(', ')}`);
      return;
    }
    savePlan(pendingPlan);
    updatePlan(pendingPlan);
    setPendingPlan(null);
    setPendingPatch(null);
    appendChatMessage(plan.id, {
      role: 'assistant',
      content: 'Plan updated. Today and Week views reflect your new schedule.',
    });
    setMessages(loadChatSession(plan.id).messages);
    refresh();
  }

  function handleClearChat() {
    if (!plan) return;
    if (!confirm('Clear this conversation?')) return;
    clearChatSession(plan.id);
    setMessages([]);
    setPendingPlan(null);
    setPendingPatch(null);
    setError(null);
    setLastFailedMessage(null);
  }

  return (
    <>
      {showFab && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.8rem)] right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent text-white shadow-[0_8px_22px_rgba(13,148,136,0.35)] transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Open plan assistant"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3C7.03 3 3 6.58 3 11c0 2.02.9 3.85 2.36 5.24L4 21l5.2-1.1C10.08 20.63 11.01 21 12 21c4.97 0 9-3.58 9-8s-4.03-8-9-8z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-200 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/28 backdrop-blur-[2px]" onClick={close} />

        <section
          className={`relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_16px_48px_rgba(17,24,39,0.22)] transition-all duration-200 ${
            open ? 'max-h-[70vh] scale-100' : 'max-h-[70vh] scale-[0.97]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Plan Assistant"
        >
          <header className="flex shrink-0 items-start justify-between border-b border-border px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Plan Assistant</h2>
                <span className="h-2 w-2 rounded-full bg-accent/75" aria-label="AI enabled" />
              </div>
              <p className="text-xs text-muted">Shift dates · adjust volume · fix schedule</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-transparent px-2 py-1.5 text-sm text-muted transition-colors hover:border-border hover:bg-neutral-50"
            >
              Close
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3.5">
            <div className="mb-3.5 rounded-2xl border border-border bg-background p-3.5">
              <p className="text-sm font-medium text-foreground">
                Tell me what changed. I&apos;ll suggest a safe adjustment before applying anything.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                <p>
                  Week: <span className="font-medium text-foreground">{weekNum}</span>
                </p>
                <p>
                  Phase: <span className="font-medium text-foreground">{phaseLabel}</span>
                </p>
                <p>
                  Race: <span className="font-medium text-foreground">{daysLeft ?? '—'} days out</span>
                </p>
                <p>
                  Plan: <span className="font-medium text-foreground">{plan.name}</span>
                </p>
              </div>
            </div>

            <div className="-mx-0.5 mb-3.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(CHIP_TO_PROMPT[chip] ?? chip)}
                  className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-45"
                >
                  {chip}
                </button>
              ))}
            </div>

            {messages.length === 0 && (
              <div className="mb-4 rounded-2xl border border-dashed border-border bg-background px-3 py-3">
                <p className="text-sm font-medium text-foreground">Try one of these:</p>
                <div className="mt-2 space-y-1.5">
                  {EMPTY_PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="block w-full rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm text-muted transition-colors hover:border-accent/35 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-accent text-white shadow-[0_6px_16px_rgba(13,148,136,0.28)]'
                        : 'border border-border bg-surface text-foreground'
                    }`}
                  >
                    {m.content}
                    {m.hasPlanProposal && m.role === 'assistant' && (
                      <p className="mt-2 text-xs font-medium text-accent">
                        Proposal ready. Review summary before applying.
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-muted">
                    Working on a safe adjustment…
                  </div>
                </div>
              )}
            </div>

            {pendingPlan && proposalSummary && (
              <div className="mt-4 space-y-3 rounded-2xl border border-accent/30 bg-teal-50/65 p-3.5">
                <p className="text-sm font-semibold text-foreground">Proposed change summary</p>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">What changes</p>
                    <ul className="mt-1 space-y-0.5 text-muted">
                      {proposalSummary.changes.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">What stays the same</p>
                    <ul className="mt-1 space-y-0.5 text-muted">
                      {proposalSummary.unchanged.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Risk / warning</p>
                    <ul className="mt-1 space-y-0.5 text-muted">
                      {proposalSummary.warnings.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <Button type="button" onClick={applyPlan}>
                    Apply to my plan
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPendingPlan(null);
                      setPendingPatch(null);
                      setInput(lastUserMessage);
                      inputRef.current?.focus();
                    }}
                  >
                    Edit request
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setPendingPlan(null);
                      setPendingPatch(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm text-rose-800">{error}</p>
                {lastFailedMessage && (
                  <button
                    type="button"
                    onClick={() => sendMessage(lastFailedMessage, true)}
                    className="text-sm font-medium text-accent underline"
                  >
                    Retry last message
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="e.g. Push start to June 1 — camping this week"
                rows={2}
                className="min-h-[46px] flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-neutral-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => sendMessage(input)}
                className="shrink-0 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(13,148,136,0.26)] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Send
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearChat}
                className="text-xs text-muted underline underline-offset-2"
              >
                Clear chat
              </button>
              {!pendingPlan && (
                <p className="text-[11px] text-muted">
                  Suggestions only — nothing applies until you confirm.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
