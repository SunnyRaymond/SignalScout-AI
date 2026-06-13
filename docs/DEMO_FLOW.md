# SignalScout AI Demo Flow

## Demo Goal

Show that SignalScout AI turns hiring activity into a sales workflow:

```text
job data -> hiring signal -> lead score -> outreach draft -> Slack digest
```

The audience should leave with one clear idea: job postings are not just recruiting data. They are public buying signals that reveal budget, urgency, team gaps, expansion plans, and upcoming internal projects.

## Primary Demo Story

Use the `Data to RevOps` scenario as the main live demo.

- Seller: `Data Dashboard Agency`
- Buyer persona: `RevOps`
- Offer promise: executive reporting and pipeline visibility
- Signal pattern to explain: companies hiring BI Analysts, Tableau Developers, Data Engineers, Analytics Engineers, or RevOps Managers may need dashboard, reporting, and analytics implementation help before the team is fully staffed

This is the easiest story for judges to understand because the signal-to-solution bridge is direct: if a company is hiring analytics and RevOps roles, it likely has reporting, pipeline visibility, dashboard, or metrics-layer work already in motion.

## Pre-Demo Setup

Complete this before presenting.

1. Open the app at the demo URL or local URL.
2. Confirm Supabase is connected.
3. Confirm `OPENAI_API_KEY` is configured because the current agent run requires live OpenAI generation.
4. Optional: configure `SLACK_WEBHOOK_URL`. If it is missing, the Slack tab still works in demo-safe preview mode.
5. Click `Demo Reset` before the live run. The reset should clear leads and run history, then reload 48 seed postings expanded into 240 provider-style demo postings.
6. Keep the browser zoom around 90-100 percent so the command center, top account, diagnostics, and comparison panels fit cleanly.

## Opening Talk Track

Use this before touching the product.

> SignalScout AI starts from a simple observation: job postings are buying signals. When a company hires for BI, RevOps, cloud, security, data, or automation roles, it often reveals operational pain and budget before the company ever fills out a vendor form. SignalScout turns that behavior into ranked leads, evidence, outreach, and a Slack-ready digest.

Then move immediately into the app.

## Live Demo Flow

### 1. Start In Command Center

Screen: `Command Center`

Click: none yet.

What to show:

- Header: `SignalScout AI`
- Badge: `Demo command center`
- Main claim: `Turn hiring noise into a judge-ready sales signal.`
- Pipeline cards: `Load enriched jobs`, `Extract evidence`, `Send digest`
- Status cards for offers, jobs, leads, and top signal

Talk track:

> This is the demo command center. It is designed to show the full workflow without making the user jump between a lead database, job board, spreadsheet, LLM prompt, and Slack.

### 2. Reset To A Clean Demo State

Screen: header controls

Click: `Demo Reset`

Expected result:

- Leads are cleared.
- Agent run history is cleared if the `agent_runs` table exists.
- The enriched 240-row sample job dataset is loaded.
- The app is back to a known rehearsal state.

Talk track:

> I start by resetting the demo. This makes the run reproducible: same enriched hiring data, no old leads, and no hidden manual setup.

If reset fails:

> For the live demo I can also use `Load 5x data`, but reset is the cleanest path because it clears prior leads first.

### 3. Explain The Data Layer

Screen: `Provider mix` on Command Center, then optionally `Signal Feed`

Click:

1. Stay on `Command Center` and point to `Provider mix`.
2. Optional: open `Signal Feed`.

What to show:

- The expanded dataset has a 5x provider mix: 48 seed postings become 240 provider-style postings.
- Sources include baseline sample data plus Greenhouse demo, Lever demo, Workday demo, and LinkedIn export demo variants.
- Real fetch paths also exist for The Muse and Adzuna when available/configured.
- `Signal Feed` shows role, company, source, location, and posted date.

Talk track:

> The raw input is job postings. For the demo, 48 seed postings expand into 240 provider-style postings, so the product feels like a real prospecting feed instead of a tiny CSV. The point is not just collecting jobs. The point is interpreting hiring patterns at the company level.

### 4. Load The Recommended Scenario

Screen: `Canned Demo Scenarios`

Click: `Load` on `Data to RevOps`

What to show:

- Scenario label: `Data to RevOps`
- Persona badge: `RevOps`
- Promise: `Executive reporting and pipeline visibility`
- Weights: relevance 45, urgency 35, confidence 20

