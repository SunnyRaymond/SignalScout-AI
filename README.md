# SignalScout AI

SignalScout AI turns job postings into B2B buying signals. A seller describes what they sell; the app ingests jobs, detects hiring patterns, scores company leads, drafts outreach, and renders a Slack-style digest.

## Buying-Signal Idea

Hiring is a public trail of budget, urgency, and operational pain. If a company posts multiple Tableau, BI, RevOps, Data Engineering, Cloud, DevOps, SOC, Security, Compliance, or IAM roles, SignalScout treats those jobs as evidence that the company may need vendors who can help ship work before every hire lands.

## Architecture

```text
Next.js app on Vercel
├─ React dashboard, offer setup, jobs, leads, Slack preview
├─ Next route handlers under /api/*
│  ├─ Supabase persistence
│  ├─ sample_jobs.csv ingestion
│  ├─ optional The Muse / Adzuna job fetch
│  ├─ keyword scoring and company grouping
│  ├─ OpenAI-compatible AI enrichment
│  └─ optional Slack webhook send
└─ Supabase Postgres
   ├─ offer_profiles
   ├─ job_postings
   └─ lead_signals
```

There is no separate backend service. The full app deploys as a root-level Next.js project.

## Tech Stack

- Next.js, React, TypeScript, Tailwind CSS, lucide-react
- Next.js route handlers for the API
- Supabase Postgres via `@supabase/supabase-js`
- OpenAI-compatible chat completions
- Optional Adzuna API, The Muse API, Slack Webhook

## Setup

```powershell
cd "C:\Users\Raymond\Documents\UCWS Singapore Hackathon"
npm.cmd install
```

Create `.env.local` from `.env.example`, then add real values.

```powershell
Copy-Item .env.example .env.local
```

Run `supabase/schema.sql` in the Supabase SQL editor before using the app.

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5.4-nano
SUPABASE_URL=
SUPABASE_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
SLACK_WEBHOOK_URL=
```

`OPENAI_MODEL` defaults to `gpt-5.4-nano`, the current low-cost nano model choice for this MVP. `SUPABASE_URL` should be the project URL, such as `https://your-project.supabase.co`; if you paste the REST URL ending in `/rest/v1`, the app normalizes it. `SUPABASE_KEY` is used only in server route handlers; use a server-side Supabase secret/service-role-compatible key, not a browser-exposed public key.

## Vercel Deploy

1. Import this GitHub repository into Vercel.
2. Use the repository root as the project root.
3. Add the environment variables above in Vercel Project Settings.
4. Run `supabase/schema.sql` in Supabase.
5. Deploy.
6. Open the deployed app, click `Load sample`, then `Run Agent`.

## Demo Flow

1. Open the dashboard.
2. Click `Load sample` to ingest 48 realistic job postings across 12 companies.
3. Use the prefilled `Data Dashboard Agency` offer or edit the offer profile.
4. Click `Run Agent`.
5. Review ranked leads with score breakdown, evidence jobs, inferred pain, subject, and body.
6. Open `Slack Preview` to see the top-five buying-signal digest.
7. Add `SLACK_WEBHOOK_URL` and click `Send Digest` to post to Slack.

## API

- `GET /health`
- `GET /api/status`
- `GET /api/offers`
- `POST /api/offers`
- `GET /api/offers/{offer_id}`
- `PUT /api/offers/{offer_id}`
- `DELETE /api/offers/{offer_id}`
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/{job_id}`
- `PUT /api/jobs/{job_id}`
- `DELETE /api/jobs/{job_id}`
- `POST /api/jobs/load-sample`
- `POST /api/jobs/fetch`
- `GET /api/leads`
- `GET /api/leads/{lead_id}`
- `DELETE /api/leads/{lead_id}`
- `DELETE /api/leads`
- `POST /api/agent/run`
- `GET /api/slack/preview`
- `POST /api/slack/send`

## Scoring

Each lead score is computed from grouped job evidence:

```text
score = 0.45 * relevance + 0.35 * urgency + 0.20 * confidence
```

Relevance comes from title and description keyword matches plus domain role boosts. Urgency rises when a company has multiple recent matching roles. Confidence rises with repeated keyword evidence and falls for negative keywords such as intern, student, or unpaid. OpenAI then writes the grounded signal, inferred pain, and outreach copy from the ranked evidence.

## Slack Setup

1. Create an incoming webhook in Slack.
2. Add the webhook URL to `SLACK_WEBHOOK_URL`.
3. Redeploy or restart Next.js.
4. Use `Slack Preview` first, then `Send Digest`.

Without a webhook, Slack preview still works and `Send Digest` returns a preview-safe response.

## Screenshots

- Dashboard: `docs/screenshots/dashboard.png`
- Lead detail: `docs/screenshots/lead-detail.png`
- Slack preview: `docs/screenshots/slack-preview.png`

## Logo

The app logo is `public/logo.svg`, a square radar/signal plus briefcase/scout motif.

## Hackathon Submission

Project Name: SignalScout AI

Tagline: An AI agent that turns job postings into B2B buying signals and Slack-ready outreach.

Track: Agent, Application

Tech Stack: Next.js, React, TypeScript, Tailwind CSS, Next.js Route Handlers, Supabase Postgres, OpenAI-compatible LLM, Adzuna API, The Muse API, Slack Webhook

Demo URL: TBD

Repo URL: https://github.com/SunnyRaymond/SignalScout-AI

SignalScout AI helps B2B sellers find accounts showing active buying intent through hiring behavior. The user enters what they sell, loads job postings, and runs an agent that groups jobs by company, detects relevant hiring patterns, scores urgency and relevance, and drafts grounded outreach. A Tableau dashboard agency, for example, should see BI, Tableau, Analytics Engineering, Data Engineering, SQL, Reporting, and RevOps roles ranked higher than unrelated operations or security roles. The MVP includes sample data, Supabase persistence, live OpenAI enrichment, ranked lead cards, evidence-backed lead detail, copyable outreach, and a Slack-style digest that can post to a real webhook when configured.
