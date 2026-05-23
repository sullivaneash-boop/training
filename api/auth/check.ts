import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authStatus,
  isAuthEnabled,
  requireAuth,
} from '../lib/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const status = authStatus();

  if (!isAuthEnabled()) {
    return res.status(200).json({ authenticated: true, authRequired: false, ...status });
  }

  if (!requireAuth(req, res)) return;
  return res.status(200).json({ authenticated: true, authRequired: true, ...status });
}