Talk track:

> I will demo this as a data-dashboard agency. The target buyer is RevOps because the agency sells executive reporting, Tableau dashboards, SQL pipelines, and pipeline visibility.

Optional judge-friendly line:

> The same workflow can be switched to cloud infrastructure or cyber risk with one click, but I will keep the main story focused.

### 5. Show Offer Studio Only Briefly

Screen: `Offer Studio`

Click: `Offer Studio` tab only if you want to show configurability.

What to show:

- Offer name
- Seller description
- Target customers
- Keywords
- Negative keywords
- Saved profiles

Talk track:

> SignalScout starts with what the seller offers. This matters because a security vendor, a cloud migration consultant, and a dashboard agency should interpret the same job feed differently.

Keep this section short. Do not edit the profile during the main demo unless asked.

### 6. Tune The Buying-Signal Logic

Screen: `Command Center`

Click:

1. Return to `Command Center`.
2. Point to buyer persona controls.
3. Point to score weight controls.

What to show:

- Buyer personas: `RevOps`, `Data`, `IT`, `Security`
- Score weights: relevance, urgency, confidence
- Integration badges for OpenAI, Adzuna, Slack, Supabase

Talk track:

> The scoring is intentionally explainable. Relevance asks whether the roles match what we sell. Urgency rises when a company has multiple recent matching roles. Confidence improves when there is repeated evidence and drops for negative signals like intern or unpaid roles.

### 7. Run Score Preset Comparison

Screen: `Score Preset Comparison`

Click: `Compare weights`

What to show:

- Baseline rank and score
- Current rank and score
- Movement between scoring presets
- Evidence column

Talk track:

> Before generating outreach, I can show how changing the sales strategy changes account ranking. This is useful for demos because it proves the score is not a black box list. Different sellers can prioritize urgency or relevance differently.

If rows do not appear:

> The comparison requires an offer and loaded jobs. I will continue with the agent run, which uses the same inputs to generate final leads.

### 8. Run The Agent

Screen: header controls or pipeline card

Click: `Run Agent`

Expected result:

- Leads are generated.
- The top account card fills in.
- Ranked lead table appears.
- Diagnostics, trace, telemetry, and run history update.

Talk track while it runs:

> The agent has two stages. First it deterministically extracts evidence and scores companies from job postings. Then OpenAI turns the grounded evidence into a signal summary, inferred pain, and outreach copy without inventing facts.

If OpenAI is not configured:

> The current MVP requires `OPENAI_API_KEY` for the final generation step. For a live demo, make sure the environment variable is configured before starting.

### 9. Inspect The Top Account

Screen: `Top account` card and `Top buying signals` table

Click:

1. In the top account card, click `Inspect signal`.
2. Or in `Top buying signals`, click `Open` on the highest-ranked company.

What to show:

- Company name
- Overall score
- Relevance, urgency, confidence score bars
- Primary evidence
- Signal summary

Talk track:

> This is the core conversion from job data into a lead. SignalScout is not saying this company is definitely buying. It is saying: based on recent hiring behavior, this company has a plausible active need that matches what we sell.

### 10. Explain The Evidence

Screen: lead detail / `Lead Workspace`

Click: `Lead Workspace` tab if needed.

What to show:

- `Inferred pain`
- `Company enrichment`
- `Evidence jobs`
- Job source badges
- Job match scores
- Role driver
- Historical hiring delta
- Keyword snippets

Talk track:

> I can defend the lead with evidence. The product shows which roles triggered the signal, what keywords matched, where the job came from, and how recent hiring changed. This makes the outreach grounded instead of generic.

Key sentence:

> The value is not only ranking accounts. The value is giving the seller a reason to reach out today.

### 11. Show Outreach Generation

Screen: lead detail `Outreach`

Click:

1. Point to subject.
2. Point to body.
3. Click `Copy` if you want to show the handoff.

What to show:

- Outreach subject
- Outreach body
- Copy action

Talk track:

> SignalScout turns the evidence into a short consultative outreach draft. The message references the hiring signal, not vague personalization. It gives the seller a credible opening line.

Do not oversell this as a fully automated sales rep. Position it as a first-draft accelerator.

### 12. Show Why-Not-A-Lead Diagnostics

Screen: `Why-not-a-lead diagnostics`

