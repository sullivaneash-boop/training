import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;

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

export const auth = betterAuth({
  appName: 'Tempo',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: authSecret,
  ...(pool ? { database: pool } : {}),
  ...(trustedOrigins.length ? { trustedOrigins } : {}),
  emailAndPassword: {
    enabled: Boolean(pool),
    disableSignUp: process.env.BETTER_AUTH_DISABLE_SIGNUP === '1',
  },
});
