import type { PlanWeek, TrainingPlan } from './types';
import { isDeloadWeek } from './planParser';

export function getWeekNumber(plan: TrainingPlan, date: Date = new Date()): number {
  const startStr = plan.startDate;
  if (!startStr) return 1;
  const start = new Date(startStr + 'T00:00:00');
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  const max = plan.totalWeeks ?? plan.weeks.length ?? 1;
  if (week < 1) return 1;
  if (week > max) return max;
  return week;
}

export function getWeekPlan(plan: TrainingPlan, weekNumber: number): PlanWeek | null {
  return plan.weeks.find((w) => w.week === weekNumber) ?? null;
}

export function getWeekDateRange(
  plan: TrainingPlan,
  weekNumber: number,
): { start: Date; end: Date } {
  const start = new Date((plan.startDate ?? new Date().toISOString().slice(0, 10)) + 'T00:00:00');
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysUntilRace(plan: TrainingPlan, date: Date = new Date()): number | null {
  if (!plan.raceDate) return null;
  const race = new Date(plan.raceDate + 'T00:00:00');
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((race.getTime() - d.getTime()) / 86400000);
}

export function getPhaseLabel(phase?: string): string {
  if (!phase) return 'Base';
  return phase.replace(/^\d+\s*[—–-]\s*/i, '').trim();
}

export function getMicroCopy(weekPlan: PlanWeek | null): string {
  if (!weekPlan) return 'Do the boring work.';
  if (isDeloadWeek(weekPlan)) return 'Recovery is training.';
  if (/brick/i.test(weekPlan.keyFocus ?? '')) return 'Brick day. Respect it.';
  const phase = (weekPlan.phase ?? '').toLowerCase();
  if (phase.includes('peak')) return 'Ego check.';
  if (phase.includes('taper')) return 'Trust the taper.';
  if (phase.includes('race')) return 'Race week. Execute.';
  return 'Do the boring work.';
}
