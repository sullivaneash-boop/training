import type { TrainingPlan, WeekPlan } from './types';

export function getWeekNumber(plan: TrainingPlan, date: Date = new Date()): number {
  const start = new Date(plan.planStartDate + 'T00:00:00');
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  if (week < 1) return 1;
  if (week > plan.totalWeeks) return plan.totalWeeks;
  return week;
}

export function getWeekPlan(plan: TrainingPlan, weekNumber: number): WeekPlan | null {
  return plan.weeks.find((w) => w.weekNumber === weekNumber) ?? null;
}

export function getWeekDateRange(
  plan: TrainingPlan,
  weekNumber: number,
): { start: Date; end: Date } {
  const start = new Date(plan.planStartDate + 'T00:00:00');
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysUntilRace(plan: TrainingPlan, date: Date = new Date()): number {
  const race = new Date(plan.raceDate + 'T00:00:00');
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((race.getTime() - d.getTime()) / 86400000);
}

export function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    base: 'Base',
    build: 'Build',
    peak: 'Peak',
    taper: 'Taper',
    race: 'Race',
    unknown: 'Training',
  };
  return labels[phase] ?? phase;
}

export function getMicroCopy(weekPlan: WeekPlan | null): string {
  if (!weekPlan) return 'Do the boring work.';
  if (weekPlan.isDeload) return 'Recovery is training.';
  if (/brick/i.test(weekPlan.keyFocus)) return 'Brick day. Respect it.';
  if (weekPlan.phase === 'peak') return 'Ego check.';
  if (weekPlan.phase === 'taper') return 'Trust the taper.';
  if (weekPlan.phase === 'race') return 'Race week. Execute.';
  return 'Do the boring work.';
}
