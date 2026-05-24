import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button, Input, Textarea } from '../components/FormField';
import { useTrainingData } from '../hooks/useTrainingData';
import type {
  ConstraintType,
  CurrentTrainingFrequency,
  GoalType,
  HealthPermissionKey,
  OnboardingState,
  PlanIntensityPreference,
  PlanPriority,
  WeeklyAvailability,
} from '../lib/types';

type Step = 'welcome' | 'goal' | 'starting_point' | 'building' | 'review' | 'health' | 'tour';

const GOAL_OPTIONS: { id: GoalType; title: string; note: string }[] = [
  { id: 'race_event', title: 'Race or event', note: 'A specific event with a date.' },
  { id: 'general_fitness', title: 'General fitness', note: 'Build aerobic fitness and consistency.' },
  { id: 'strength', title: 'Strength', note: 'Maintain or improve strength blocks.' },
  { id: 'hybrid_training', title: 'Hybrid training', note: 'Blend endurance and strength work.' },
  { id: 'recovery_return', title: 'Recovery / return', note: 'Come back safely after time off.' },
  { id: 'not_sure', title: 'Not sure yet', note: 'Tempo can suggest a conservative start.' },
];

const FREQUENCY_OPTIONS: { id: CurrentTrainingFrequency; label: string }[] = [
  { id: 'not_consistent', label: 'Not consistently' },
  { id: '1_2_days', label: '1–2 days/week' },
  { id: '3_4_days', label: '3–4 days/week' },
  { id: '5_plus_days', label: '5+ days/week' },
  { id: 'coming_back', label: 'Coming back after time off' },
];

const PRIORITY_OPTIONS: { id: PlanPriority; label: string }[] = [
  { id: 'finish_strong', label: 'Finish strong' },
  { id: 'get_faster', label: 'Get faster' },
  { id: 'build_consistency', label: 'Build consistency' },
  { id: 'avoid_injury', label: 'Avoid injury' },
  { id: 'body_composition', label: 'Improve body composition' },
  { id: 'balance_strength_endurance', label: 'Balance strength + endurance' },
];

const AVAILABILITY_OPTIONS: WeeklyAvailability[] = ['2', '3', '4', '5', '6_plus'];

const CONSTRAINT_OPTIONS: { id: ConstraintType; label: string }[] = [
  { id: 'injury_pain', label: 'Injury or pain' },
  { id: 'limited_equipment', label: 'Limited equipment' },
  { id: 'busy_schedule', label: 'Busy schedule' },
  { id: 'low_recovery', label: 'Low recovery' },
  { id: 'travel', label: 'Travel' },
  { id: 'no_constraints', label: 'No constraints' },
];

const INTENSITY_OPTIONS: { id: PlanIntensityPreference; label: string }[] = [
  { id: 'conservative', label: 'Conservative' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'flexible', label: 'Flexible week-to-week' },
];

const BUILDING_ITEMS = [
  'Reading your goal',
  'Estimating your timeline',
  'Balancing training load',
  'Adding recovery space',
  'Preparing your first week',
];

const TOUR_STEPS = [
  { title: 'Dashboard', body: 'Your daily training briefing lives here.' },
  { title: 'Plan', body: 'Your plan adapts around reality, not perfect weeks.' },
  { title: 'Insights', body: 'Track trendlines instead of one-off numbers.' },
  { title: 'Coach', body: 'Ask for adjustments anytime from Coach.' },
  { title: 'Start plan', body: "You're ready to start and move into Week 1." },
];

function parseGoalInput(text: string) {
  const trimmed = text.trim();
  const eventUrl = trimmed.match(/https?:\/\/\S+/i)?.[0];
  const dateGuess = new Date(trimmed);
  const eventDate = Number.isNaN(dateGuess.getTime()) ? undefined : dateGuess.toISOString().slice(0, 10);
  const lower = trimmed.toLowerCase();
  const sport = lower.includes('tri')
    ? 'triathlon'
    : lower.includes('run')
      ? 'run'
      : lower.includes('bike') || lower.includes('cycle')
        ? 'bike'
        : lower.includes('swim')
          ? 'swim'
          : lower.includes('strength')
            ? 'strength'
            : undefined;
  const distance = trimmed.match(
    /\b(\d+(?:\.\d+)?)\s?(k|km|mi|miles?|marathon|half marathon|70\.3|140\.6)\b/i,
  )?.[0];
  return { eventUrl, eventDate, sport, distance };
}

