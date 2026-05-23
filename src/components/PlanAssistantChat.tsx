import { useEffect, useRef, useState } from 'react';
import { usePlanAssistant } from '../context/PlanAssistantContext';
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
import type { PlanPatch, TrainingPlan } from '../lib/types';
import { useTrainingData } from '../hooks/useTrainingData';
import { Button } from './FormField';

const QUICK_PROMPTS = [
  "I'm starting training later than planned",
  "I'm ahead of schedule — can we progress faster?",
  "I'm behind — need to adjust without cramming",
  'Change my race date',
  'Reduce volume this week — life got busy',
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

  if (!plan || !isAiEnabled()) return null;

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#4a53ff] text-white shadow-lg shadow-[#4a53ff]/40 transition-transform active:scale-95"
        aria-label="Open plan assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3C7.03 3 3 6.58 3 11c0 2.02.9 3.85 2.36 5.24L4 21l5.2-1.1C10.08 20.63 11.01 21 12 21c4.97 0 9-3.58 9-8s-4.03-8-9-8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black">
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 pt-safe-top">
            <div>
              <h2 className="text-base font-bold">Plan Assistant</h2>
              <p className="text-xs text-zinc-500">Shift dates · volume · schedule</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/10"
            >
              Close
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                <p className="text-zinc-200">Tell me what changed.</p>
                <p className="mt-2">
                  Example: &quot;Camping this week — push my start to June 1.&quot; When you
                  confirm a change, tap <strong className="text-white">Apply to my plan</strong>.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#4a53ff] text-white'
                        : 'border border-white/10 bg-white/5 text-zinc-200'
                    }`}
                  >
                    {m.content}
                    {m.hasPlanProposal && m.role === 'assistant' && (
                      <p className="mt-2 text-xs text-[#8b92ff]">↳ Tap Apply below to save</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-500">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {pendingPlan && (
              <div className="mt-4 space-y-2 rounded-xl border border-[#4a53ff]/40 bg-[#4a53ff]/10 p-4">
                <p className="text-sm font-semibold text-white">Apply plan changes?</p>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {(pendingPatch?.startDate ?? pendingPlan.startDate) && (
                    <li>Start: {pendingPatch?.startDate ?? pendingPlan.startDate}</li>
                  )}
                  {(pendingPatch?.raceDate ?? pendingPlan.raceDate) && (
                    <li>Race: {pendingPatch?.raceDate ?? pendingPlan.raceDate}</li>
                  )}
                  {pendingPatch?.shiftPhasesWeeksBy != null && (
                    <li>Phase shift: {pendingPatch.shiftPhasesWeeksBy} week(s)</li>
                  )}
                  {pendingPatch?.adaptationNote && <li>{pendingPatch.adaptationNote}</li>}
                </ul>
                <div className="flex gap-2 pt-1">
                  <Button type="button" onClick={applyPlan}>
                    Apply to my plan
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPendingPlan(null);
                      setPendingPatch(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-300">{error}</p>
                {lastFailedMessage && (
                  <button
                    type="button"
                    onClick={() => sendMessage(lastFailedMessage, true)}
                    className="text-sm font-medium text-[#4a53ff] underline"
                  >
                    Retry last message
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black px-4 py-3 pb-safe-bottom">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(p)}
                  className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-[#4a53ff]/50 hover:text-white disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
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
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#4a53ff] focus:outline-none"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => sendMessage(input)}
                className="shrink-0 self-end rounded-xl bg-[#4a53ff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <button
              type="button"
              onClick={handleClearChat}
              className="mt-2 text-[11px] text-zinc-600 underline"
            >
              Clear chat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
