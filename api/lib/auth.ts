import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const COOKIE_NAME = 'training_session';
const SESSION_DAYS = 30;

function normalizeSecret(value: string): string {
  let t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Password: APP_PASSWORD env (Vercel) or gitignored `.app-password` file (local). */
export function getAppPassword(): string | undefined {
  const fromEnv = process.env.APP_PASSWORD;
  if (fromEnv) {
    const normalized = normalizeSecret(fromEnv);
    return normalized || undefined;
  }

  try {
    const filePath = path.join(process.cwd(), '.app-password');
    if (fs.existsSync(filePath)) {
      const normalized = normalizeSecret(fs.readFileSync(filePath, 'utf8'));
      return normalized || undefined;
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
  const secret = process.env.AUTH_SECRET
    ? normalizeSecret(process.env.AUTH_SECRET)
    : getAppPassword();
  return secret || 'dev-insecure-secret-change-me';
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
  const a = normalizeSecret(candidate);
  const b = expected;
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function getCookie(req: VercelRequest, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function isProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

export function sessionCookieHeader(token: string, maxAgeSec = SESSION_DAYS * 24 * 60 * 60): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isProduction()) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader(): string {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProduction()) parts.push('Secure');
  return parts.join('; ');
}

export function isRequestAuthenticated(req: VercelRequest): boolean {
  if (!isAuthEnabled()) return true;
  const token = getCookie(req, COOKIE_NAME);
  return Boolean(token && verifySessionToken(token));
}

/** Returns false and sends 401 if not allowed. */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (!isAuthEnabled()) return true;
  if (!isRequestAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized — sign in required' });
    return false;
  }
  return true;
}

export function authStatus(): { enabled: boolean; configured: boolean } {
  const configured = Boolean(getAppPassword());
  return { enabled: configured, configured };
}

export function parseJsonBody<T extends Record<string, unknown>>(req: VercelRequest): T {
  const body = req.body;
  if (!body) return {} as T;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof body === 'object') return body as T;
  return {} as T;
}
