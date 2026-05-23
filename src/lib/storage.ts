import type {
  AppSettings,
  AthleteProfile,
  ChatMessage,
  ChatSession,
  CoachInsight,
  ReadinessCheck,
  TrainingPlan,
  WorkoutLog,
} from './types';
import { parseTrainingPlanMarkdown, validatePlan } from './planParser';
import { migratePlan, migrateReadiness, migrateSettings, migrateWorkout } from './migrate';

const KEYS = {
  plan: 'training-plan-active',
  workouts: 'training-workouts',
  readiness: 'training-readiness',
  athlete: 'training-athlete',
  insights: 'training-coach-insights',
  settings: 'training-settings',
  chat: 'training-chat-session',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  aiSafetyMode: 'on_demand',
  deepseekModel: 'deepseek-v4-flash',
  showJsonDebug: false,
};

const DEFAULT_ATHLETE: AthleteProfile = {
  id: 'athlete-1',
  goal: 'unknown',
};

// ─── Plan ────────────────────────────────────────────────────────────────────

export function loadPlan(): TrainingPlan | null {
  try {
    const raw = localStorage.getItem(KEYS.plan);
    if (!raw) return null;
    return migratePlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePlan(plan: TrainingPlan): void {
  localStorage.setItem(KEYS.plan, JSON.stringify(plan));
}

// ─── Athlete ───────────────────────────────────────────────────────────────

export function loadAthlete(): AthleteProfile {
  try {
    const raw = localStorage.getItem(KEYS.athlete);
    return raw ? { ...DEFAULT_ATHLETE, ...(JSON.parse(raw) as AthleteProfile) } : DEFAULT_ATHLETE;
  } catch {
    return DEFAULT_ATHLETE;
  }
}

export function saveAthlete(profile: AthleteProfile): void {
  localStorage.setItem(KEYS.athlete, JSON.stringify(profile));
}

// ─── Workouts ──────────────────────────────────────────────────────────────

export function loadWorkouts(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(KEYS.workouts);
    if (!raw) return [];
    return (JSON.parse(raw) as unknown[]).map(migrateWorkout);
  } catch {
    return [];
  }
}

export function saveWorkouts(logs: WorkoutLog[]): void {
  localStorage.setItem(KEYS.workouts, JSON.stringify(logs));
}

export function addWorkout(log: Omit<WorkoutLog, 'id' | 'createdAt'>): WorkoutLog {
  const entry: WorkoutLog = {
    ...log,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = [...loadWorkouts(), entry];
  saveWorkouts(all);
  return entry;
}

export function getWorkoutById(id: string): WorkoutLog | undefined {
  return loadWorkouts().find((w) => w.id === id);
}

// ─── Readiness ─────────────────────────────────────────────────────────────

export function loadReadiness(): ReadinessCheck[] {
  try {
    const raw = localStorage.getItem(KEYS.readiness);
    if (!raw) return [];
    return (JSON.parse(raw) as unknown[]).map(migrateReadiness);
  } catch {
    return [];
  }
}

export function saveReadiness(logs: ReadinessCheck[]): void {
  localStorage.setItem(KEYS.readiness, JSON.stringify(logs));
}

export function addReadiness(
  entry: Omit<ReadinessCheck, 'id' | 'createdAt'>,
): ReadinessCheck {
  const log: ReadinessCheck = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = [...loadReadiness(), log];
  saveReadiness(all);
  return log;
}

export function updateReadinessAiReason(id: string, aiReason: string): void {
  const all = loadReadiness().map((r) => (r.id === id ? { ...r, aiReason } : r));
  saveReadiness(all);
}

// ─── Coach insights ────────────────────────────────────────────────────────

export function loadCoachInsights(): CoachInsight[] {
  try {
    const raw = localStorage.getItem(KEYS.insights);
    return raw ? (JSON.parse(raw) as CoachInsight[]) : [];
  } catch {
    return [];
  }
}

export function saveCoachInsights(insights: CoachInsight[]): void {
  localStorage.setItem(KEYS.insights, JSON.stringify(insights));
}

export function addCoachInsight(
  entry: Omit<CoachInsight, 'id' | 'createdAt'>,
): CoachInsight {
  const insight: CoachInsight = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = [insight, ...loadCoachInsights()].slice(0, 100);
  saveCoachInsights(all);
  return insight;
}

// ─── Settings ──────────────────────────────────────────────────────────────

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? migrateSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function isAiEnabled(): boolean {
  return loadSettings().aiSafetyMode !== 'disabled';
}

// ─── Plan assistant chat ───────────────────────────────────────────────────

export function loadChatSession(planId: string): ChatSession {
  try {
    const raw = localStorage.getItem(KEYS.chat);
    if (!raw) return { planId, messages: [], updatedAt: new Date().toISOString() };
    const session = JSON.parse(raw) as ChatSession;
    if (session.planId !== planId) {
      return { planId, messages: [], updatedAt: new Date().toISOString() };
    }
    return session;
  } catch {
    return { planId, messages: [], updatedAt: new Date().toISOString() };
  }
}

export function saveChatSession(session: ChatSession): void {
  localStorage.setItem(KEYS.chat, JSON.stringify(session));
}

export function appendChatMessage(planId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  const session = loadChatSession(planId);
  const entry: ChatMessage = {
    ...msg,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  session.messages.push(entry);
  session.updatedAt = new Date().toISOString();
  if (session.messages.length > 80) session.messages = session.messages.slice(-80);
  saveChatSession(session);
  return entry;
}

export function clearChatSession(planId: string): void {
  saveChatSession({ planId, messages: [], updatedAt: new Date().toISOString() });
}

export function mergePlanUpdate(existing: TrainingPlan, proposed: TrainingPlan): TrainingPlan {
  const adaptationNote = `\n\n---\n_Plan adapted ${new Date().toISOString().slice(0, 10)} via assistant._`;
  return {
    ...existing,
    name: proposed.name || existing.name,
    raceName: proposed.raceName ?? existing.raceName,
    raceDate: proposed.raceDate ?? existing.raceDate,
    startDate: proposed.startDate ?? existing.startDate,
    totalWeeks: proposed.totalWeeks ?? existing.totalWeeks,
    sportTypes: proposed.sportTypes?.length ? proposed.sportTypes : existing.sportTypes,
    phases: proposed.phases?.length ? proposed.phases : existing.phases,
    weeks: proposed.weeks?.length ? proposed.weeks : existing.weeks,
    rules: proposed.rules ?? existing.rules,
    readinessWarnings: proposed.readinessWarnings ?? existing.readinessWarnings,
    gearChecklist: proposed.gearChecklist ?? existing.gearChecklist,
    raceNotes: proposed.raceNotes ?? existing.raceNotes,
    id: existing.id,
    createdAt: existing.createdAt,
    rawMarkdown: proposed.rawMarkdown?.includes(existing.rawMarkdown.slice(0, 50))
      ? proposed.rawMarkdown
      : existing.rawMarkdown + adaptationNote,
  };
}

// ─── Import / export ───────────────────────────────────────────────────────

export function exportAllData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      plan: loadPlan(),
      athlete: loadAthlete(),
      workouts: loadWorkouts(),
      readiness: loadReadiness(),
      insights: loadCoachInsights(),
      settings: loadSettings(),
    },
    null,
    2,
  );
}

