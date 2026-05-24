import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, getBetterAuthSession } from '../lib/auth.js';
import { hasUserDataDb, upsertUserBootstrap } from '../lib/userData.js';

type Body = {
  onboarding?: unknown;
  athleteProfile?: unknown;
  plan?: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await requireAuth(req, res))) return;

  if (!hasUserDataDb()) {
    return res.status(503).json({ error: 'DATABASE_URL is not configured' });
  }

  const session = await getBetterAuthSession(req);
  const userId = session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'No authenticated user session found' });
  }

  try {
    const body = (req.body ?? {}) as Body;
    await upsertUserBootstrap({
      userId,
      onboardingState: body.onboarding,
      athleteProfile: body.athleteProfile,
      trainingPlan: body.plan,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to persist user state';
    return res.status(500).json({ error: message });
  }
}

