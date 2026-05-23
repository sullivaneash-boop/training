import { useCallback, useEffect, useState } from 'react';
import type {
  AppSettings,
  AthleteProfile,
  CoachInsight,
  ReadinessCheck,
  TrainingPlan,
  WorkoutLog,
} from '../lib/types';
import {
  loadAthlete,
  loadCoachInsights,
  loadDefaultPlan,
  loadPlan,
  loadReadiness,
  loadSettings,
  loadWorkouts,
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
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    async function init() {
      let p = loadPlan();
      if (!p) {
        p = await loadDefaultPlan();
        if (p) savePlan(p);
      }
      setPlan(p);
      setAthlete(loadAthlete());
      setWorkouts(loadWorkouts());
      setReadiness(loadReadiness());
      setInsights(loadCoachInsights());
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

  return {
    plan,
    athlete,
    workouts,
    readiness,
    insights,
    settings,
    loading,
    refresh,
    updatePlan,
    updateAthlete,
    updateWorkouts,
    updateReadiness,
    updateInsights,
    updateSettings,
  };
}