export function importAllData(json: string): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(json) as {
      plan?: TrainingPlan;
      athlete?: AthleteProfile;
      workouts?: WorkoutLog[];
      readiness?: ReadinessCheck[];
      insights?: CoachInsight[];
      settings?: AppSettings;
    };
    if (data.plan) {
      const migrated = migratePlan(data.plan);
      if (migrated) savePlan(migrated);
    }
    if (data.athlete) saveAthlete(data.athlete);
    if (data.workouts) saveWorkouts(data.workouts.map(migrateWorkout));
    if (data.readiness) saveReadiness(data.readiness.map(migrateReadiness));
    if (data.insights) saveCoachInsights(data.insights);
    if (data.settings) saveSettings(migrateSettings(data.settings));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Invalid JSON file' };
  }
}

export function exportWorkoutsCsv(): string {
  const logs = loadWorkouts();
  const headers = [
    'date',
    'type',
    'durationMinutes',
    'distance',
    'distanceUnit',
    'rpe',
    'soreness',
    'completed',
    'notes',
    'source',
  ];
  const rows = logs.map((l) =>
    [
      l.date,
      l.type,
      l.durationMinutes ?? '',
      l.distance ?? '',
      l.distanceUnit ?? '',
      l.rpe ?? '',
      l.soreness ?? '',
      l.completed,
      `"${(l.notes ?? '').replace(/"/g, '""')}"`,
      l.source,
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function loadDefaultPlan(): Promise<TrainingPlan | null> {
  try {
    const res = await fetch('/default-training-plan.md');
    if (!res.ok) return null;
    const md = await res.text();
    const { plan } = parseTrainingPlanMarkdown(md, 'default-sample');
    const errors = validatePlan(plan);
    if (errors.length) console.warn('Default plan validation:', errors);
    return plan;
  } catch {
    return null;
  }
}
