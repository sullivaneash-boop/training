# Training Command Center

Plan-agnostic training dashboard. Import any Markdown plan, log workouts locally, run readiness checks, and use **DeepSeek** as an optional coach layer.

Local-first + Vercel API · Better Auth ready · Neon Postgres ready · Mobile-first PWA

## Stack

- Vite + React + TypeScript + Tailwind CSS v4
- localStorage (plans, workouts, readiness, athlete profile, coach insights)
- Vercel serverless: `POST /api/deepseek`
- PWA (`vite-plugin-pwa`)

## Data model

Entities in `src/lib/types.ts`:

| Entity | Purpose |
|--------|---------|
| `AthleteProfile` | Goal, baselines, injury notes, weakest discipline |
| `TrainingPlan` | Parsed/normalized plan with phases, weeks, sessions |
| `WorkoutLog` | Per-session debrief (linked to `planId`, optional) |
| `ReadinessCheck` | Morning check-in + deterministic + optional AI reason |
| `CoachInsight` | Saved DeepSeek responses |
| `AppSettings` | AI safety mode, model, JSON debug toggle |

Workout logs are **separate** from the active plan — switch plans without losing history.

## Run locally

```bash
npm install
npm run dev
```

App: http://localhost:5173

### DeepSeek API locally

The browser calls `/api/deepseek`. For local API testing:

```bash
# Install Vercel CLI if needed: npm i -g vercel
cp .env.example .env.local
# Add DEEPSEEK_API_KEY=sk-... to .env.local
vercel dev
```

Or deploy to Vercel and test on your preview URL.

### Test `/api/deepseek` with curl

```bash
curl -X POST http://localhost:3000/api/deepseek \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "today_coach",
    "userQuestion": "Should I do my long ride today?",
    "date": "2026-05-23"
  }'
```

Production: replace host with your Vercel domain.

## Auth setup (Better Auth + legacy fallback)

Tempo now includes Better Auth route mounting at `/api/auth/*` for production-grade sessions.

### Better Auth quick setup

1. Add env vars:
   - `BETTER_AUTH_SECRET` (32+ chars)
   - `BETTER_AUTH_URL` (your app URL)
   - `DATABASE_URL` (Neon Postgres)
2. Run schema migration:
   ```bash
   npm run auth:migrate
   ```
   or generate SQL first:
   ```bash
   npm run auth:generate
   ```
3. Redeploy Vercel after updating env vars.

When `DATABASE_URL` is set, email/password auth is enabled in Better Auth.

### Legacy app password (temporary, for API protection while migrating)

Stops strangers from hitting your DeepSeek API. No extra npm packages — cookie session on the server.

### Set password (never commit it)

**Vercel (production):**
1. Project → Settings → Environment Variables
2. Add `APP_PASSWORD` = your password
3. Optional: `AUTH_SECRET` = long random string (session signing; defaults to `APP_PASSWORD`)
4. Redeploy (required after adding env vars)
5. Confirm login works at `/login` before relying on the PWA home-screen icon

**Tip:** In Vercel, paste the password without quotes. If login succeeds but the app bounces back, open the site in Safari once (cookies + PWA can be picky).

**Local:**
```bash
# Option A — .env.local (with vercel dev)
APP_PASSWORD=your-password

# Option B — gitignored file in project root
echo 'your-password' > .app-password
```

If `APP_PASSWORD` is **not** set, auth is off (convenient for local dev only).

### Routes

| Route | Purpose |
|-------|---------|
| `/api/auth/*` | Better Auth handler (session + provider routes) |
| `/login` | Sign in |
| `POST /api/auth/login` | Sets HttpOnly cookie |
| `GET /api/auth/check` | Session check |
| `POST /api/auth/logout` | Clears cookie |
| `POST /api/deepseek` | Requires valid session when auth enabled |

Apple Shortcuts URL logging (`/shortcut-log`) stays public — it only writes to local storage, no API.

## DeepSeek API key

