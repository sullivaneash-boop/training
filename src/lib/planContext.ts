import type { TrainingPlan } from './types';

/** Compact plan for API — avoids huge rawMarkdown / session blobs that blow token limits. */
export function slimPlanForApi(plan: TrainingPlan) {
  return {
    id: plan.id,
    name: plan.name,
    raceName: plan.raceName,
    raceDate: plan.raceDate,
    startDate: plan.startDate,
    totalWeeks: plan.totalWeeks,
    sportTypes: plan.sportTypes,
    phases: plan.phases,
    weeks: plan.weeks.map((w) => ({
      week: w.week,
      phase: w.phase,
      targetHours: w.targetHours,
      longRide: w.longRide,
      longRun: w.longRun,
      longSwim: w.longSwim,
      keyFocus: w.keyFocus,
      isDeload: w.notes?.some((n) => /deload/i.test(n)),
    })),
  };
}
