import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { addWorkout, loadPlan, loadSettings, isAiEnabled } from '../lib/storage';
import { callDeepSeek } from '../lib/deepseek';
import type { DistanceUnit, WorkoutType } from '../lib/types';
import { getWeekNumber } from '../lib/weekUtils';

const VALID_TYPES: WorkoutType[] = [
  'swim',
  'bike',
  'run',
  'strength',
  'brick',
  'mobility',
  'rest',
  'other',
];

export function ShortcutLog() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const type = (params.get('type') ?? 'other').toLowerCase() as WorkoutType;
    const duration = parseInt(params.get('duration') ?? '0', 10);
    const rpe = params.get('rpe') ? parseInt(params.get('rpe')!, 10) : undefined;
    const soreness = params.get('soreness')
      ? parseInt(params.get('soreness')!, 10)
      : undefined;
    const sleep = params.get('sleep') ? parseFloat(params.get('sleep')!) : undefined;
    const notes = params.get('notes') ?? undefined;
    const distRaw = params.get('distance');
    const distanceUnit = (params.get('distanceUnit') ?? 'mi') as DistanceUnit;
    const completed = params.get('completed') !== '0';
    const date = params.get('date') ?? new Date().toISOString().slice(0, 10);

    if (!duration || duration <= 0) {
      setStatus('error');
      setMessage('Missing duration. Example: ?type=run&duration=45');
      return;
    }

    const workoutType = VALID_TYPES.includes(type) ? type : 'other';
    const plan = loadPlan();

    const entry = addWorkout({
      date,
      type: workoutType,
      planId: plan?.id,
      weekNumber: plan ? getWeekNumber(plan, new Date(date + 'T12:00:00')) : undefined,
      durationMinutes: duration,
      distance: distRaw ? parseFloat(distRaw) : undefined,
      distanceUnit: distRaw ? distanceUnit : undefined,
      rpe,
      soreness,
      sleepHours: sleep,
      notes,
      completed,
      source: 'shortcut',
    });

    setStatus('ok');
    setMessage(`Logged ${workoutType} ${duration}min on ${date}`);

    const settings = loadSettings();
    if (settings.aiSafetyMode === 'auto_after_workout' && isAiEnabled()) {
      callDeepSeek(
        { mode: 'daily_debrief', latestWorkoutId: entry.id, plan: plan ?? undefined },
        settings.deepseekModel,
      ).catch(() => {});
    }
  }, [params]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white">
      {status === 'pending' && <p className="text-zinc-400">Saving…</p>}
      {status === 'ok' && (
        <>
          <p className="text-4xl">✓</p>
          <p className="mt-4 text-lg">{message}</p>
          <Link to="/" className="mt-8 text-[#4a53ff] underline">
            Back to Today
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-red-400">{message}</p>
          <Link to="/log" className="mt-8 text-[#4a53ff] underline">
            Log manually
          </Link>
        </>
      )}
    </div>
  );
}
