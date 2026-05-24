import type { OnboardingState, PlannedSession, PlanPhase, PlanWeek, TrainingPlan } from './types';

function pickSportTypes(goalType?: OnboardingState['goalType']) {
  if (goalType === 'strength') return ['strength', 'run'];
  if (goalType === 'hybrid_training') return ['run', 'strength', 'bike'];
  if (goalType === 'race_event') return ['run', 'bike', 'strength'];
  if (goalType === 'recovery_return') return ['run', 'strength', 'mobility'];
  return ['run', 'strength'];
}

function baseHoursFromAvailability(availability?: OnboardingState['weeklyAvailability']) {
  if (availability === '2') return 2.5;
  if (availability === '3') return 3.5;
  if (availability === '4') return 4.5;
  if (availability === '5') return 5.75;
  if (availability === '6_plus') return 7;
  return 4;
}

function makePhases(totalWeeks: number): PlanPhase[] {
  if (totalWeeks <= 8) {
    return [
      { name: 'Base', startWeek: 1, endWeek: Math.max(3, totalWeeks - 2) },
      { name: 'Build', startWeek: Math.max(4, totalWeeks - 1), endWeek: totalWeeks - 1 },
      { name: 'Taper', startWeek: totalWeeks, endWeek: totalWeeks },
    ];
  }
  const baseEnd = Math.max(4, Math.round(totalWeeks * 0.3));
  const buildEnd = Math.max(baseEnd + 2, Math.round(totalWeeks * 0.7));
  const peakEnd = Math.max(buildEnd + 1, totalWeeks - 2);
  return [
    { name: 'Base', startWeek: 1, endWeek: baseEnd },
    { name: 'Build', startWeek: baseEnd + 1, endWeek: buildEnd },
    { name: 'Peak', startWeek: buildEnd + 1, endWeek: peakEnd },
    { name: 'Taper', startWeek: peakEnd + 1, endWeek: totalWeeks },
  ];
}

function phaseForWeek(phases: PlanPhase[], week: number) {
  return phases.find((p) => week >= p.startWeek && week <= p.endWeek)?.name ?? phases[0]?.name ?? 'Base';
}

function buildSessions(week: number, mode: OnboardingState['firstBlockMode'], sports: string[]): PlannedSession[] {
  const intensity =
    mode === 'aggressive' ? 'performance' : mode === 'conservative' ? 'easy' : 'balanced';
  const baseRun = week < 3 ? '30-40 min' : week < 8 ? '40-50 min' : '45-60 min';
  const strength = week % 4 === 0 ? 'Light support session' : 'Strength support session';
  const sessions: PlannedSession[] = [
    { day: 'mon', type: sports[0] ?? 'run', title: 'Easy aerobic', details: `${baseRun} (${intensity})` },
    { day: 'wed', type: sports.includes('bike') ? 'bike' : sports[0] ?? 'run', title: 'Aerobic build', details: week % 4 === 0 ? '40-50 min easy' : '45-65 min steady' },
    { day: 'thu', type: 'strength', title: 'Strength support', details: strength },
    { day: 'sat', type: sports[0] ?? 'run', title: 'Long endurance', details: week % 4 === 0 ? '50-60 min controlled' : '60-90 min easy steady' },
    { day: 'sun', type: 'mobility', title: 'Recovery spacing', details: 'Mobility + walk or complete rest' },
  ];
  return sessions;
}

export function createFallbackPlanFromOnboarding(onboarding: OnboardingState): TrainingPlan {
  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const parsedRaceDate = onboarding.eventDate ? new Date(onboarding.eventDate) : null;
  const weekDiff =
    parsedRaceDate && !Number.isNaN(parsedRaceDate.getTime())
      ? Math.max(8, Math.min(30, Math.ceil((parsedRaceDate.getTime() - now.getTime()) / (7 * 86400000))))
      : undefined;
  const totalWeeks = weekDiff ?? 12;
  const phases = makePhases(totalWeeks);
  const baseHours = baseHoursFromAvailability(onboarding.weeklyAvailability);
  const sports = pickSportTypes(onboarding.goalType);

  const weeks: PlanWeek[] = Array.from({ length: totalWeeks }, (_, idx) => {
    const week = idx + 1;
    const deload = week % 4 === 0;
    const phase = phaseForWeek(phases, week);
    const targetHours = Number((baseHours + idx * 0.18 - (deload ? 0.9 : 0)).toFixed(1));
    return {
      week,
      phase,
      targetHours: Math.max(2, targetHours),
      keyFocus:
        week === 1
          ? 'Set the floor: consistency, easy aerobic work, and recovery spacing.'
          : deload
            ? 'Deload and absorb training while staying consistent.'
            : `Build ${onboarding.protectedPriority?.replace('_', ' ') ?? 'consistency'} without overreaching.`,
      plannedSessions: buildSessions(week, onboarding.firstBlockMode, sports),
      notes: deload ? ['Deload week'] : [],
    };
  });

  const goalName = onboarding.eventName ?? onboarding.rawGoalInput?.slice(0, 80) ?? 'Tempo Adaptive Plan';
  const raceName = onboarding.goalType === 'race_event' ? goalName : undefined;

  return {
    id: `plan-${crypto.randomUUID()}`,
    name: raceName ? `${raceName} Plan` : 'Tempo Adaptive Plan',
    raceName,
    raceDate: onboarding.eventDate,
    startDate,
    totalWeeks,
    sportTypes: sports,
    phases,
    weeks,
    rules: [
      `First block mode: ${onboarding.firstBlockMode}`,
      `Protected priority: ${onboarding.protectedPriority ?? 'consistency'}`,
      'Adjust volume if recovery, pain, or schedule constraints increase.',
    ],
    readinessWarnings: onboarding.constraints.map((c) => c.replace(/_/g, ' ')),
    rawMarkdown: `# ${goalName}\n\nGenerated from onboarding context.\n\n- Goal type: ${onboarding.goalType ?? 'not_sure'}\n- Weeks: ${totalWeeks}\n- Availability: ${onboarding.weeklyAvailability ?? '4'} days/week`,
    createdAt: new Date().toISOString(),
  };
}

