import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const COOKIE_NAME = 'training_session';
const SESSION_DAYS = 30;

/** Password: APP_PASSWORD env (Vercel) or gitignored `.app-password` file (local). */
export function getAppPassword(): string | undefined {
  const fromEnv = process.env.APP_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  try {
    const filePath = path.join(process.cwd(), '.app-password');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim() || undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function isAuthEnabled(): boolean {
  return Boolean(getAppPassword());
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || getAppPassword() || 'dev-insecure-secret';
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', getAuthSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto
    .createHmac('sha256', getAuthSecret())
    .update(payloadB64)
    .digest('base64url');
  if (sig.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as { exp?: number };
    return typeof payload.exp === 'number' && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export function verifyPassword(candidate: string): boolean {
  const expected = getAppPassword();
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getCookie(req: VercelRequest, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function sessionCookieHeader(token: string, maxAgeSec = SESSION_DAYS * 24 * 60 * 60): string {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Returns false and sends 401/503 if not allowed. */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (!isAuthEnabled()) return true;

  const token = getCookie(req, COOKIE_NAME);
  if (!token || !verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized — sign in required' });
    return false;
  }
  return true;
}

export function authStatus(): { enabled: boolean; configured: boolean } {
  const configured = Boolean(getAppPassword());
  return { enabled: configured, configured };
}