1. Create a key at [platform.deepseek.com](https://platform.deepseek.com)
2. **Local:** add to `.env.local` (not committed):
   ```
   DEEPSEEK_API_KEY=sk-your-key
   ```
   Run with `vercel dev` so the serverless route receives it.
3. **Vercel:** Project → Settings → Environment Variables → `DEEPSEEK_API_KEY` → Redeploy

The key never ships to the browser.

### Models

- Default: `deepseek-v4-flash`
- Optional in Settings: `deepseek-v4-pro`
- Do **not** use deprecated `deepseek-chat` or `deepseek-reasoner`

## AI modes (cost safety)

| Setting | Behavior |
|---------|----------|
| **AI disabled** | No DeepSeek buttons |
| **On-demand only** (default) | You tap "Ask DeepSeek" |
| **Auto after workout** | Runs `daily_debrief` after each log |

Toggle in **Settings → AI settings**.

## DeepSeek coach modes

| Mode | Where to use | What it does |
|------|----------------|---------------|
| `normalize_plan` | Settings → Normalize with DeepSeek | MD → `TrainingPlan` JSON |
| `daily_debrief` | Log → Analyze this workout | One workout vs current week |
| `readiness_explain` | Ready → DeepSeek explain | Explains deterministic GREEN/YELLOW/RED |
| `missed_workout_fix` | Week → Fix missed workouts | Reshuffles week without cramming |
| `weekly_review` | Week / AI Coach tab | Completed vs planned |
| `race_weakness_scan` | Week / AI Coach tab | Race-day exposure ranked |
| `today_coach` | Today → Ask DeepSeek | What to do today |
| `plan_assistant` | **Chat button** (bottom-right) | Conversational plan adaptation — shift dates, volume, phases; apply changes to your plan |

All modes return structured JSON:

```json
{
  "mode": "weekly_review",
  "summary": "...",
  "signal": "green|yellow|red|neutral",
  "keyFindings": [],
  "recommendedAction": "...",
  "adjustments": [{"action":"","reason":"","priority":"medium"}],
  "warningFlags": [],
  "questionsForUser": []
}
```

Responses are saved as `CoachInsight` in localStorage (copyable, dismissable, optional raw JSON debug).

### Plan Assistant (chat)

Tap the **blue chat button** above the tab bar on any screen. Multi-turn conversation with your full plan, logs, and readiness in context.

Example requests:
- "I can't start until June 2"
- "I'm crushing workouts — move me up one week"
- "I'm sick — push everything back 5 days without cramming"
- "Change race date to November 1"

When the assistant proposes a schedule change, tap **Apply to my plan**. Workout history is kept; only the active plan updates.

## Deploy to Vercel

1. Push to GitHub
2. Import on Vercel (Vite preset, output `dist`)
3. Add `DEEPSEEK_API_KEY` in env vars
4. Deploy

`vercel.json` routes SPA to `index.html` and keeps `/api/*` as serverless functions.

## iPhone home screen

1. Open deployed URL in **Safari**
2. Share → **Add to Home Screen**

## Apple Shortcuts URL logging

```
https://YOUR_DOMAIN/shortcut-log?type=run&duration=45&rpe=6&soreness=3&distance=5.2&distanceUnit=mi&completed=1
```

| Param | Required |
|-------|----------|
| `duration` | yes (minutes) |
| `type` | no (swim, bike, run, strength, brick, mobility, rest, other) |
| `distance`, `distanceUnit` | no |
| `rpe`, `soreness`, `sleep` | no |
| `notes` | no |
| `completed` | no (`0` or `1`) |
| `date` | no (`YYYY-MM-DD`) |

## Import any training plan

1. **Settings → Upload .md** — fast local parser
2. **Normalize with DeepSeek** — richer extraction (phases, rules, gear, sessions)

`public/default-training-plan.md` is **sample test input only** — the app does not hardcode any race.

## Export / import

- **Export JSON** — plan, athlete, workouts, readiness, insights, settings
- **Export CSV** — workouts
- **Import JSON** — full restore

## Project structure

```
api/deepseek.ts       # Serverless DeepSeek proxy (JSON mode)
src/lib/types.ts      # Data model
src/lib/planParser.ts # Local MD parser
src/lib/deepseek.ts   # Client wrapper
src/lib/storage.ts    # localStorage + migration
src/hooks/useDeepSeek.ts
src/components/CoachPanel.tsx
src/pages/
```

## License

Personal training utility. Not medical advice.
