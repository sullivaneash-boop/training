import type {
  AthleteProfile,
  CoachInsight,
  CoachResponse,
  DeepSeekApiResponse,
  DeepSeekMode,
  DeepSeekModel,
  DeepSeekRequest,
  ReadinessCheck,
  TrainingPlan,
  WorkoutLog,
} from './types';
import { addCoachInsight } from './storage';

export async function callDeepSeek(
  request: DeepSeekRequest,
  model: DeepSeekModel,
): Promise<DeepSeekApiResponse> {
  const res = await fetch('/api/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, model }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `API error ${res.status}`);
  }
  return data as DeepSeekApiResponse;
}

export function saveInsightFromResponse(
  mode: DeepSeekMode,
  response: CoachResponse,
  opts: { planId?: string; requestSummary: string; date?: string },
): CoachInsight {
  return addCoachInsight({
    date: opts.date ?? new Date().toISOString().slice(0, 10),
    mode,
    planId: opts.planId,
    requestSummary: opts.requestSummary,
    response,
  });
}

export function buildDeepSeekContext(opts: {
  plan?: TrainingPlan | null;
  athlete?: AthleteProfile | null;
  workouts?: WorkoutLog[];
  readiness?: ReadinessCheck[];
  date?: string;
}): Pick<
  DeepSeekRequest,
  'plan' | 'athleteProfile' | 'workoutLogs' | 'readinessChecks' | 'date'
> {
  return {
    plan: opts.plan ?? undefined,
    athleteProfile: opts.athlete ?? undefined,
    workoutLogs: opts.workouts,
    readinessChecks: opts.readiness,
    date: opts.date ?? new Date().toISOString().slice(0, 10),
  };
}

export async function normalizePlanWithAi(
  rawMarkdown: string,
  model: DeepSeekModel,
  athlete?: AthleteProfile,
): Promise<{ plan: TrainingPlan; coach: CoachResponse }> {
  const result = await callDeepSeek(
    {
      mode: 'normalize_plan',
      rawMarkdown,
      athleteProfile: athlete,
    },
    model,
  );

  if (!result.plan) {
    throw new Error('normalize_plan did not return a plan object');
  }

  return { plan: result.plan, coach: result.coach };
}
