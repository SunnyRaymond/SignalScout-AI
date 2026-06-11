# SignalScout AI Next Steps

## Completed In This Demo Growth Pass

1. Installed UI/UX Pro Max for this project under `.codex/skills/ui-ux-pro-max` and verified the existing GSAP skill set in `C:\Users\Raymond\.codex\skills`.
2. Added GSAP runtime packages and applied scoped, reduced-motion-safe dashboard animations.
3. Rebuilt the frontend into a demo command center with a stronger hero, top-account cockpit, provider mix, persona selection, score calibration, trace, telemetry, diagnostics, lead workspace, and richer Slack preview.
4. Expanded the sample dataset from 48 to 240 postings by generating Greenhouse, Lever, Workday, LinkedIn export, and baseline sample variants with company enrichment and hiring-delta metadata.
5. Implemented product refinements: source attribution snippets, role drivers, buyer persona selection, scoring calibration, why-not-a-lead diagnostics, and company-domain deduplication.
6. Implemented agent evolution: deterministic evidence extraction first, OpenAI outreach generation second, prompt versioning, cost telemetry, trace steps, and optional `agent_runs` audit storage when the schema is migrated.

## Demo Rehearsal Checklist

1. Open `http://localhost:3000` and start from Command Center.
2. Click `Load 5x data`; the database should report 240 jobs.
3. Choose the offer and persona that best matches the judge story.
4. Adjust relevance, urgency, and confidence weights to show calibration.
5. Click `Run Agent`, then open Lead Workspace to show evidence lines, enrichment, and outreach.
6. Show Signal Feed provider mix and why-not-a-lead diagnostics to prove noise filtering.
7. End with Slack Preview as the final sales workflow handoff.

## Next Demo-Growth Steps

1. Add a one-click `Demo Reset` endpoint that clears leads and reloads the 240-row enriched sample set.
2. Add a small `Agent Run History` panel that reads from `agent_runs` after running the updated Supabase schema.
3. Add three canned demo scenarios: Data Dashboard Agency to RevOps, Cloud Infrastructure Consultancy to IT, and Cyber Risk Studio to Security.
4. Add a lightweight comparison view that reruns the same offer under two scoring-weight presets and shows rank changes.
5. Add CSV export for the ranked leads and diagnostics so the judges can see the generated evidence outside the app.

## Later Production Work

1. Run the updated `supabase/schema.sql` in Supabase so `agent_runs` and stored offer scoring defaults are available.
2. Replace demo provider simulation with real Greenhouse, Lever, Workday, and LinkedIn import adapters.
3. Add authentication, workspace-level permissions, and per-user Slack setup after the hackathon demo.
4. Add automated regression fixtures for score ordering across data, cloud, and cyber offers.
