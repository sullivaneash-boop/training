import type { TrainingPlan, WeekPlan, WorkoutLog, WorkoutType } from './types';
import { formatDateISO, getWeekDateRange } from './weekUtils';

export interface WeeklyStats {
  plannedHours: number;
  completedHours: number;
  swimSessions: number;
  bikeSessions: number;
  runSessions: number;
  strengthSessions: number;
  longestRideMinutes: number;
  longestRunMinutes: number;
  brickCompleted: boolean;
  completionPct: number;
  missedSessions: string[];
}

const SESSION_TYPES: WorkoutType[] = ['swim', 'bike', 'run', 'strength'];

function logsInWeek(logs: WorkoutLog[], plan: TrainingPlan, weekNumber: number): WorkoutLog[] {
  const { start, end } = getWeekDateRange(plan, weekNumber);
  const startStr = formatDateISO(start);
  const endStr = formatDateISO(end);
  return logs.filter((l) => l.date >= startStr && l.date <= endStr && l.completed);
}

export function computeWeeklyStats(
  plan: TrainingPlan,
  weekPlan: WeekPlan | null,
  weekNumber: number,
  logs: WorkoutLog[],
): WeeklyStats {
  const weekLogs = logsInWeek(logs, plan, weekNumber);
  const completedHours =
    Math.round((weekLogs.reduce((s, l) => s + l.durationMinutes, 0) / 60) * 10) / 10;

  const countType = (t: WorkoutType) => weekLogs.filter((l) => l.type === t).length;

  const bikeLogs = weekLogs.filter((l) => l.type === 'bike');
  const runLogs = weekLogs.filter((l) => l.type === 'run');
  const longestRideMinutes = bikeLogs.length
    ? Math.max(...bikeLogs.map((l) => l.durationMinutes))
    : 0;
  const longestRunMinutes = runLogs.length ? Math.max(...runLogs.map((l) => l.durationMinutes)) : 0;

  const brickCompleted = weekLogs.some((l) => l.type === 'brick');

  const plannedHours = weekPlan?.targetHours ?? 0;
  const completionPct =
    plannedHours > 0 ? Math.min(100, Math.round((completedHours / plannedHours) * 100)) : 0;

  const missedSessions: string[] = [];
  const today = formatDateISO(new Date());
  const { end } = getWeekDateRange(plan, weekNumber);
  const weekEnded = formatDateISO(end) < today;

  if (weekEnded || weekNumber < getCurrentWeekNumber(plan)) {
    for (const t of SESSION_TYPES) {
      const expected = t === 'strength' ? 1 : 2;
      const actual = countType(t);
      if (actual < expected) {
        missedSessions.push(
          `${t}: logged ${actual}, typical target ~${expected} this week`,
        );
      }
    }
  }

  return {
    plannedHours,
    completedHours,
    swimSessions: countType('swim'),
    bikeSessions: countType('bike'),
    runSessions: countType('run'),
    strengthSessions: countType('strength'),
    longestRideMinutes,
    longestRunMinutes,
    brickCompleted,
    completionPct,
    missedSessions,
  };
}

function getCurrentWeekNumber(plan: TrainingPlan): number {
  const start = new Date(plan.planStartDate + 'T00:00:00');
  const d = new Date();
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.min(plan.totalWeeks, Math.max(1, Math.floor(diffDays / 7) + 1));
}

export function inferPlannedSessions(weekPlan: WeekPlan | null): number {
  if (!weekPlan) return 6;
  if (weekPlan.isDeload) return 4;
  return 6;
}
