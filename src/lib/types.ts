// ─── Athlete ───────────────────────────────────────────────────────────────

export type AthleteGoal = 'finish' | 'finish_strong' | 'pr' | 'unknown';
export type Discipline = 'swim' | 'bike' | 'run' | 'strength' | 'unknown';

export type AthleteProfile = {
  id: string;
  name?: string;
  age?: number;
  goal: AthleteGoal;
  currentRace?: string;
  preferredRestDay?: string;
  weeklyHoursAvailable?: number;
  weakestDiscipline?: Discipline;
  injuryNotes?: string;
  swimBaseline?: string;
  bikeBaseline?: string;
  runBaseline?: string;
  strengthBaseline?: string;
};

// ─── Workouts ──────────────────────────────────────────────────────────────

export type WorkoutType =
  | 'swim'
  | 'bike'
  | 'run'
  | 'brick'
  | 'strength'
  | 'mobility'
  | 'rest'
  | 'other';

export type DistanceUnit = 'mi' | 'km' | 'yd' | 'm';

export type WorkoutLog = {
  id: string;
  date: string;
  planId?: string;
  weekNumber?: number;
  type: WorkoutType;
  plannedTitle?: string;
  completed: boolean;
  durationMinutes?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  rpe?: number;
  soreness?: number;
  sleepHours?: number;
  restingHr?: number;
  shoulderPain?: boolean;
  kneePain?: boolean;
  notes?: string;
  source: 'manual' | 'shortcut' | 'import';
  createdAt: string;
};

// ─── Readiness ─────────────────────────────────────────────────────────────

export type ReadinessResult = 'green' | 'yellow' | 'red';

export type ReadinessCheck = {
  id: string;
  date: string;
  sleepHours?: number;
  soreness?: number;
  motivation?: number;
  restingHr?: number;
  shoulderPain?: boolean;
  kneePain?: boolean;
  stress?: number;
  result: ReadinessResult;
  deterministicReason: string;
  aiReason?: string;
  createdAt: string;
};

// ─── Training plan ─────────────────────────────────────────────────────────

export type PlannedSession = {
  day?: string;
  type?: string;
  title?: string;
  duration?: string;
  details?: string;
  intensity?: string;
};

export type PlanPhase = {
  name: string;
  startWeek: number;
  endWeek: number;
  goal?: string;
};

export type PlanWeek = {
  week: number;
  phase?: string;
  targetHours?: number;
  longRide?: string;
  longRun?: string;
  longSwim?: string;
  keyFocus?: string;
  plannedSessions?: PlannedSession[];
  notes?: string[];
};

export type TrainingPlan = {
  id: string;
  name: string;
  raceName?: string;
  raceDate?: string;
  startDate?: string;
  totalWeeks?: number;
  sportTypes: string[];
  phases: PlanPhase[];
  weeks: PlanWeek[];
  rules?: string[];
  readinessWarnings?: string[];
  gearChecklist?: string[];
  raceNotes?: string[];
  rawMarkdown: string;
  createdAt: string;
};

// ─── DeepSeek / Coach ───────────────────────────────────────────────────────

export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro';

export type DeepSeekMode =
  | 'normalize_plan'
  | 'daily_debrief'
  | 'readiness_explain'
  | 'missed_workout_fix'
  | 'weekly_review'
  | 'race_weakness_scan'
  | 'today_coach';

export type CoachSignal = 'green' | 'yellow' | 'red' | 'neutral';

export type CoachResponse = {
  mode: string;
  summary: string;
  signal: CoachSignal;
  keyFindings: string[];
  recommendedAction: string;
  adjustments: {
    action: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  warningFlags: string[];
  questionsForUser: string[];
};

export type DeepSeekRequest = {
  mode: DeepSeekMode;
  plan?: TrainingPlan;
  rawMarkdown?: string;
  athleteProfile?: AthleteProfile;
  workoutLogs?: WorkoutLog[];
  readinessChecks?: ReadinessCheck[];
  userQuestion?: string;
  date?: string;
  missedSessionTypes?: string[];
  latestWorkoutId?: string;
  model?: DeepSeekModel;
  deterministicReadiness?: { result: string; reason: string };
};

export type DeepSeekApiResponse = {
  coach: CoachResponse;
  plan?: TrainingPlan;
};

export type CoachInsight = {
  id: string;
  date: string;
  mode: DeepSeekMode;
  planId?: string;
  requestSummary: string;
  response: CoachResponse;
  createdAt: string;
};

// ─── Settings ──────────────────────────────────────────────────────────────

export type AiSafetyMode = 'disabled' | 'on_demand' | 'auto_after_workout';

export type AppSettings = {
  aiSafetyMode: AiSafetyMode;
  deepseekModel: DeepSeekModel;
  showJsonDebug: boolean;
};
