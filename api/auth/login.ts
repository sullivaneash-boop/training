import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authStatus,
  createSessionToken,
  getAppPassword,
  sessionCookieHeader,
  verifyPassword,
} from '../lib/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!getAppPassword()) {
    return res.status(503).json({
      error: 'Auth not configured. Set APP_PASSWORD in Vercel or .app-password locally.',
    });
  }

  const body = (req.body ?? {}) as { password?: string };
  const password = String(body.password ?? '');

  if (!verifyPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createSessionToken();
  res.setHeader('Set-Cookie', sessionCookieHeader(token));
  return res.status(200).json({ ok: true, ...authStatus() });
}
