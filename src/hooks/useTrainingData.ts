import { useCallback, useEffect, useState } from 'react';
import type {
  AppSettings,
  AthleteProfile,
  CoachInsight,
  OnboardingState,
  ReadinessCheck,
  TrainingPlan,
  WorkoutLog,
} from '../lib/types';
import {
  loadAthlete,
  loadCoachInsights,
  loadPlan,
  loadReadiness,
  loadSettings,
  loadOnboarding,
  loadWorkouts,
  saveOnboarding,
  saveAthlete,
  saveCoachInsights,
  savePlan,
  saveReadiness,
  saveSettings,
  saveWorkouts,
} from '../lib/storage';

export function useTrainingData() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [readiness, setReadiness] = useState<ReadinessCheck[]>([]);
  const [insights, setInsights] = useState<CoachInsight[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState>(loadOnboarding());
  const [settings, setSettings] = useState<AppSettings>({
    aiSafetyMode: 'on_demand',
    deepseekModel: 'deepseek-v4-flash',
    showJsonDebug: false,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setPlan(loadPlan());
    setAthlete(loadAthlete());
    setWorkouts(loadWorkouts());
    setReadiness(loadReadiness());
    setInsights(loadCoachInsights());
    setOnboarding(loadOnboarding());
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    async function init() {
      setPlan(loadPlan());
      setAthlete(loadAthlete());
      setWorkouts(loadWorkouts());
      setReadiness(loadReadiness());
      setInsights(loadCoachInsights());
      setOnboarding(loadOnboarding());
      setSettings(loadSettings());
      setLoading(false);
    }
    init();
  }, []);

  const updatePlan = useCallback((p: TrainingPlan) => {
    savePlan(p);
    setPlan(p);
  }, []);

  const updateAthlete = useCallback((a: AthleteProfile) => {
    saveAthlete(a);
    setAthlete(a);
  }, []);

  const updateWorkouts = useCallback((logs: WorkoutLog[]) => {
    saveWorkouts(logs);
    setWorkouts(logs);
  }, []);

  const updateReadiness = useCallback((logs: ReadinessCheck[]) => {
    saveReadiness(logs);
    setReadiness(logs);
  }, []);

  const updateInsights = useCallback((list: CoachInsight[]) => {
    saveCoachInsights(list);
    setInsights(list);
  }, []);

  const updateSettings = useCallback((s: AppSettings) => {
    saveSettings(s);
    setSettings(s);
  }, []);

  const updateOnboarding = useCallback((state: OnboardingState) => {
    saveOnboarding(state);
    setOnboarding(state);
  }, []);

  return {
    plan,
    athlete,
    workouts,
    readiness,
    insights,
    onboarding,
    settings,
    loading,
    refresh,
    updatePlan,
    updateAthlete,
    updateWorkouts,
    updateReadiness,
    updateInsights,
    updateOnboarding,
    updateSettings,
  };
}
