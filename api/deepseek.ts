import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './lib/auth';
import { parseModelJson } from './parseJson';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const COACH_JSON_EXAMPLE = `{"mode":"plan_assistant","summary":"string","signal":"green","keyFindings":[],"recommendedAction":"string","adjustments":[],"warningFlags":[],"questionsForUser":[]}`;

const PLAN_PATCH_EXAMPLE = `{"startDate":"2026-06-01","adaptationNote":"Start moved after camping"}`;

const SYSTEM_PREFIX = `You are a pragmatic endurance coach. Not medical advice.
You MUST respond with a single valid json object only. No markdown fences. No prose outside json.`;

type DeepSeekMode =
  | 'normalize_plan'
  | 'daily_debrief'
  | 'readiness_explain'
  | 'missed_workout_fix'
  | 'weekly_review'
  | 'race_weakness_scan'
  | 'today_coach'
  | 'plan_assistant';

const MODE_INSTRUCTIONS: Record<DeepSeekMode, string> = {
  normalize_plan: `Mode: normalize_plan. Parse markdown into TrainingPlan + coach. Return {"coach":..., "plan":...}. Omit fields you cannot verify.`,

  daily_debrief: `Mode: daily_debrief. Return {"coach":...} analyzing latest workout.`,

  readiness_explain: `Mode: readiness_explain. Explain deterministic readiness. Return {"coach":...}.`,

  missed_workout_fix: `Mode: missed_workout_fix. Reshuffle week without cramming. Return {"coach":...} with adjustments.`,

  weekly_review: `Mode: weekly_review. Compare logs vs plan week. Return {"coach":...}.`,

  race_weakness_scan: `Mode: race_weakness_scan. Rank race-day risks. Return {"coach":...}.`,

  today_coach: `Mode: today_coach. What to do today. Return {"coach":...}.`,

  plan_assistant: `Mode: plan_assistant. Conversational plan adapter.

RETURN FORMAT (small json only):
{
  "assistantMessage": "2-5 sentences the athlete reads in chat",
  "coach": ${COACH_JSON_EXAMPLE},
  "planPatch": ${PLAN_PATCH_EXAMPLE}
}

RULES:
- NEVER return a full TrainingPlan or weeks array — use planPatch only.
- planPatch fields (all optional): startDate, raceDate, totalWeeks, shiftPhasesWeeksBy, adaptationNote.
- Omit planPatch when only discussing options or asking questions.
- When athlete confirms a change (e.g. "yes June 1"), include planPatch with ISO dates.
- Preserve race date unless they ask to change it.`,
};

interface RequestBody {
  mode: DeepSeekMode;
  plan?: unknown;
  rawMarkdown?: string;
  athleteProfile?: unknown;
  workoutLogs?: unknown[];
  readinessChecks?: unknown[];
  userQuestion?: string;
  date?: string;
  missedSessionTypes?: string[];
  latestWorkoutId?: string;
  model?: string;
  deterministicReadiness?: { result: string; reason: string };
  messages?: { role: 'user' | 'assistant'; content: string }[];
  _retry?: boolean;
}

function emptyCoach(mode: string) {
  return {
    mode,
    summary: '',
    signal: 'neutral' as const,
    keyFindings: [] as string[],
    recommendedAction: '',
    adjustments: [] as { action: string; reason: string; priority: string }[],
    warningFlags: [] as string[],
    questionsForUser: [] as string[],
  };
}

function normalizeCoach(raw: Record<string, unknown>, mode: string) {
  return {
    mode: String(raw.mode ?? mode),
    summary: String(raw.summary ?? ''),
    signal: ['green', 'yellow', 'red', 'neutral'].includes(String(raw.signal))
      ? String(raw.signal)
      : 'neutral',
    keyFindings: Array.isArray(raw.keyFindings) ? raw.keyFindings.map(String) : [],
    recommendedAction: String(raw.recommendedAction ?? ''),
    adjustments: Array.isArray(raw.adjustments)
      ? raw.adjustments.map((a) => {
          const adj = a as Record<string, unknown>;
          return {
            action: String(adj.action ?? ''),
            reason: String(adj.reason ?? ''),
            priority: ['low', 'medium', 'high'].includes(String(adj.priority))
              ? String(adj.priority)
              : 'medium',
          };
        })
      : [],
    warningFlags: Array.isArray(raw.warningFlags) ? raw.warningFlags.map(String) : [],
    questionsForUser: Array.isArray(raw.questionsForUser)
      ? raw.questionsForUser.map(String)
      : [],
  };
}

