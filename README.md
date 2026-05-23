# Training Command Center

A lightweight, plan-agnostic training dashboard. Import any Markdown training guide, log workouts locally, run morning readiness checks, and export coach prompts — or optionally use DeepSeek via a serverless API.

Built for iPhone home screen use at 6am before a ride. No auth. No database. Local-first.

## Stack

- Vite + React + TypeScript + Tailwind CSS v4
- localStorage for plans, workouts, readiness
- Vercel (static app + `/api/coach` serverless)
- PWA via `vite-plugin-pwa`

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

On first load, the app loads `public/default-training-plan.md` if no plan is saved. Replace it anytime via **Settings → Import training plan**.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project at [vercel.com](https://vercel.com) — framework preset: **Vite**
3. Build command: `npm run build` · Output: `dist`
4. Deploy

`vercel.json` rewrites SPA routes to `index.html` and keeps `/api/*` as serverless functions.

### DeepSeek API (optional)

1. Vercel project → **Settings → Environment Variables**
2. Add `DEEPSEEK_API_KEY` with your key from [platform.deepseek.com](https://platform.deepseek.com)
3. Redeploy
4. In the app: **Settings → AI Coach mode → DeepSeek API**

The API key never ships to the browser. The client calls `POST /api/coach`, which uses `deepseek-v4-flash`.

## Add to iPhone Home Screen

1. Deploy to Vercel (HTTPS required)
2. Open the site in **Safari**
3. Tap **Share** → **Add to Home Screen**
4. Opens standalone with dark theme (`display: standalone`)

## Apple Shortcuts URL logging

Log a workout by opening a URL with query params:

```
https://YOUR_DOMAIN.vercel.app/shortcut-log?type=run&duration=45&rpe=6&soreness=3&notes=easy&completed=1
```

| Param | Required | Example |
|-------|----------|---------|
| `type` | no (default: other) | swim, bike, run, strength, brick, mobility, rest, other |
| `duration` | **yes** | minutes, e.g. `45` |
| `distance` | no | `5.2 mi` |
| `rpe` | no | 1–10 |
| `soreness` | no | 1–10 |
| `sleep` | no | hours |
| `notes` | no | URL-encoded text |
| `completed` | no | `1` or `0` (default: 1) |
| `date` | no | `YYYY-MM-DD` (default: today) |

### Example Shortcut

1. **Shortcuts** → **+** → add **Get Contents of URL**
2. URL: `https://YOUR_DOMAIN/shortcut-log?type=run&duration=[DURATION]&rpe=6&notes=Post-run`
3. Optional: **Automation** → **Workout Ends** → run shortcut
4. For duration from Apple Health: add **Find Health Samples** (Workout) → **Get Details of Health Sample** → Duration → insert into URL

Apple Health / Watch: full sync needs a native app. URL logging is the lightweight path; export workout duration from Health in Shortcuts and append to this URL.

## Export / import data

- **Settings → Export JSON** — plan + all logs + settings
- **Settings → Export CSV** — workouts only
- **Settings → Import JSON** — restore backup

Workout logs are stored separately from the active plan. Switching plans does not delete history.

## Training plan import

Upload or paste any `.md` file. The parser extracts:

- Race date (from `Race day:` or similar)
- Plan start (from `Plan start:` or inferred from race − weeks)
- Phase table (`| Phase | Weeks |`)
- Weekly progression (`| Wk | Phase | Hrs | Long Ride | …`)
- Phase week templates (`### Base phase week (example)` with `**Mon** — …`)

See `src/lib/types.ts` for the normalized schema.

## Features

| Tab | Purpose |
|-----|---------|
| **Today** | Current week, phase, today's session, weekly targets |
| **Week** | Hours, sessions, brick status, completion bar |
| **Log** | Daily debrief form |
| **Ready** | Morning readiness (GREEN / YELLOW / RED) |
| **Coach** | Manual prompt export or DeepSeek API |
| **More** | Plan import, backup, Shortcuts docs, AI mode |

## AI Coach modes

| Mode | Behavior |
|------|----------|
| **Off** | No coach UI actions |
| **Manual Export** (default) | Copy a structured prompt into Claude/ChatGPT/DeepSeek |
| **DeepSeek API** | Calls `/api/coach` with selected task |

API tasks: debrief summary, weekly review, reshuffle missed, readiness explain, weakness detection.

## Project structure

```
api/coach.ts          # Vercel serverless DeepSeek proxy
public/               # Default plan MD, PWA icons
src/lib/
  types.ts            # Plan schema
  planParser.ts       # Markdown → TrainingPlan
  storage.ts          # localStorage
  readiness.ts        # Deterministic rules
  weeklyStats.ts
  coachExport.ts
src/pages/            # Route screens
```

## License

Personal use. Not medical advice — you know your body.
