# SignalScout AI Next Steps

## Completed In This Demo Growth Pass

1. Installed UI/UX Pro Max for this project under `.codex/skills/ui-ux-pro-max` and verified the existing GSAP skill set in `C:\Users\Raymond\.codex\skills`.
2. Added GSAP runtime packages and applied scoped, reduced-motion-safe dashboard animations.
3. Rebuilt the frontend into a demo command center with a stronger hero, top-account cockpit, provider mix, persona selection, score calibration, trace, telemetry, diagnostics, lead workspace, and richer Slack preview.
4. Expanded the sample dataset from 48 to 240 postings by generating Greenhouse, Lever, Workday, LinkedIn export, and baseline sample variants with company enrichment and hiring-delta metadata.
5. Implemented product refinements: source attribution snippets, role drivers, buyer persona selection, scoring calibration, why-not-a-lead diagnostics, and company-domain deduplication.
6. Implemented agent evolution: deterministic evidence extraction first, OpenAI outreach generation second, prompt versioning, cost telemetry, trace steps, and optional `agent_runs` audit storage when the schema is migrated.

## Completed In The Next Demo-Growth Pass

1. Added a one-click `Demo Reset` endpoint and header control that clears leads, clears run history, reloads the 240-row enriched sample set, and returns the database to a known rehearsal state.
2. Added an `Agent Run History` panel backed by the Supabase `agent_runs` table, showing latest persona, model, lead count, runtime, and estimated cost.
3. Added three canned demo scenarios: Data Dashboard Agency to RevOps, Cloud Infrastructure Consultancy to IT, and Cyber Risk Studio to Security.
4. Added a score preset comparison view that reruns deterministic ranking with baseline vs current scoring weights and shows rank/score changes.
5. Added CSV exports for ranked leads and latest why-not-a-lead diagnostics.

## Demo Rehearsal Checklist

1. Open `http://localhost:3000` and start from Command Center.
2. Click `Demo Reset` before a rehearsal; the database should report 240 jobs and 0 leads.
3. Pick a canned scenario, then click `Run` or use the manual offer/persona controls.
4. Adjust relevance, urgency, and confidence weights, then run `Compare weights` to show rank movement.
5. Click `Run Agent`, then show Agent Run History, cost telemetry, trace, and diagnostics.
6. Open Lead Workspace to show evidence lines, enrichment, outreach, and CSV export buttons.
7. End with Slack Preview as the final sales workflow handoff.

## Next Demo-Growth Steps

1. Add a short guided demo script panel that advances through reset, scenario, run, compare, lead detail, export, and Slack preview.
2. Add a compact `Judge Mode` toggle that hides setup-heavy controls and keeps only the strongest demo surfaces visible.
3. Add a local fixture test for each canned scenario so future changes preserve expected top accounts.
4. Add a screenshot export for the command center and lead detail panels for submission assets.
5. Add a small seed-health indicator that warns if the current database does not have exactly 240 demo jobs.

## Later Production Work

1. Replace demo provider simulation with real Greenhouse, Lever, Workday, and LinkedIn import adapters.
2. Add authentication, workspace-level permissions, and per-user Slack setup after the hackathon demo.
3. Add automated regression fixtures for score ordering across data, cloud, and cyber offers.
