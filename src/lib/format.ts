import type { AthleteGoal } from './types';

export function formatRaceDate(iso?: string): string {
  if (!iso) return 'Date not set';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function goalLabel(goal: AthleteGoal): string {
  const labels: Record<AthleteGoal, string> = {
    finish: 'Finish the race',
    finish_strong: 'Finish strong',
    pr: 'Hit a PR',
    unknown: 'Stay consistent',
  };
  return labels[goal];
}

export function readinessAction(result: 'green' | 'yellow' | 'red'): string {
  switch (result) {
    case 'green':
      return 'Train as planned';
    case 'yellow':
      return 'Ease up today';
    case 'red':
      return 'Recovery only';
  }
}
