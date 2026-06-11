# SignalScout AI Next Steps

## Demo Hardening

1. Deploy the root Next.js app to Vercel and add `OPENAI_API_KEY`, `OPENAI_MODEL`, `SUPABASE_URL`, `SUPABASE_KEY`, and optional `SLACK_WEBHOOK_URL` in Vercel project settings.
2. Run `supabase/schema.sql` in Supabase before the first demo, then use `/api/jobs/load-sample` from the UI.
3. Add a tiny admin reset endpoint or SQL seed script for demo rehearsals so the database can return to a known state quickly.

## Product Refinements

1. Add source attribution quality: show which exact job lines triggered each keyword and which roles drove urgency.
2. Add buyer persona selection so the same company can generate different outreach for RevOps, IT, security, or data leaders.
3. Add scoring calibration controls: weight relevance, urgency, and confidence per offer instead of using one global formula.
4. Add “why not a lead” diagnostics for irrelevant postings so judges can see that SignalScout filters noise intentionally.
5. Add deduplication by company domain once real job boards return inconsistent company names.

## Data Expansion

1. Add more job providers beyond The Muse and Adzuna, especially LinkedIn exports, Greenhouse, Lever, and Workday career pages.
2. Add company enrichment with website, industry, employee count, funding stage, and existing tech stack.
3. Add historical posting deltas so SignalScout can detect acceleration, not just current hiring.

## Agent Evolution

1. Move from one-shot generation to a two-step agent: evidence extraction first, then outreach generation.
2. Add evaluation fixtures that verify score ordering for data, cloud, and cyber offers.
3. Add cost telemetry by model and request so the demo can prove the nano model stays inexpensive.
4. Add prompt versions and stored agent runs for auditability.

## GTM Integrations

1. Add Slack OAuth or per-channel webhook setup for production use.
2. Add copy-to-CRM export for HubSpot, Salesforce, and Apollo.
3. Add CSV export and scheduled digest delivery after the MVP is stable.
4. Add authentication only after the hackathon demo, because single-user server routes are enough for the MVP.
