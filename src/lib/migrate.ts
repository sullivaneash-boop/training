import type { ReadinessCheck, TrainingPlan, WorkoutLog } from './types';

/** Migrate legacy stored shapes to current schema (in-memory only). */

export function migratePlan(raw: unknown): TrainingPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  if (Array.isArray(p.weeks) && p.weeks[0] && 'week' in (p.weeks[0] as object)) {
    return raw as TrainingPlan;
  }

  const legacy = raw as {
    id: string;
    name: string;
    raceDate?: string;
    planStartDate?: string;
    startDate?: string;
    totalWeeks?: number;
    rawMarkdown: string;
    phases?: { name: string; label?: string; startWeek: number; endWeek: number; goal?: string }[];
    weeks?: {
      weekNumber: number;
      phase: string;
      phaseLabel?: string;
      targetHours?: number;
      longRide?: string;
      longRun?: string;
      longSwim?: string;
      keyFocus?: string;
      isDeload?: boolean;
    }[];
    phaseTemplates?: {
      phase: string;
      days: { day: string; label: string; description: string }[];
    }[];
    importedAt?: string;
    createdAt?: string;
  };

  const phaseTemplates = legacy.phaseTemplates ?? [];
  const weeks = (legacy.weeks ?? []).map((w) => {
    const template = phaseTemplates.find((t) => t.phase === w.phase);
    const plannedSessions = template?.days.map((d) => ({
      day: d.day,
      title: d.label,
      details: d.description,
      type: inferTypeFromText(d.description),
    }));
    const notes: string[] = [];
    if (w.isDeload) notes.push('Deload week');
    return {
      week: w.weekNumber,
      phase: w.phaseLabel ?? w.phase,
      targetHours: w.targetHours,
      longRide: w.longRide,
      longRun: w.longRun,
      longSwim: w.longSwim,
      keyFocus: w.keyFocus,
      plannedSessions,
      notes: notes.length ? notes : undefined,
    };
  });

  return {
    id: legacy.id,
    name: legacy.name,
    raceDate: legacy.raceDate,
    raceName: legacy.name,
    startDate: legacy.startDate ?? legacy.planStartDate,
    totalWeeks: legacy.totalWeeks,
    sportTypes: ['swim', 'bike', 'run'],
    phases: (legacy.phases ?? []).map((ph) => ({
      name: ph.label ?? ph.name,
      startWeek: ph.startWeek,
      endWeek: ph.endWeek,
      goal: ph.goal,
    })),
    weeks,
    rawMarkdown: legacy.rawMarkdown,
    createdAt: legacy.createdAt ?? legacy.importedAt ?? new Date().toISOString(),
  };
}

function inferTypeFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('swim')) return 'swim';
  if (t.includes('bike') || t.includes('ride')) return 'bike';
  if (t.includes('run') || t.includes('jog')) return 'run';
  if (t.includes('strength') || t.includes('lift')) return 'strength';
  if (t.includes('rest')) return 'rest';
  if (t.includes('brick')) return 'brick';
  return 'other';
}

export function migrateWorkout(raw: unknown): WorkoutLog {
  const w = raw as WorkoutLog & { distance?: number | string };
  if (typeof w.distance === 'string') {
    const parsed = parseDistanceString(w.distance);
    return { ...w, distance: parsed.value, distanceUnit: parsed.unit ?? w.distanceUnit };
  }
  return w;
}

function parseDistanceString(s: string): { value?: number; unit?: WorkoutLog['distanceUnit'] } {
  const m = s.match(/^([\d.]+)\s*(mi|km|yd|m)?/i);
  if (!m) return {};
  const unit = m[2]?.toLowerCase() as WorkoutLog['distanceUnit'] | undefined;
  return { value: parseFloat(m[1]), unit };
}

export function migrateReadiness(raw: unknown): ReadinessCheck {
  const r = raw as ReadinessCheck & {
    status?: string;
    why?: string;
    sleep?: number;
  };
  if ('result' in r && r.result) return r;
  return {
    id: r.id,
    date: r.date,
    sleepHours: r.sleepHours ?? r.sleep,
    soreness: r.soreness,
    motivation: r.motivation,
    restingHr: r.restingHr,
    shoulderPain: r.shoulderPain,
    kneePain: r.kneePain,
    stress: r.stress,
    result: (r.status ?? r.result ?? 'green') as ReadinessCheck['result'],
    deterministicReason: r.deterministicReason ?? r.why ?? '',
    aiReason: r.aiReason,
    createdAt: r.createdAt,
  };
}

export function migrateSettings(raw: unknown): import('./types').AppSettings {
  const s = raw as Record<string, unknown>;
  if (s.aiSafetyMode) {
    return {
      aiSafetyMode: s.aiSafetyMode as import('./types').AiSafetyMode,
      deepseekModel: (s.deepseekModel as import('./types').DeepSeekModel) ?? 'deepseek-v4-flash',
      showJsonDebug: Boolean(s.showJsonDebug),
    };
  }
  const legacy = s.aiCoachMode as string | undefined;
  let aiSafetyMode: import('./types').AiSafetyMode = 'on_demand';
  if (legacy === 'off') aiSafetyMode = 'disabled';
  else if (legacy === 'api') aiSafetyMode = 'on_demand';
  return {
    aiSafetyMode,
    deepseekModel: 'deepseek-v4-flash',
    showJsonDebug: false,
  };
}
