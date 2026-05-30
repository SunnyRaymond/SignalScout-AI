# SignalScout AI

SignalScout AI turns job postings into B2B buying signals. A seller describes what they sell, the app ingests job postings, detects hiring patterns, scores company leads, drafts outreach, and renders a Slack-style digest for the sales team.

## Buying-Signal Idea

Hiring is a public trail of budget, urgency, and operational pain. If a company posts multiple Tableau, BI, RevOps, Data Engineering, Cloud, DevOps, SOC, Security, Compliance, or IAM roles, SignalScout treats those jobs as evidence that the company may need vendors who can help ship work before every hire lands.

## Architecture

```text
User offer profile
      |
      v
Next.js dashboard ---- FastAPI API ---- SQLite
      |                    |
      |                    +-- sample_jobs.csv
      |                    +-- optional Adzuna / The Muse fetch
      |                    +-- deterministic agent scoring
      |                    +-- optional OpenAI-compatible enrichment
      |                    +-- optional Slack webhook send
      v
Ranked leads, outreach drafts, Slack digest
```

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, lucide-react
- Backend: FastAPI, Python, SQLite, SQLAlchemy, Pydantic, Uvicorn
- Optional integrations: OpenAI-compatible LLM, Adzuna API, The Muse API, Slack Webhook

## Setup

```powershell
cd "C:\Users\Raymond\Documents\UCWS Singapore Hackathon"
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
cd frontend
npm.cmd install
```

Copy `.env.example` to `.env` if you want integrations. The app works without keys.

## Run Locally

Backend:

```powershell
cd "C:\Users\Raymond\Documents\UCWS Singapore Hackathon"
.\.venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd "C:\Users\Raymond\Documents\UCWS Singapore Hackathon\frontend"
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
SLACK_WEBHOOK_URL=
DATABASE_URL=sqlite:///./signalscout.db
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

`OPENAI_API_KEY` enables optional lead copy enrichment. Without it, SignalScout uses deterministic scoring and outreach generation.

`ADZUNA_APP_ID` and `ADZUNA_APP_KEY` enable Adzuna fetching. The Muse route can fetch public jobs when network access is available.

`SLACK_WEBHOOK_URL` enables real Slack send. Without it, preview and send stay in demo mode.

## Hosted Demo

Live demo URL: https://sunnyraymond.github.io/SignalScout-AI/

The GitHub Pages deployment runs a browser-only demo mode backed by `localStorage` and `frontend/public/sample_jobs.csv`, so judges can load sample jobs, run the agent, inspect leads, and preview Slack output without API keys or a hosted database. The FastAPI backend remains available for local or full-stack hosting.

## Demo Flow

1. Start backend and frontend.
2. Open the dashboard.
3. Click `Load sample` to ingest 48 realistic job postings across 12 companies.
4. Use the prefilled `Data Dashboard Agency` offer or edit the offer profile.
5. Click `Run Agent`.
6. Review ranked leads with score breakdown, evidence jobs, inferred pain, subject, and body.
7. Open `Slack Preview` to see the top-five buying-signal digest.
8. Add `SLACK_WEBHOOK_URL` and click `Send Digest` to post to Slack.

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

Relevance comes from title and description keyword matches plus domain role boosts. Urgency rises when a company has multiple recent matching roles. Confidence rises with repeated keyword evidence and falls for negative keywords such as intern, student, or unpaid.

## Slack Setup

1. Create an incoming webhook in Slack.
2. Add the webhook URL to `.env` as `SLACK_WEBHOOK_URL`.
3. Restart the backend.
4. Use `Slack Preview` first, then `Send Digest`.

