import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authStatus,
  createSessionToken,
  getAppPassword,
  isBetterAuthEnabled,
  parseJsonBody,
  sessionCookieHeader,
  verifyPassword,
} from '../lib/auth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isBetterAuthEnabled() && !getAppPassword()) {
    return res.status(410).json({
      error: 'Legacy password login disabled. Use Better Auth sign-in methods.',
    });
  }

  if (!getAppPassword()) {
    return res.status(503).json({
      error: 'Auth not configured. Set APP_PASSWORD in Vercel environment variables.',
    });
  }

  const body = parseJsonBody<{ password?: string }>(req);
  const password = String(body.password ?? '');

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (!verifyPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createSessionToken();
  res.setHeader('Set-Cookie', sessionCookieHeader(token));
  return res.status(200).json({ ok: true, ...authStatus() });
}
