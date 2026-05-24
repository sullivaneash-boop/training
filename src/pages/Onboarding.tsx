import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button, Input, Textarea } from '../components/FormField';
import { useTrainingData } from '../hooks/useTrainingData';
import type {
  ConstraintType,
  CurrentTrainingFrequency,
  FirstBlockMode,
  GoalType,
  HealthPermissionKey,
  OnboardingState,
  ProtectedPriority,
  WeeklyAvailability,
} from '../lib/types';

type Step =
  | 'welcome'
  | 'goal'
  | 'starting_point'
  | 'building_plan_briefing'
  | 'plan_briefing'
  | 'health_sync'
  | 'today_briefing';

const GOAL_OPTIONS: { id: GoalType; title: string; note: string }[] = [
  { id: 'race_event', title: 'Race', note: 'Build toward a date' },
  { id: 'general_fitness', title: 'Fitness', note: 'Get consistent' },
  { id: 'strength', title: 'Strength', note: 'Keep lifting' },
  { id: 'hybrid_training', title: 'Hybrid', note: 'Run + lift' },
  { id: 'recovery_return', title: 'Return', note: 'Come back carefully' },
  { id: 'not_sure', title: 'Not sure', note: 'Start conservative' },
];

const FREQUENCY_OPTIONS: { id: CurrentTrainingFrequency; label: string }[] = [
  { id: 'not_consistent', label: 'Not training consistently' },
  { id: '1_2_days', label: '1-2 days/week' },
  { id: '3_4_days', label: '3-4 days/week' },
  { id: '5_plus_days', label: '5+ days/week' },
  { id: 'coming_back', label: 'Coming back after time off' },
];

const PROTECTED_PRIORITY_OPTIONS: { id: ProtectedPriority; label: string }[] = [
  { id: 'recovery', label: 'Recovery' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'injury_history', label: 'Injury history' },
  { id: 'strength_work', label: 'Strength work' },
  { id: 'race_performance', label: 'Race performance' },
  { id: 'consistency', label: 'Consistency' },
];

const AVAILABILITY_OPTIONS: WeeklyAvailability[] = ['2', '3', '4', '5', '6_plus'];

const CONSTRAINT_OPTIONS: { id: ConstraintType; label: string }[] = [
  { id: 'injury_pain', label: 'Injury or pain' },
  { id: 'limited_equipment', label: 'Limited equipment' },
  { id: 'travel', label: 'Travel' },
  { id: 'busy_schedule', label: 'Busy work weeks' },
  { id: 'low_recovery', label: 'Low sleep' },
  { id: 'no_constraints', label: 'None' },
];

const FIRST_BLOCK_MODE_OPTIONS: { id: FirstBlockMode; label: string }[] = [
  { id: 'conservative', label: 'Easy start' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'aggressive', label: 'Performance-focused' },
  { id: 'flexible', label: 'Flexible week to week' },
];

const HEALTH_PERMISSION_EXPLANATIONS: [HealthPermissionKey, string, string][] = [
  ['workouts', 'Workouts', 'Detect completed sessions'],
  ['heartRate', 'Heart rate', 'Understand effort'],
  ['sleep', 'Sleep', 'Add recovery context'],
  ['steps', 'Steps', 'Read daily load'],
  ['weight', 'Weight', 'Optional trend tracking'],
];