function normalizePlanPatch(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof p.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.startDate)) {
    out.startDate = p.startDate;
  }
  if (typeof p.raceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.raceDate)) {
    out.raceDate = p.raceDate;
  }
  if (typeof p.totalWeeks === 'number') out.totalWeeks = p.totalWeeks;
  if (typeof p.shiftPhasesWeeksBy === 'number') out.shiftPhasesWeeksBy = p.shiftPhasesWeeksBy;
  if (typeof p.adaptationNote === 'string') out.adaptationNote = p.adaptationNote.slice(0, 500);
  return Object.keys(out).length ? out : null;
}

async function callUpstream(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(errText.slice(0, 400));
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '{}';
}

function buildMessages(body: RequestBody, mode: DeepSeekMode, retry: boolean) {
  const systemPrompt = `${SYSTEM_PREFIX}

${MODE_INSTRUCTIONS[mode]}

The word json appears in these instructions. Output one json object.`;

  const userPayload = {
    mode,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    plan: body.plan,
    athleteProfile: body.athleteProfile,
    workoutLogs: body.workoutLogs,
    readinessChecks: body.readinessChecks,
    userQuestion: body.userQuestion,
    missedSessionTypes: body.missedSessionTypes,
    latestWorkoutId: body.latestWorkoutId,
    deterministicReadiness: body.deterministicReadiness,
    ...(mode === 'normalize_plan' && body.rawMarkdown
      ? { rawMarkdown: body.rawMarkdown }
      : {}),
  };

  const apiMessages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Context json:\n${JSON.stringify(userPayload)}`,
    },
  ];

  const chatHistory = (body.messages ?? []).slice(-20);
  if (mode === 'plan_assistant' && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      apiMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content.slice(0, 4000),
      });
    }
  } else {
    apiMessages.push({
      role: 'user',
      content: 'Return your json response for this request.',
    });
  }

  if (retry) {
    apiMessages.push({
      role: 'user',
      content:
        'Your last reply was invalid or truncated json. Reply again with ONLY a compact json object. For plan changes use planPatch only, never the full plan.',
    });
  }

  return apiMessages;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
  }

  const body = (req.body ?? {}) as RequestBody;
  const mode = body.mode ?? 'today_coach';
  const model =
    body.model === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : DEFAULT_MODEL;

  const maxTokens =
    mode === 'normalize_plan'
      ? 4000
      : mode === 'plan_assistant'
        ? 1024
        : mode === 'missed_workout_fix'
          ? 1200
          : 900;

  const temperature = mode === 'plan_assistant' ? 0.4 : 0.35;

  try {
    let content = await callUpstream(
      apiKey,
      model,
      buildMessages(body, mode, false),
      maxTokens,
      temperature,
    );

    let parsed = parseModelJson(content);
    if (!parsed && mode === 'plan_assistant') {
      content = await callUpstream(
        apiKey,
        model,
        buildMessages(body, mode, true),
        maxTokens,
        0.2,
      );
      parsed = parseModelJson(content);
    }

    if (!parsed) {
      return res.status(502).json({
        error: 'Could not parse model response',
        raw: content.slice(0, 600),
      });
    }

    const coachRaw =
      (parsed.coach as Record<string, unknown>) ??
      (parsed.mode ? parsed : emptyCoach(mode));
    const coach = normalizeCoach(coachRaw, mode);

    const assistantMessage = String(
      parsed.assistantMessage ??
        (parsed.coach as Record<string, unknown>)?.summary ??
        coach.summary ??
        'Got it.',
    );

    const response: Record<string, unknown> = {
      coach: { ...coach, summary: coach.summary || assistantMessage },
      assistantMessage,
    };

    if (mode === 'normalize_plan' && parsed.plan) {
      response.plan = parsed.plan;
    }

    if (mode === 'plan_assistant') {
      const patch = normalizePlanPatch(parsed.planPatch);
      if (patch) {
        response.planPatch = patch;
      }
    }

    return res.status(200).json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upstream error';
    return res.status(500).json({ error: msg });
  }
}
