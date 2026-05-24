import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authStatus,
  isBetterAuthEnabled,
  isAuthEnabled,
  isRequestAuthenticatedAny,
} from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const status = authStatus();
  const requiresAuth = isBetterAuthEnabled() || isAuthEnabled();

  if (!requiresAuth) {
    return res.status(200).json({
      authenticated: true,
      authRequired: false,
      ...status,
    });
  }

  const authenticated = await isRequestAuthenticatedAny(req);
  return res.status(200).json({
    authenticated,
    authRequired: true,
    ...status,
  });
}
