import type {
  AthleteProfile,
  CoachInsight,
  CoachResponse,
  DeepSeekApiResponse,
  DeepSeekMode,
  DeepSeekModel,
  DeepSeekRequest,
  PlanPatch,
  ReadinessCheck,
  TrainingPlan,
  WorkoutLog,
} from './types';
import { normalizePlanPatch } from './planPatchInfer';
import { slimPlanForApi } from './planContext';
import { addCoachInsight } from './storage';

export class DeepSeekClientError extends Error {
  raw?: string;
  partial?: DeepSeekApiResponse;

  constructor(message: string, opts?: { raw?: string; partial?: DeepSeekApiResponse }) {
    super(message);
    this.name = 'DeepSeekClientError';
    this.raw = opts?.raw;
    this.partial = opts?.partial;
  }
}

function normalizeCoachResponse(raw: unknown, mode: string): CoachResponse {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    mode: String(c.mode ?? mode),
    summary: String(c.summary ?? ''),
    signal: (['green', 'yellow', 'red', 'neutral'].includes(String(c.signal))
      ? c.signal
      : 'neutral') as CoachResponse['signal'],
    keyFindings: Array.isArray(c.keyFindings) ? c.keyFindings.map(String) : [],
    recommendedAction: String(c.recommendedAction ?? ''),
    adjustments: Array.isArray(c.adjustments)
      ? c.adjustments.map((a) => {
          const adj = a as Record<string, unknown>;
          return {
            action: String(adj.action ?? ''),
            reason: String(adj.reason ?? ''),
            priority: (['low', 'medium', 'high'].includes(String(adj.priority))
              ? adj.priority
              : 'medium') as 'low' | 'medium' | 'high',
          };
        })
      : [],
    warningFlags: Array.isArray(c.warningFlags) ? c.warningFlags.map(String) : [],
    questionsForUser: Array.isArray(c.questionsForUser)
      ? c.questionsForUser.map(String)
      : [],
  };
}

function normalizeApiPayload(data: Record<string, unknown>, mode: DeepSeekMode): DeepSeekApiResponse {
  const coach = normalizeCoachResponse(data.coach ?? data, mode);
  const assistantMessage = String(
    data.assistantMessage ?? coach.summary ?? 'Response received.',
  );
  const planPatch = normalizePlanPatch(data.planPatch);

  return {
    coach: { ...coach, summary: coach.summary || assistantMessage },
    assistantMessage,
    planPatch: planPatch ?? undefined,
    plan: data.plan as TrainingPlan | undefined,
  };
}

/** Strip heavy fields before sending to API. */
export function prepareDeepSeekRequest(req: DeepSeekRequest): DeepSeekRequest {
  const prepared = { ...req };
  if (req.plan) {
    prepared.plan = slimPlanForApi(req.plan) as unknown as TrainingPlan;
  }
  if (req.rawMarkdown) {
    prepared.rawMarkdown = req.rawMarkdown.slice(0, 80000);
  }
  if (req.mode === 'plan_assistant') {
    prepared.rawMarkdown = undefined;
  }
  return prepared;
}

export async function callDeepSeek(
  request: DeepSeekRequest,
  model: DeepSeekModel,
): Promise<DeepSeekApiResponse> {
  const prepared = prepareDeepSeekRequest(request);

  const res = await fetch('/api/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...prepared, model }),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new DeepSeekClientError('Invalid response from server');
  }

  if (!res.ok) {
    const raw = typeof data.raw === 'string' ? data.raw : undefined;
    throw new DeepSeekClientError(String(data.error ?? `API error ${res.status}`), { raw });
  }

  return normalizeApiPayload(data, request.mode);
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
    workoutLogs: opts.workouts?.slice(-30),
    readinessChecks: opts.readiness?.slice(-10),
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
    throw new DeepSeekClientError('normalize_plan did not return a plan object');
  }

  return { plan: result.plan, coach: result.coach };
}

export type { PlanPatch };
