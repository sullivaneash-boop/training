import type { AthleteProfile, OnboardingState, TrainingPlan } from './types';

export async function syncUserBootstrap(payload: {
  onboarding: OnboardingState;
  athleteProfile?: AthleteProfile;
  plan?: TrainingPlan | null;
}) {
  const res = await fetch('/api/user/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Bootstrap sync failed (${res.status})`);
  }
}