function formatDateHuman(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function addDaysISO(from: string, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseGoalInput(text: string) {
  const trimmed = text.trim();
  const eventUrl = trimmed.match(/https?:\/\/\S+/i)?.[0];
  const dateGuess = new Date(trimmed);
  const eventDate = Number.isNaN(dateGuess.getTime()) ? undefined : dateGuess.toISOString().slice(0, 10);
  const rawEventName = trimmed.split(/\bon\b|\bfor\b/i)[0]?.trim();
  const eventName = rawEventName?.length ? rawEventName.slice(0, 70) : undefined;
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
  return { eventUrl, eventDate, eventName, sport };
}

function modeLabel(mode: FirstBlockMode): string {
  if (mode === 'aggressive') return 'Performance';
  if (mode === 'conservative') return 'Conservative';
  if (mode === 'flexible') return 'Flexible';
  return 'Balanced';
}

function makePhaseModel(totalWeeks: number) {
  if (totalWeeks === 21) {
    return [
      { name: 'Base', range: 'Weeks 1-6' },
      { name: 'Build', range: 'Weeks 7-14' },
      { name: 'Peak', range: 'Weeks 15-18' },
      { name: 'Taper', range: 'Weeks 19-21' },
    ];
  }
  if (totalWeeks < 16) return [];
  const baseEnd = Math.max(4, Math.round(totalWeeks * 0.3));
  const buildEnd = Math.max(baseEnd + 3, Math.round(totalWeeks * 0.7));
  const peakEnd = Math.max(buildEnd + 1, totalWeeks - 2);
  return [
    { name: 'Base', range: `Weeks 1-${baseEnd}` },
    { name: 'Build', range: `Weeks ${baseEnd + 1}-${buildEnd}` },
    { name: 'Peak', range: `Weeks ${buildEnd + 1}-${peakEnd}` },
    { name: 'Taper', range: `Weeks ${peakEnd + 1}-${totalWeeks}` },
  ];
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
      className={`w-full rounded-[18px] border px-4 py-3 text-left transition-colors ${
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
  const [previewWeek, setPreviewWeek] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [draft, setDraft] = useState<OnboardingState>(onboarding);

  const buildingItems = useMemo(() => {
    const items = [
      'Reading your goal',
      'Setting your timeline',
      'Estimating weekly load',
      'Creating your first block',
      'Adding recovery space',
    ];
    if (draft.eventDate || draft.eventUrl) items.splice(2, 0, 'Mapping race timeline');
    return items;
  }, [draft.eventDate, draft.eventUrl]);

  useEffect(() => {
    if (step !== 'building_plan_briefing') return;
    setBuildProgress(0);
    const interval = setInterval(() => {
      setBuildProgress((v) => Math.min(buildingItems.length, v + 1));
    }, 350);
    const done = setTimeout(() => {
      setDraft((prev) => ({
        ...prev,
        generatedPlanName: prev.generatedPlanName ?? plan?.name ?? 'Tempo Plan Briefing',
        generatedAt: prev.generatedAt ?? new Date().toISOString(),
      }));
      setStep('plan_briefing');
    }, 2200);
    return () => {
      clearInterval(interval);
      clearTimeout(done);
    };
  }, [buildingItems.length, plan?.name, step]);

  const currentWeek = useMemo(() => plan?.weeks?.[0], [plan]);
  const totalWeeks = plan?.totalWeeks ?? plan?.weeks?.length ?? 21;
  const phaseModel = useMemo(() => makePhaseModel(totalWeeks), [totalWeeks]);
  const startDateIso = plan?.startDate ?? new Date().toISOString().slice(0, 10);
  const endDateIso = plan?.raceDate ?? draft.eventDate ?? addDaysISO(startDateIso, totalWeeks * 7 - 1);
  const timelineLabel = `${formatDateHuman(startDateIso) ?? startDateIso} -> ${formatDateHuman(endDateIso) ?? endDateIso}`;
  const weekOneTarget = currentWeek?.targetHours
    ? `${currentWeek.targetHours.toFixed(1)} hrs`
    : draft.weeklyAvailability === '6_plus'
      ? '6.0 hrs'
      : draft.weeklyAvailability
        ? `${Number(draft.weeklyAvailability) * 1.1} hrs`
        : '4.5 hrs';

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
    commit(parseGoalInput(draft.rawGoalInput ?? ''));
    setStep('starting_point');
    setStartingIndex(0);
  }

  function finishOnboarding(path = '/') {
    const finalState: OnboardingState = {
      ...draft,
      onboardingCompleted: true,
      activePlanCreated: true,
      generatedPlanName: draft.generatedPlanName ?? plan?.name ?? 'Tempo Plan Briefing',
      generatedAt: draft.generatedAt ?? new Date().toISOString(),
    };
    setDraft(finalState);
    updateOnboarding(finalState);
    navigate(path, { replace: true });
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background px-4 pb-8 pt-safe-top">
      {step === 'welcome' && (
        <div className="space-y-6 py-6">
          <PageHeader title="Know what to do next." />
          <p className="text-sm leading-relaxed text-muted">
            Tempo turns your goal, schedule, and training data into a plan that adapts around real life.
          </p>
          <Card className="space-y-2 rounded-[22px]">
            <p className="section-label">How Tempo starts</p>
            <div className="space-y-1.5 text-sm text-foreground">
              <p>01 Set your goal</p>
              <p>02 Review your starting plan</p>
              <p>03 Connect Apple Health for smarter adjustments</p>
            </div>
          </Card>
          <Button type="button" onClick={() => setStep('goal')}>
            Build my plan
          </Button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
          >
            Sign in
          </button>
          <p className="text-center text-xs text-muted">No manual logging required to begin.</p>
        </div>
      )}

      {step === 'goal' && (
        <div className="space-y-4 py-4">
          <PageHeader title="What are you building toward?" />
          <p className="text-sm text-muted">
            Choose a direction. Add a race link or describe the goal in your own words.
          </p>
          <div className="grid grid-cols-2 gap-2">
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
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Add detail</p>
            <Textarea
              value={draft.rawGoalInput ?? ''}
              onChange={(e) => commit({ rawGoalInput: e.target.value })}
              placeholder="Paste a race link or describe your goal"
              className="min-h-[96px]"
            />
            <p className="text-xs text-muted">
              Links, messy notes, and rough goals are fine. Tempo will clean it up.
            </p>
          </div>
          <Button type="button" onClick={goToStartingStep}>
            Continue
          </Button>
        </div>
      )}

      {step === 'starting_point' && (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Starting point {startingIndex + 1}/5
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full ${idx <= startingIndex ? 'bg-accent' : 'bg-border'}`}
                />
              ))}
            </div>
          </div>

          {startingIndex === 0 && (
            <>
              <PageHeader
                title="Calibrate your starting point"
                subtitle="A few answers help Tempo set the first week without overreaching."
              />
              <p className="section-label">How consistent are you right now?</p>
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
              <PageHeader title="What should Tempo protect?" />
              <div className="grid grid-cols-2 gap-2">
                {PROTECTED_PRIORITY_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    title={option.label}
                    active={draft.protectedPriority === option.id}
                    onClick={() => commit({ protectedPriority: option.id })}
                  />
                ))}
              </div>
            </>
          )}

          {startingIndex === 2 && (
            <>
              <PageHeader title="How many days can you train most weeks?" />
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
              <PageHeader title="Any constraints?" />
              <div className="grid grid-cols-2 gap-2">
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
                  placeholder="Optional: anything Tempo should account for"
                />
              )}
            </>
          )}

          {startingIndex === 4 && (
            <>
              <PageHeader title="How should the first block feel?" />
              <div className="space-y-2">
                {FIRST_BLOCK_MODE_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.id}
                    title={option.label}
                    active={(draft.firstBlockMode ?? 'balanced') === option.id}
                    onClick={() => commit({ firstBlockMode: option.id })}
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
                else setStep('building_plan_briefing');
              }}
            >
              {startingIndex < 4 ? 'Continue' : 'Build plan briefing'}
            </Button>
          </div>
        </div>
      )}

      {step === 'building_plan_briefing' && (
        <div className="space-y-4 py-8">
          <PageHeader title="Building your plan briefing" />
          <div className="space-y-2">
            {buildingItems.map((item, idx) => (
              <div
                key={item}
                className={`flex items-center justify-between rounded-[16px] border px-3 py-2 text-sm ${
                  idx < buildProgress ? 'border-accent/30 bg-[#e8f4ee]' : 'border-border bg-surface'
                }`}
              >
                <span className="text-foreground">{item}</span>
                <span className="text-xs text-muted">{idx < buildProgress ? 'Done' : '...'}</span>
              </div>
            ))}
          </div>
          {!draft.healthConnected && (
            <p className="text-xs text-muted">Health data can be connected after review.</p>
          )}
        </div>
      )}

      {step === 'plan_briefing' && (
        <div className="space-y-4 py-4">
          <PageHeader title="Your plan briefing is ready" />

          <Card className="space-y-3 rounded-[22px]">
            <div>
              <p className="text-lg font-semibold text-foreground">
                {draft.eventName ?? draft.generatedPlanName ?? plan?.name ?? 'Your training goal'}
              </p>
              <p className="text-sm text-muted">{totalWeeks}-week controlled build</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted">
              <p>Timeline: {timelineLabel}</p>
              <p>Training days/week: {draft.weeklyAvailability === '6_plus' ? '6+' : draft.weeklyAvailability ?? '4'}</p>
              <p>First week target: {weekOneTarget}</p>
              <p>Start mode: {modeLabel(draft.firstBlockMode ?? 'balanced')}</p>
            </div>
          </Card>

          {phaseModel.length > 0 && (
            <Card className="space-y-2">
              <p className="section-label">Phase timeline</p>
              <div className="space-y-1.5">
                {phaseModel.map((phase) => (
                  <div key={phase.name} className="flex items-center justify-between border-b border-border/70 pb-1 text-sm last:border-b-0">
                    <p className="font-medium text-foreground">{phase.name}</p>
                    <p className="text-muted">{phase.range}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="space-y-2">
            <p className="section-label">Week 1: Set the floor</p>
            <div className="space-y-1 text-sm text-foreground">
              <p>Swim technique</p>
              <p>Easy aerobic work</p>
              <p>Strength support</p>
              <p>Long endurance session</p>
              <p>Recovery spacing</p>
            </div>
          </Card>

          <Card className="space-y-2">
            <p className="section-label">Why this fits</p>
            <p className="text-sm text-foreground">
              Tempo is starting with a controlled base week because your goal is long-range, your
              schedule allows {draft.weeklyAvailability === '6_plus' ? '6+' : draft.weeklyAvailability ?? '4'} training
              days, and consistency matters more than intensity right now.
            </p>
          </Card>

          {previewWeek && (
            <Card className="space-y-1.5">
              <p className="section-label">Week 1 preview</p>
              {(currentWeek?.plannedSessions ?? []).slice(0, 5).map((session, idx) => (
                <p key={`${session.day}-${idx}`} className="text-sm text-foreground">
                  {session.day?.toUpperCase()}: {session.details ?? session.title ?? 'Session'}
                </p>
              ))}
            </Card>
          )}

          <Card className="space-y-2">
            <p className="section-label">Adjust before you start</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                className="rounded-[16px] border border-border bg-surface px-3 py-2 text-left text-foreground"
                onClick={() => commit({ firstBlockMode: 'conservative' })}
              >
                Lower intensity
              </button>
              <button
                type="button"
                className="rounded-[16px] border border-border bg-surface px-3 py-2 text-left text-foreground"
                onClick={() => {
                  setStartingIndex(2);
                  setStep('starting_point');
                }}
              >
                Change training days
              </button>
              <button
                type="button"
                className="rounded-[16px] border border-border bg-surface px-3 py-2 text-left text-foreground"
                onClick={() => {
                  setStartingIndex(3);
                  setStep('starting_point');
                }}
              >
                Add constraint
              </button>
              <button
                type="button"
                className="rounded-[16px] border border-border bg-surface px-3 py-2 text-left text-foreground"
                onClick={() => setPreviewWeek((v) => !v)}
              >
                Preview Week 1
              </button>
            </div>
          </Card>

          <Button type="button" onClick={() => setStep('health_sync')}>
            Start plan
          </Button>
          <button
            type="button"
            onClick={() => setStep('goal')}
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
          >
            Edit goal
          </button>
        </div>
      )}

      {step === 'health_sync' && (
        <div className="space-y-4 py-4">
          <PageHeader title="Make Tempo adapt automatically" />
          <p className="text-sm text-muted">
            Connect Apple Health so Tempo can understand workouts, recovery, sleep, and daily load
            without manual entry.
          </p>
          <div className="space-y-2">
            {HEALTH_PERMISSION_EXPLANATIONS.map(([key, label, note]) => (
              <Card key={key} className="!p-3.5">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted">{note}</p>
              </Card>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => {
              commit({
                healthConnected: true,
                healthPermissions: {
                  workouts: true,
                  heartRate: true,
                  sleep: true,
                  weight: true,
                  steps: true,
                },
              });
              setStep('today_briefing');
            }}
          >
            Connect Apple Health
          </Button>
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-sm font-medium text-muted underline"
            onClick={() => {
              commit({ healthConnected: false });
              setStep('today_briefing');
            }}
          >
            Not now
          </button>
          <p className="text-center text-xs text-muted">You control Health permissions in iOS Settings.</p>
        </div>
      )}

      {step === 'today_briefing' && (
        <div className="space-y-4 py-4">
          <PageHeader title="Today's briefing" />
          <Card className="space-y-1 rounded-[22px] border-accent/30 bg-[#e8f4ee]">
            <p className="text-lg font-semibold text-foreground">Week 1 starts today.</p>
            <p className="text-sm text-muted">
              Your first block is focused on consistency, easy aerobic work, and recovery spacing.
            </p>
          </Card>
          <Card className="space-y-1.5">
            <p className="section-label">Today</p>
            <p className="text-sm font-semibold text-foreground">Easy aerobic session</p>
            <p className="text-sm text-foreground">30-45 min</p>
            <p className="text-xs text-muted">Why: Build the floor without adding unnecessary fatigue.</p>
          </Card>
          <Card className="space-y-1.5">
            <p className="section-label">Need to adjust?</p>
            <p className="text-sm text-muted">
              Move a workout, lower intensity, or tell Tempo you&apos;re sore.
            </p>
          </Card>
          {!draft.healthConnected && (
            <Card className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                Connect Apple Health to track completed sessions automatically.
              </p>
            </Card>
          )}
          <Button type="button" onClick={() => finishOnboarding('/')}>
            Start Week 1
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => finishOnboarding('/')}>
              Adjust today
            </Button>
            <Button type="button" variant="ghost" onClick={() => finishOnboarding('/coach')}>
              Ask Tempo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
