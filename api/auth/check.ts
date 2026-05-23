import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authStatus,
  isAuthEnabled,
  isRequestAuthenticated,
} from '../lib/auth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const status = authStatus();

  if (!isAuthEnabled()) {
    return res.status(200).json({
      authenticated: true,
      authRequired: false,
      ...status,
    });
  }

  const authenticated = isRequestAuthenticated(req);
  return res.status(200).json({
    authenticated,
    authRequired: true,
    ...status,
  });
}
