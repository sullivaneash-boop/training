import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const COACH_JSON_EXAMPLE = `{
  "mode": "weekly_review",
  "summary": "string",
  "signal": "green|yellow|red|neutral",
  "keyFindings": ["string"],
  "recommendedAction": "string",
  "adjustments": [{"action":"string","reason":"string","priority":"low|medium|high"}],
  "warningFlags": ["string"],
  "questionsForUser": ["string"]
}`;

const PLAN_JSON_EXAMPLE = `{
  "id": "string",
  "name": "string",
  "raceName": "string",
  "raceDate": "YYYY-MM-DD",
  "startDate": "YYYY-MM-DD",
  "totalWeeks": 21,
  "sportTypes": ["swim","bike","run"],
  "phases": [{"name":"Base","startWeek":1,"endWeek":6,"goal":"string"}],
  "weeks": [{"week":1,"phase":"Base","targetHours":5,"longRide":"string","longRun":"string","longSwim":"string","keyFocus":"string","plannedSessions":[{"day":"mon","type":"swim","title":"string","details":"string"}],"notes":[]}],
  "rules": ["string"],
  "readinessWarnings": ["string"],
  "gearChecklist": ["string"],
  "raceNotes": ["string"],
  "rawMarkdown": "string",
  "createdAt": "ISO-8601"
}`;

const SYSTEM_PREFIX = `You are a pragmatic endurance coach for age-group athletes.
Be direct, practical, and specific. Not medical advice. No disclaimers.
Always respond with valid json only.`;

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
  normalize_plan: `Mode: normalize_plan.
Parse the uploaded training plan markdown into the TrainingPlan json schema.
Leave fields blank if unsure — do not invent sessions or dates.
Include phases, weeks with targets, plannedSessions when explicit in markdown, rules, readinessWarnings, gearChecklist, raceNotes when present.
Return json with two top-level keys: "coach" (CoachResponse with mode normalize_plan) and "plan" (TrainingPlan).
Coach summary should note what was extracted and any gaps.
Example plan shape: ${PLAN_JSON_EXAMPLE}
Example coach shape: ${COACH_JSON_EXAMPLE}`,

  daily_debrief: `Mode: daily_debrief.
Analyze the latest workout log against the current training week.
Return CoachResponse json. What went well, what looks risky, what tomorrow should consider.`,

  readiness_explain: `Mode: readiness_explain.
The deterministic readiness result is provided. Explain it in plain language.
You may respectfully challenge the deterministic result if data suggests otherwise — explain why.
Return CoachResponse json with practical adjustment in recommendedAction.`,

  missed_workout_fix: `Mode: missed_workout_fix.
Reshuffle missed sessions in the current week without cramming.
Never stack hard run + hard bike + heavy legs unless clearly justified.
Protect swim shoulder and run joints.
Return CoachResponse json with adjustments array listing specific session moves.`,

  weekly_review: `Mode: weekly_review.
Compare completed workouts vs planned week. Find patterns. Recommend next-week adjustments while keeping plan intent.
Return CoachResponse json.`,

  race_weakness_scan: `Mode: race_weakness_scan.
Identify what would expose the athlete on race day right now. Rank weaknesses by priority.
Include one practical fix per weakness in adjustments.
Return CoachResponse json.`,

  today_coach: `Mode: today_coach.
Given today's plan, recent logs, readiness, and optional user question — recommend what to do today.
Useful coach tone, not generic motivation.
Return CoachResponse json.`,

  plan_assistant: `Mode: plan_assistant.
You are a training-plan assistant in an ongoing conversation. Help the athlete adapt their plan to real life.

You CAN adapt: startDate, raceDate, totalWeeks, phase boundaries, weekly targetHours, longRide/longRun/longSwim, keyFocus, plannedSessions, and notes.
Use workout logs and readiness to judge if they are ahead, behind, or on track.

Rules:
- Ask 1-2 clarifying questions when critical info is missing (dates, injury, how far behind).
- When you have enough detail to make a concrete schedule change, include the full updated "plan" object.
- If only discussing options, omit "plan" and explain tradeoffs in assistantMessage.
- Preserve plan.id from context when updating. Keep rawMarkdown from context; you may append a short "Adapted on DATE: reason" line.
- Do not cram volume. Protect recovery. Shoulder-aware swim ramps.
- Be conversational in assistantMessage (2-5 sentences). Put structured bullets in coach.keyFindings.

Return json:
{
  "coach": ${COACH_JSON_EXAMPLE},
  "assistantMessage": "string — the chat reply the athlete reads",
  "plan": ${PLAN_JSON_EXAMPLE} // optional — only when proposing an apply-able plan update
}`,
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
}

function emptyCoach(mode: string): Record<string, unknown> {
  return {
    mode,
    summary: '',
    signal: 'neutral',
    keyFindings: [],
    recommendedAction: '',
    adjustments: [],
    warningFlags: [],
    questionsForUser: [],
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
  }

  const body = (req.body ?? {}) as RequestBody;
  const mode = body.mode ?? 'today_coach';
  const model =
    body.model === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : DEFAULT_MODEL;

  const systemPrompt = `${SYSTEM_PREFIX}

${MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.today_coach}

Respond with a single json object. Example coach: ${COACH_JSON_EXAMPLE}`;

  const userPayload = {
    mode,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    plan: body.plan,
    rawMarkdown: body.rawMarkdown?.slice(0, 120000),
    athleteProfile: body.athleteProfile,
    workoutLogs: body.workoutLogs?.slice(-40),
    readinessChecks: body.readinessChecks?.slice(-14),
    userQuestion: body.userQuestion,
    missedSessionTypes: body.missedSessionTypes,
    latestWorkoutId: body.latestWorkoutId,
    deterministicReadiness: body.deterministicReadiness,
  };

  const maxTokens =
    mode === 'normalize_plan' || mode === 'plan_assistant'
      ? 4000
      : mode === 'missed_workout_fix'
        ? 1200
        : 900;

  const chatHistory = (body.messages ?? []).slice(-24);
  const apiMessages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Reference context json (current plan, logs, athlete):\n${JSON.stringify(userPayload)}`,
    },
  ];

  if (mode === 'plan_assistant' && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      apiMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }
  } else {
    apiMessages.push({
      role: 'user',
      content: `Analyze this json input and return your json response:\n${JSON.stringify(userPayload)}`,
    });
  }

  try {
    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: mode === 'plan_assistant' ? 0.45 : 0.35,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({
        error: 'Model returned invalid json',
        raw: content.slice(0, 500),
      });
    }

    const coachRaw =
      (parsed.coach as Record<string, unknown>) ??
      (parsed.mode ? parsed : emptyCoach(mode));
    const coach = normalizeCoach(coachRaw, mode);

    const assistantMessage = String(
      parsed.assistantMessage ?? (parsed.coach as Record<string, unknown>)?.summary ?? coach.summary,
    );

    const response: { coach: unknown; plan?: unknown; assistantMessage: string } = {
      coach,
      assistantMessage,
    };

    if ((mode === 'normalize_plan' || mode === 'plan_assistant') && parsed.plan) {
      response.plan = parsed.plan;
    }

    return res.status(200).json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upstream error';
    return res.status(500).json({ error: msg });
  }
}
