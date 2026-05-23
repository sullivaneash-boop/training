export type PhaseName = 'base' | 'build' | 'peak' | 'taper' | 'race' | 'unknown';

export type WorkoutType =
  | 'swim'
  | 'bike'
  | 'run'
  | 'strength'
  | 'brick'
  | 'rest'
  | 'mobility'
  | 'other';

export type ReadinessStatus = 'green' | 'yellow' | 'red';

export type AiCoachMode = 'off' | 'manual' | 'api';

export interface PhaseDefinition {
  name: PhaseName;
  label: string;
  startWeek: number;
  endWeek: number;
  goal?: string;
}

export interface DayTemplate {
  day: string;
  label: string;
  description: string;
}

export interface PhaseWeekTemplate {
  phase: PhaseName;
  days: DayTemplate[];
}

export interface WeekPlan {
  weekNumber: number;
  phase: PhaseName;
  phaseLabel: string;
  targetHours: number;
  longRide: string;
  longRun: string;
  longSwim: string;
  keyFocus: string;
  isDeload: boolean;
}

export interface TrainingPlan {
  id: string;
  name: string;
  raceDate: string;
  planStartDate: string;
  totalWeeks: number;
  rawMarkdown: string;
  phases: PhaseDefinition[];
  weeks: WeekPlan[];
  phaseTemplates: PhaseWeekTemplate[];
  importedAt: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  type: WorkoutType;
  durationMinutes: number;
  distance?: string;
  rpe?: number;
  soreness?: number;
  sleepHours?: number;
  notes?: string;
  completed: boolean;
  source: 'manual' | 'shortcut' | 'import';
  createdAt: string;
}

export interface ReadinessLog {
  id: string;
  date: string;
  sleep: number;
  soreness: number;
  motivation: number;
  restingHr?: number;
  shoulderPain: boolean;
  kneePain: boolean;
  status: ReadinessStatus;
  why: string;
  createdAt: string;
}

export interface AppSettings {
  aiCoachMode: AiCoachMode;
}

export interface CoachApiRequest {
  mode:
    | 'debrief_summary'
    | 'weekly_review'
    | 'reshuffle_missed'
    | 'readiness_explain'
    | 'weakness_detection';
  planSummary: string;
  currentWeek: unknown;
  workoutLogs: WorkoutLog[];
  readinessLogs: ReadinessLog[];
  userNotes?: string;
}

export interface CoachApiResponse {
  summary: string;
  suggestedAdjustment: string;
  warningFlags: string[];
  nextAction: string;
}
