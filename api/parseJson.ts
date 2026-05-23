/** Best-effort JSON parse for LLM outputs (fences, prose, truncation). */

export function parseModelJson(content: string): Record<string, unknown> | null {
  let text = content.trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const attempts = [text];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    attempts.push(text.slice(start, end + 1));
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* next */
    }
  }

  return repairFromFragments(text);
}

function repairFromFragments(text: string): Record<string, unknown> | null {
  const assistantMessage = extractJsonStringField(text, 'assistantMessage')
    ?? extractJsonStringField(text, 'summary');

  const planPatch = extractNestedObject(text, 'planPatch');
  const coach = extractNestedObject(text, 'coach');

  if (!assistantMessage && !planPatch && !coach) return null;

  const result: Record<string, unknown> = {};

  if (assistantMessage) result.assistantMessage = assistantMessage;

  if (planPatch) result.planPatch = planPatch;

  if (coach && typeof coach === 'object') {
    result.coach = coach;
  } else if (assistantMessage) {
    result.coach = {
      mode: 'plan_assistant',
      summary: assistantMessage,
      signal: 'neutral',
      keyFindings: [],
      recommendedAction: '',
      adjustments: [],
      warningFlags: [],
      questionsForUser: [],
    };
  }

  return Object.keys(result).length > 0 ? result : null;
}

function extractJsonStringField(text: string, field: string): string | null {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
  const m = text.match(re);
  return m ? unescapeJsonString(m[1]) : null;
}

function extractNestedObject(text: string, field: string): Record<string, unknown> | null {
  const idx = text.indexOf(`"${field}"`);
  if (idx < 0) return null;
  const braceStart = text.indexOf('{', idx);
  if (braceStart < 0) return null;

  let depth = 0;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(braceStart, i + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
