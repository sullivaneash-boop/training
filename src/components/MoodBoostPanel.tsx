import { useState } from 'react';
import { Card } from './Card';
import { MotivationalLinks } from './MotivationalLinks';
import { PrimaryButton } from './PrimaryButton';
import { Label, Textarea } from './FormField';
import { useTrainingData } from '../hooks/useTrainingData';
import {
  buildDeepSeekContext,
  callDeepSeek,
  saveInsightFromResponse,
} from '../lib/deepseek';
import type { CoachResponse, MotivationalLink } from '../lib/types';
import { isAiEnabled } from '../lib/storage';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const START_PROMPT =
  'Start my mood check-in. Ask me a few short questions about how I am feeling, my energy, and what kind of boost I need today.';

export function MoodBoostPanel() {
  const { plan, athlete, workouts, readiness, settings, refresh } = useTrainingData();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [answers, setAnswers] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCoach, setLastCoach] = useState<CoachResponse | null>(null);
  const [links, setLinks] = useState<MotivationalLink[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);

  const gotAssistantReply = messages.some((m) => m.role === 'assistant');
  const awaitingAnswers = gotAssistantReply && links.length === 0 && !loading;
  const hasResults = links.length > 0 || (lastCoach?.keyFindings.length ?? 0) > 0;
  const questionsToShow =
    pendingQuestions.length > 0
      ? pendingQuestions
      : awaitingAnswers
        ? ['How are you feeling?', 'What kind of boost do you need today?']
        : [];

  async function sendToCoach(msgs: ChatMsg[]) {
    if (!isAiEnabled()) {
      setError('AI is disabled in Settings.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await callDeepSeek(
        {
          mode: 'mood_boost',
          messages: msgs,
          userQuestion: msgs[msgs.length - 1]?.content,
          ...buildDeepSeekContext({ plan, athlete, workouts, readiness }),
        },
        settings.deepseekModel,
      );

      const assistantText = result.assistantMessage ?? result.coach.summary;
      setMessages([...msgs, { role: 'assistant', content: assistantText }]);
      setLastCoach(result.coach);

      const newLinks = result.motivationalLinks ?? [];
      setLinks(newLinks);

      if (newLinks.length > 0) {
        setPendingQuestions([]);
        saveInsightFromResponse('mood_boost', result.coach, {
          planId: plan?.id,
          requestSummary: 'mood boost recommendations',
        });
        refresh();
      } else {
        setPendingQuestions(result.coach.questionsForUser);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    setMessages([]);
    setLinks([]);
    setLastCoach(null);
    setPendingQuestions([]);
    setAnswers('');
    void sendToCoach([{ role: 'user', content: START_PROMPT }]);
  }

  function handleSubmitAnswers() {
    const trimmed = answers.trim();
    if (!trimmed) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setAnswers('');
    setPendingQuestions([]);
    void sendToCoach(next);
  }

  function handleReset() {
    setMessages([]);
    setLinks([]);
    setLastCoach(null);
    setPendingQuestions([]);
    setAnswers('');
    setError(null);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div>
        <h2 className="app-heading text-lg text-foreground">Mood boost</h2>
        <p className="mt-1 text-sm text-muted">
          Quick check-in on how you&apos;re feeling — then music, videos, and quotes to reset.
        </p>
      </div>

      {messages.length === 0 && (
        <PrimaryButton type="button" disabled={loading} onClick={handleStart}>
          {loading ? 'Starting…' : 'Start check-in'}
        </PrimaryButton>
      )}

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-accent text-white'
                    : 'border border-border bg-background text-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-sm text-muted">Coach is thinking…</p>
          )}
        </div>
      )}

      {awaitingAnswers && (
        <div className="space-y-3">
          <Card className="bg-background">
            <p className="text-xs font-medium text-muted">Answer these</p>
            <ul className="mt-2 space-y-2 text-sm text-foreground">
              {questionsToShow.map((q) => (
                <li key={q}>· {q}</li>
              ))}
            </ul>
          </Card>
          <div>
            <Label>Your answers</Label>
            <Textarea
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              placeholder="Energy is low, stressed about work, need something upbeat…"
              className="min-h-[100px]"
            />
          </div>
          <PrimaryButton
            type="button"
            disabled={loading || !answers.trim()}
            onClick={handleSubmitAnswers}
          >
            {loading ? 'Finding picks…' : 'Get my boost'}
          </PrimaryButton>
        </div>
      )}

      {hasResults && lastCoach && (
        <div className="space-y-4">
          {lastCoach.keyFindings.length > 0 && (
            <Card className="bg-background">
              <p className="text-xs font-medium text-muted">Words to carry</p>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-foreground">
                {lastCoach.keyFindings.map((q) => (
                  <li key={q}>&ldquo;{q}&rdquo;</li>
                ))}
              </ul>
            </Card>
          )}
          {lastCoach.recommendedAction && (
            <p className="text-sm text-foreground">
              <span className="font-medium text-accent">Next: </span>
              {lastCoach.recommendedAction}
            </p>
          )}
          <MotivationalLinks links={links} />
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium text-muted underline"
          >
            Start over
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
