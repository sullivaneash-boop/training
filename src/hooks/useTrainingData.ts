import { useCallback, useEffect, useState } from 'react';
import type { AppSettings, ReadinessLog, TrainingPlan, WorkoutLog } from '../lib/types';
import {
  loadDefaultPlan,
  loadPlan,
  loadReadiness,
  loadSettings,
  loadWorkouts,
  savePlan,
  saveReadiness,
  saveSettings,
  saveWorkouts,
} from '../lib/storage';

export function useTrainingData() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [readiness, setReadiness] = useState<ReadinessLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ aiCoachMode: 'manual' });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setPlan(loadPlan());
    setWorkouts(loadWorkouts());
    setReadiness(loadReadiness());
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
      setWorkouts(loadWorkouts());
      setReadiness(loadReadiness());
      setSettings(loadSettings());
      setLoading(false);
    }
    init();
  }, []);

  const updatePlan = useCallback((p: TrainingPlan) => {
    savePlan(p);
    setPlan(p);
  }, []);

  const updateWorkouts = useCallback((logs: WorkoutLog[]) => {
    saveWorkouts(logs);
    setWorkouts(logs);
  }, []);

  const updateReadiness = useCallback((logs: ReadinessLog[]) => {
    saveReadiness(logs);
    setReadiness(logs);
  }, []);

  const updateSettings = useCallback((s: AppSettings) => {
    saveSettings(s);
    setSettings(s);
  }, []);

  return {
    plan,
    workouts,
    readiness,
    settings,
    loading,
    refresh,
    updatePlan,
    updateWorkouts,
    updateReadiness,
    updateSettings,
  };
}
