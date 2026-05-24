import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : undefined;

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  if (!pool) return;
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`
      create table if not exists tempo_user_state (
        user_id text primary key,
        athlete_profile jsonb,
        onboarding_state jsonb,
        training_plan jsonb,
        updated_at timestamptz not null default now()
      );
    `);
  })();
  return schemaReady;
}

export function hasUserDataDb() {
  return Boolean(pool);
}

export async function upsertUserBootstrap(args: {
  userId: string;
  athleteProfile?: unknown;
  onboardingState?: unknown;
  trainingPlan?: unknown;
}) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  await ensureSchema();
  await pool.query(
    `
    insert into tempo_user_state (user_id, athlete_profile, onboarding_state, training_plan, updated_at)
    values ($1, $2::jsonb, $3::jsonb, $4::jsonb, now())
    on conflict (user_id)
    do update set
      athlete_profile = coalesce(excluded.athlete_profile, tempo_user_state.athlete_profile),
      onboarding_state = coalesce(excluded.onboarding_state, tempo_user_state.onboarding_state),
      training_plan = coalesce(excluded.training_plan, tempo_user_state.training_plan),
      updated_at = now()
    `,
    [
      args.userId,
      args.athleteProfile ? JSON.stringify(args.athleteProfile) : null,
      args.onboardingState ? JSON.stringify(args.onboardingState) : null,
      args.trainingPlan ? JSON.stringify(args.trainingPlan) : null,
    ],
  );
}

