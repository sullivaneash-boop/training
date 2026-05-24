import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
const configuredBaseURL = process.env.BETTER_AUTH_URL?.trim();

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : undefined;

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function hostFromURL(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).host;
  } catch {
    return undefined;
  }
}

const allowedHosts = Array.from(
  new Set(
    [
      'localhost:3000',
      'localhost:5173',
      '127.0.0.1:3000',
      '127.0.0.1:5173',
      'training-beta-gules.vercel.app',
      'training-sullivaneash-2433s-projects.vercel.app',
      'training-git-*-sullivaneash-2433s-projects.vercel.app',
      'training-*-sullivaneash-2433s-projects.vercel.app',
      hostFromURL(configuredBaseURL),
      hostFromURL(process.env.VERCEL_URL),
      ...trustedOrigins.map(hostFromURL),
    ].filter(Boolean) as string[],
  ),
);

export const auth = betterAuth({
  appName: 'Tempo',
  baseURL: {
    allowedHosts,
    fallback: configuredBaseURL ?? 'https://training-beta-gules.vercel.app',
    protocol: 'auto',
  },
  secret: authSecret,
  ...(pool ? { database: pool } : {}),
  ...(trustedOrigins.length ? { trustedOrigins } : {}),
  emailAndPassword: {
    enabled: Boolean(pool),
    disableSignUp: process.env.BETTER_AUTH_DISABLE_SIGNUP === '1',
  },
});