function ChoiceButton({
  active,
  title,
  note,
  onClick,
}: {
  active: boolean;
  title: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? 'border-accent bg-[#e8f4ee]' : 'border-border bg-surface hover:border-neutral-300'
      }`}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </button>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const { onboarding, updateOnboarding, plan } = useTrainingData();
  const [step, setStep] = useState<Step>('welcome');
  const [startingIndex, setStartingIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);
  const [previewWeek, setPreviewWeek] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [draft, setDraft] = useState<OnboardingState>(onboarding);

  useEffect(() => {
    if (step !== 'building') return;
    setBuildProgress(0);
    const interval = setInterval(() => {
      setBuildProgress((v) => Math.min(BUILDING_ITEMS.length, v + 1));
    }, 400);
    const done = setTimeout(() => {
      setDraft((prev) => ({
        ...prev,
        generatedPlanName: plan?.name ?? 'Tempo Starter Plan',
        generatedAt: new Date().toISOString(),
      }));
      setStep('review');
    }, 2300);
    return () => {
      clearInterval(interval);
      clearTimeout(done);
    };
  }, [step, plan?.name]);

  const currentWeek = useMemo(() => plan?.weeks?.[0], [plan]);
  const timelineLabel = useMemo(() => {
    if (!plan) return '12 weeks';
    if (plan.raceDate && plan.startDate) return `${plan.startDate} → ${plan.raceDate}`;
    return `${plan.totalWeeks ?? plan.weeks.length} weeks`;
  }, [plan]);

  function commit(partial: Partial<OnboardingState>) {
    const next = {
      ...draft,
      ...partial,
      healthPermissions: {
        ...draft.healthPermissions,
        ...(partial.healthPermissions ?? {}),
      },
      constraints: partial.constraints ?? draft.constraints,
    };
    setDraft(next);
    updateOnboarding(next);
  }

  function goToStartingStep() {
    if (!draft.goalType && !draft.rawGoalInput?.trim()) return;
    const parsed = parseGoalInput(draft.rawGoalInput ?? '');
    commit(parsed);
    setStep('starting_point');
    setStartingIndex(0);
  }

  function completeSetup() {
    const finalState: OnboardingState = {
      ...draft,
      onboardingCompleted: true,
      tourCompleted: true,
      activePlanCreated: false,
      generatedPlanName: draft.generatedPlanName ?? plan?.name ?? 'Tempo Starter Plan',
      generatedAt: draft.generatedAt ?? new Date().toISOString(),
    };
    setDraft(finalState);
    updateOnboarding(finalState);
    navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background px-4 pb-8 pt-safe-top">
      {step === 'welcome' && (
        <div className="space-y-6 py-6">
          <PageHeader title="Train with context. Not guesswork." />
          <p className="text-sm leading-relaxed text-muted">
            Tempo combines your training context with a structured setup so your first plan is clear,
            practical, and adjustable before you start.
          </p>
          <Card className="space-y-2">
            <p className="section-label">Trust</p>
            <div className="space-y-1.5 text-sm text-foreground">
              <p>Apple Health compatible</p>
              <p>You control your plan before activation</p>
              <p>No manual logging required to begin</p>
            </div>
          </Card>
          <Button type="button" onClick={() => setStep('goal')}>
            Start setup
          </Button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
          >
            I already have an account
          </button>
        </div>
      )}

      {step === 'goal' && (
        <div className="space-y-4 py-4">
          <PageHeader title="What are you training for?" />
          <p className="text-sm text-muted">
            Add a race, event, goal, or general focus. Tempo will build a controlled starting point.
          </p>
          <div className="space-y-2">
            {GOAL_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.id}
                title={option.title}
                note={option.note}
                active={draft.goalType === option.id}
                onClick={() => commit({ goalType: option.id })}
              />
            ))}
          </div>
          <div className="space-y-1">
            <Textarea
              value={draft.rawGoalInput ?? ''}
              onChange={(e) => commit({ rawGoalInput: e.target.value })}
              placeholder="Paste an event link or describe your goal"
              className="min-h-[92px]"
            />
            <p className="text-xs text-muted">
              Example: “Half marathon on October 12” or “Build endurance without losing strength.”
            </p>
          </div>
          <Button type="button" onClick={goToStartingStep}>
            Build my starting plan
          </Button>
          <button
            type="button"
            onClick={() => setStep('starting_point')}
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === 'starting_point' && (
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Starting point {startingIndex + 1}/5
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${((startingIndex + 1) / 5) * 100}%` }}
              />
            </div>
          </div>

          {startingIndex === 0 && (
            <>
              <PageHeader title="How are you training right now?" />
              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    title={option.label}
                    active={draft.currentTrainingFrequency === option.id}
                    onClick={() => commit({ currentTrainingFrequency: option.id })}
                  />
                ))}
              </div>
            </>
          )}

          {startingIndex === 1 && (
            <>
              <PageHeader title="What matters most for this plan?" />
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    title={option.label}
                    active={draft.planPriority === option.id}
                    onClick={() => commit({ planPriority: option.id })}
                  />
                ))}
              </div>
            </>
          )}

          {startingIndex === 2 && (
            <>
              <PageHeader title="How many days can you realistically train?" />
              <div className="grid grid-cols-3 gap-2">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option}
                    title={option === '6_plus' ? '6+' : option}
                    active={draft.weeklyAvailability === option}
                    onClick={() => commit({ weeklyAvailability: option })}
                  />
                ))}
              </div>
            </>
          )}

          {startingIndex === 3 && (
            <>
              <PageHeader title="Anything Tempo should avoid or work around?" />
              <div className="space-y-2">
                {CONSTRAINT_OPTIONS.map((option) => {
                  const active = draft.constraints.includes(option.id);
                  return (
                    <ChoiceButton
                      key={option.id}
                      title={option.label}
                      active={active}
                      onClick={() => {
                        const next = active
                          ? draft.constraints.filter((c) => c !== option.id)
                          : [...draft.constraints.filter((c) => c !== 'no_constraints'), option.id];
                        commit({
                          constraints:
                            option.id === 'no_constraints' && !active ? ['no_constraints'] : next,
                        });
                      }}
                    />
                  );
                })}
              </div>
              {draft.constraints.includes('injury_pain') && (
                <Input
                  value={draft.injuryNotes ?? ''}
                  onChange={(e) => commit({ injuryNotes: e.target.value })}
                  placeholder="Optional: shoulder flare-up, return-to-run limits, etc."
                />
              )}
            </>
          )}

          {startingIndex === 4 && (
            <>
              <PageHeader title="What kind of plan do you want?" />
              <div className="space-y-2">
                {INTENSITY_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    title={option.label}
                    active={(draft.planIntensityPreference ?? 'balanced') === option.id}
                    onClick={() => commit({ planIntensityPreference: option.id })}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStartingIndex((v) => Math.max(0, v - 1))}
              disabled={startingIndex === 0}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (startingIndex < 4) setStartingIndex((v) => v + 1);
                else setStep('building');
              }}
            >
              {startingIndex < 4 ? 'Continue' : 'Build my starting plan'}
            </Button>
          </div>
        </div>
      )}

      {step === 'building' && (
        <div className="space-y-4 py-8">
          <PageHeader title="Building your starting plan" />
          <div className="space-y-2">
            {BUILDING_ITEMS.map((item, idx) => (
              <div
                key={item}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                  idx < buildProgress ? 'border-accent/30 bg-[#e8f4ee]' : 'border-border bg-surface'
                }`}
              >
                <span className="text-foreground">{item}</span>
                <span className="text-xs text-muted">{idx < buildProgress ? 'Done' : '...'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4 py-4">
          <PageHeader title="Your starting plan is ready" />
          <Card className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {draft.generatedPlanName ?? plan?.name ?? 'Tempo Starter Plan'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted">
              <p>Timeline: {timelineLabel}</p>
              <p>Training days/week: {draft.weeklyAvailability ?? '4'}</p>
              <p>Focus: {draft.planPriority?.replace(/_/g, ' ') ?? 'build consistency'}</p>
              <p>Intensity: {draft.planIntensityPreference ?? 'balanced'}</p>
              <p>Start date: {plan?.startDate ?? new Date().toISOString().slice(0, 10)}</p>
            </div>
          </Card>
          <Card className="space-y-2">
            <p className="section-label">This week</p>
            <p className="text-sm text-foreground">{currentWeek?.keyFocus ?? 'Build consistency and stay aerobic.'}</p>
            <p className="text-xs text-muted">Target: {currentWeek?.targetHours ?? 5} hrs</p>
          </Card>
          <Card className="space-y-2">
            <p className="section-label">What Tempo will watch</p>
            <p className="text-sm text-foreground">
              Workload trend, recovery signal drift, and missed-session spillover.
            </p>
          </Card>
          <Card className="space-y-2">
            <p className="section-label">Why this plan fits</p>
            <p className="text-sm text-foreground">
              Matched to your frequency, weekly availability, and constraints with recovery space built in.
            </p>
          </Card>
          {previewWeek && (
            <Card className="space-y-1.5">
              <p className="section-label">Week preview</p>
              {(currentWeek?.plannedSessions ?? []).slice(0, 5).map((session, idx) => (
                <p key={`${session.day}-${idx}`} className="text-sm text-foreground">
                  {session.day?.toUpperCase()}: {session.details ?? session.title ?? 'Session'}
                </p>
              ))}
            </Card>
          )}
          <Button type="button" onClick={() => setStep('health')}>
            Start this plan
          </Button>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              className="rounded-xl border border-border bg-surface px-2 py-2 text-foreground"
              onClick={() => {
                setStartingIndex(0);
                setStep('starting_point');
              }}
            >
              Adjust plan
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-surface px-2 py-2 text-foreground"
              onClick={() => setStep('goal')}
            >
              Change goal
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-surface px-2 py-2 text-foreground"
              onClick={() => setPreviewWeek((v) => !v)}
            >
              Preview first week
            </button>
          </div>
        </div>
      )}

      {step === 'health' && (
        <div className="space-y-4 py-4">
          <PageHeader title="Make Tempo more accurate" />
          <p className="text-sm text-muted">
            Apple Health helps Tempo read workouts, sleep, heart rate, weight, steps, and recovery
            signals without manual logging.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['workouts', 'Workouts'],
                ['heartRate', 'Heart rate'],
                ['sleep', 'Sleep'],
                ['weight', 'Weight'],
                ['steps', 'Steps'],
              ] as [HealthPermissionKey, string][]
            ).map(([key, label]) => (
              <Card key={key} className="!p-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted">
                  {draft.healthPermissions[key] ? 'Connected' : 'Not connected'}
                </p>
              </Card>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => {
              commit({
                appleHealthPermissionStatus: 'connected',
                healthPermissions: {
                  workouts: true,
                  heartRate: true,
                  sleep: true,
                  weight: true,
                  steps: true,
                },
              });
              setStep('tour');
            }}
          >
            Connect Apple Health
          </Button>
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
            onClick={() => {
              commit({ appleHealthPermissionStatus: 'later' });
              setStep('tour');
            }}
          >
            Do this later
          </button>
        </div>
      )}

      {step === 'tour' && (
        <div className="space-y-4 py-4">
          <PageHeader title="Quick tour" subtitle="Short, dismissible overview." />
          <Card className="space-y-2">
            <p className="text-xs uppercase tracking-[0.08em] text-muted">
              Step {tourIndex + 1} of {TOUR_STEPS.length}
            </p>
            <p className="text-lg font-semibold text-foreground">{TOUR_STEPS[tourIndex].title}</p>
            <p className="text-sm text-muted">{TOUR_STEPS[tourIndex].body}</p>
          </Card>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTourIndex((v) => Math.max(0, v - 1))}
              disabled={tourIndex === 0}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (tourIndex < TOUR_STEPS.length - 1) setTourIndex((v) => v + 1);
                else completeSetup();
              }}
            >
              {tourIndex < TOUR_STEPS.length - 1 ? 'Next' : 'Finish setup'}
            </Button>
          </div>
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
            onClick={completeSetup}
          >
            Skip tour
          </button>
        </div>
      )}
    </div>
  );
}
