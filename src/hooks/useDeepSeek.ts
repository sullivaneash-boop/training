import { useCallback, useState } from 'react';
import type { CoachResponse, DeepSeekMode, DeepSeekRequest } from '../lib/types';
import { callDeepSeek, saveInsightFromResponse } from '../lib/deepseek';
import { isAiEnabled } from '../lib/storage';
import { useTrainingData } from './useTrainingData';

export function useDeepSeek() {
  const { plan, athlete, workouts, readiness, settings, refresh } = useTrainingData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CoachResponse | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

  const ask = useCallback(
    async (
      mode: DeepSeekMode,
      extra: Partial<DeepSeekRequest> = {},
      opts?: { saveInsight?: boolean; requestSummary?: string },
    ): Promise<CoachResponse | null> => {
      if (!isAiEnabled()) {
        setError('AI is disabled in Settings. Set to on-demand or auto.');
        return null;
      }

      setLoading(true);
      setError(null);
      setResponse(null);
      setRawJson(null);

      try {
        const result = await callDeepSeek(
          {
            mode,
            plan: plan ?? undefined,
            athleteProfile: athlete ?? undefined,
            workoutLogs: workouts,
            readinessChecks: readiness,
            date: new Date().toISOString().slice(0, 10),
            ...extra,
          },
          settings.deepseekModel,
        );

        setResponse(result.coach);
        setRawJson(JSON.stringify(result, null, 2));

        if (opts?.saveInsight !== false) {
          saveInsightFromResponse(mode, result.coach, {
            planId: plan?.id,
            requestSummary: opts?.requestSummary ?? mode,
          });
          refresh();
        }

        return result.coach;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'DeepSeek request failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [plan, athlete, workouts, readiness, settings.deepseekModel, refresh],
  );

  const clear = useCallback(() => {
    setResponse(null);
    setError(null);
    setRawJson(null);
  }, []);

  return {
    ask,
    clear,
    loading,
    error,
    response,
    rawJson,
    showDebug: settings.showJsonDebug,
    aiEnabled: isAiEnabled(),
    model: settings.deepseekModel,
  };
}
