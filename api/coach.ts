import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-v4-flash';

type CoachMode =
  | 'debrief_summary'
  | 'weekly_review'
  | 'reshuffle_missed'
  | 'readiness_explain'
  | 'weakness_detection';

const MODE_PROMPTS: Record<CoachMode, string> = {
  debrief_summary:
    'Summarize recent workout debriefs in 2-3 sentences. Note patterns in RPE, soreness, and volume. JSON only.',
  weekly_review:
    'Review this week vs plan. Be direct. JSON only with: summary, suggestedAdjustment, warningFlags (array), nextAction.',
  reshuffle_missed:
    'Suggest how to reshuffle missed sessions into the next 7 days without heroics. JSON only.',
  readiness_explain:
    'Explain readiness signals in plain language for an athlete (not medical advice). JSON only.',
  weakness_detection:
    'Identify likely race-day weaknesses from training data. JSON only.',
};

interface CoachBody {
  mode: CoachMode;
  planSummary: string;
  currentWeek: unknown;
  workoutLogs: unknown[];
  readinessLogs: unknown[];
  userNotes?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured on server' });
  }

  const body = req.body as CoachBody;
  const mode = body.mode ?? 'weekly_review';
  const systemPrompt = `You are a pragmatic endurance coach. Be concise, direct, no disclaimers.
Respond ONLY with valid JSON matching this shape:
{"summary":"string","suggestedAdjustment":"string","warningFlags":["string"],"nextAction":"string"}
${MODE_PROMPTS[mode] ?? MODE_PROMPTS.weekly_review}`;

  const userContent = JSON.stringify(
    {
      plan: body.planSummary,
      currentWeek: body.currentWeek,
      workouts: body.workoutLogs?.slice(-30),
      readiness: body.readinessLogs?.slice(-14),
      notes: body.userNotes,
    },
    null,
    0,
  );

  try {
    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 600,
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
      parsed = { summary: content, suggestedAdjustment: '', warningFlags: [], nextAction: '' };
    }

    return res.status(200).json({
      summary: String(parsed.summary ?? ''),
      suggestedAdjustment: String(parsed.suggestedAdjustment ?? ''),
      warningFlags: Array.isArray(parsed.warningFlags) ? parsed.warningFlags.map(String) : [],
      nextAction: String(parsed.nextAction ?? ''),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upstream error';
    return res.status(500).json({ error: msg });
  }
}
