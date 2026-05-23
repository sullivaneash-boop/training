import type { ReadinessLog, TrainingPlan, WeekPlan, WorkoutLog } from './types';
import { getWeekDateRange } from './weekUtils';

export function buildCoachPrompt(
  plan: TrainingPlan,
  weekPlan: WeekPlan | null,
  weekNumber: number,
  workouts: WorkoutLog[],
  readiness: ReadinessLog[],
  userNotes?: string,
): string {
  const { start, end } = getWeekDateRange(plan, weekNumber);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const weekWorkouts = workouts.filter((w) => w.date >= startStr && w.date <= endStr);
  const recentReadiness = readiness.slice(-7);

  const weekSection = weekPlan
    ? `Week ${weekNumber} (${weekPlan.phaseLabel})
- Target hours: ${weekPlan.targetHours}
- Long ride: ${weekPlan.longRide}
- Long run: ${weekPlan.longRun}
- Long swim: ${weekPlan.longSwim}
- Key focus: ${weekPlan.keyFocus}`
    : `Week ${weekNumber} — no structured week data in plan.`;

  const completedSection =
    weekWorkouts.length > 0
      ? weekWorkouts
          .map(
            (w) =>
              `- ${w.date} ${w.type} ${w.durationMinutes}min${w.distance ? ` ${w.distance}` : ''} RPE ${w.rpe ?? '—'} soreness ${w.soreness ?? '—'} ${w.completed ? '✓' : 'skipped'}${w.notes ? ` — ${w.notes}` : ''}`,
          )
          .join('\n')
      : 'No workouts logged this week.';

  const readinessSection =
    recentReadiness.length > 0
      ? recentReadiness
          .map(
            (r) =>
              `- ${r.date}: ${r.status.toUpperCase()} — sleep ${r.sleep}h, soreness ${r.soreness}/10, motivation ${r.motivation}/10${r.shoulderPain ? ', shoulder pain' : ''}${r.kneePain ? ', knee pain' : ''}. ${r.why}`,
          )
          .join('\n')
      : 'No readiness check-ins logged.';

  const missed = inferMissed(weekPlan, weekWorkouts);

  return `You are my endurance coach. Be direct, practical, and concise. No medical disclaimers.

## Race / Plan
- Plan: ${plan.name}
- Race date: ${plan.raceDate}
- Current week: ${weekNumber} of ${plan.totalWeeks}

## This week's plan
${weekSection}

## Completed workouts (this week)
${completedSection}

## Readiness trends (last 7 days)
${readinessSection}

## Missed / light signals
${missed.length ? missed.map((m) => `- ${m}`).join('\n') : 'None flagged.'}

## My notes
${userNotes?.trim() || 'None.'}

## What I need from you
1. Honest assessment of how this week went vs plan
2. Specific adjustments for next week (volume, intensity, which sessions to protect)
3. One thing to stop doing and one thing to double down on
4. Flag any injury/overreach patterns you see in the data

Keep it under 400 words. Bullet points preferred.`;
}

function inferMissed(weekPlan: WeekPlan | null, logs: WorkoutLog[]): string[] {
  const missed: string[] = [];
  const types = ['swim', 'bike', 'run', 'strength'] as const;
  for (const t of types) {
    const count = logs.filter((l) => l.type === t && l.completed).length;
    const target = t === 'strength' ? 1 : 2;
    if (count < target) missed.push(`${t}: ${count}/${target} sessions logged`);
  }
  if (weekPlan && /brick/i.test(weekPlan.keyFocus)) {
    const hasBrick = logs.some((l) => l.type === 'brick');
    if (!hasBrick) missed.push('Brick session planned but not logged');
  }
  return missed;
}