What to show:

- Companies or postings below the threshold
- Score
- Reason they were filtered

Talk track:

> I also keep below-threshold postings explainable. That matters because a demo lead tool should not only say yes. It should help users understand what was filtered out and why.

### 13. Show Agent Evolution Trace, Cost, And Run History

Screen: Command Center side panels

What to show:

- `Agent evolution trace`
- `Cost telemetry`
- `Agent Run History`
- Prompt version such as `signalscout-agent-v2-demo`
- Model, request count, input tokens, estimated cost

Talk track:

> For the MVP, I added operational visibility so the demo feels like an agent workflow, not just a static dashboard. You can see the run steps, prompt version, model cost, and previous runs when the audit table is migrated.

### 14. Export The Results

Screen: `Lead Workspace`

Click:

1. `Leads CSV`
2. `Diagnostics CSV`

What to show:

- Ranked lead export
- Diagnostic export

Talk track:

> If a sales team wants to move the output into a CRM, spreadsheet, or review queue, the MVP already supports export of ranked leads and diagnostics.

Keep this short. It is a supporting capability, not the emotional climax.

### 15. End With Slack Preview

Screen: `Slack Preview`

Click:

1. Open `Slack Preview`.
2. Point to `#sales-signals`.
3. Click `Send Digest` if webhook is configured or if you want to show demo-safe mode.

What to show:

- `Slack Digest Control`
- Webhook configured or demo-safe mode
- Channel-style digest preview
- Top ranked leads summarized for a sales team

Talk track:

> This is the workflow handoff. A seller should not need to manually inspect every job board. The team can start the morning with a short list of companies showing fresh buying signals and the evidence behind each one.

Closing sentence:

> The end-to-end MVP is working: job data becomes hiring signal, hiring signal becomes scored lead, scored lead becomes grounded outreach, and the best opportunities become a Slack-style digest.

## Suggested Timing

For a 7-9 minute demo:

| Segment | Time | Focus |
| --- | ---: | --- |
| Setup and category | 0:45 | Job postings are buying signals |
| Data and scenario | 1:15 | 240 jobs, provider mix, Data to RevOps |
| Scoring and comparison | 1:15 | Explainable relevance, urgency, confidence |
| Agent run and top account | 1:30 | Evidence becomes ranked lead |
| Lead detail and outreach | 1:45 | Evidence, inferred pain, draft email |
| Diagnostics, telemetry, export | 0:45 | Agent credibility and demo growth |
| Slack preview and close | 1:00 | Team handoff and final loop |

For a 4-5 minute demo, skip Offer Studio, skip exports, and show only one diagnostic item.

## Fallback Paths

If the live agent run is slow:

- Use the existing ranked lead list from the previous run.
- Open `Agent Run History` to prove the workflow has run before.
- Say: `I will use the latest completed run so we can spend time on the output.`

If Slack webhook is missing:

- Stay in `Slack Preview`.
- Point to `Demo-safe mode`.
- Say: `The same digest can post to Slack when a webhook is configured; for judging, I am using preview-safe mode.`

If there are no leads:

- Click `Demo Reset`.
- Load `Data to RevOps`.
- Click `Run`.
- If still empty, reduce the minimum score filter in `Lead Workspace` to `0+`.

If a judge asks about other use cases:

- Show `Cloud to IT` for cloud migration consultancies.
- Show `Cyber to Security` for cybersecurity vendors.
- Explain that only the offer profile, buyer persona, and scoring weights change; the job-data-to-signal workflow remains the same.

## Best Demo Lines

- `Job postings are public evidence of budget, urgency, and operational pain.`
- `SignalScout does not replace sales judgment; it gives sellers a better reason to start the conversation.`
- `The scoring is explainable: relevance, urgency, and confidence.`
- `The outreach is grounded in actual hiring behavior, not scraped trivia.`
- `The Slack digest is the handoff from AI analysis to a daily sales workflow.`

## Do Not Say

- Do not claim this is production-ready.
- Do not claim Greenhouse, Lever, Workday, or LinkedIn export demo sources are fully live integrations; they are demo/provider-expanded sources. The Muse and Adzuna are the real fetch paths, with Adzuna credential-gated.
- Do not claim the agent can guarantee purchase intent.
- Do not spend too much time on setup controls.
- Do not read every lead. One strong lead plus one diagnostic is enough.
