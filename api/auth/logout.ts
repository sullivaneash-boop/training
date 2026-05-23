import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookieHeader } from '../lib/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Set-Cookie', clearSessionCookieHeader());
  return res.status(200).json({ ok: true });
}
