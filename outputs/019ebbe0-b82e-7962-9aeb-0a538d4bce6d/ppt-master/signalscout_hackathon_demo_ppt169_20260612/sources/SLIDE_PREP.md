# SignalScout AI Slide Preparation

## Slide Strategy

The slides should set up the insight quickly, then hand attention to the live website. The demo must be the last section and the majority of the presentation time.

Recommended structure:

```text
short narrative setup -> demo transition -> live website demo
```

Do not create detailed demo slides after the transition. Once the deck reaches the demo section, jump straight to the website.

## Presentation Objective

Make the audience believe three things before the live demo starts:

1. Job postings can reveal buying intent.
2. Agencies and consultancies need more timely, evidence-backed outbound.
3. SignalScout AI connects those two ideas into a practical workflow.

## Suggested Time Split

For a 10-minute presentation:

| Section | Time | Share |
| --- | ---: | ---: |
| Setup slides | 2:00-2:30 | 20-25% |
| Demo transition | 0:15 | 2-3% |
| Live website demo | 7:15-7:45 | 72-78% |

For a 6-minute presentation:

| Section | Time | Share |
| --- | ---: | ---: |
| Setup slides | 1:15-1:30 | 20-25% |
| Demo transition | 0:10 | 2-3% |
| Live website demo | 4:20-4:35 | 72-76% |

## Recommended Slide Sequence

### 1. Title

Slide title:

`SignalScout AI`

Subtitle:

`Turn job postings into B2B buying signals.`

Purpose:

- Establish the product and category in one sentence.
- Avoid over-explaining features on the first slide.

Speaker intent:

> I am showing a demo MVP of SignalScout AI. The idea is simple: job postings are buying signals.

Visual direction:

- Use the product logo.
- Use one clean product screenshot or a cropped command-center screenshot if available.
- Keep the slide spare and confident.

### 2. The Problem

Slide title:

`Outbound teams are late to the signal.`

Core message:

Agencies and consultancies often prospect from static lists, generic firmographics, or stale intent data. By the time a company is visibly searching for vendors, the best timing may already be gone.

Suggested bullets:

- Lead lists tell sellers who exists.
- They rarely explain why now.
- Hiring activity can reveal active business change before vendor demand is explicit.

Speaker intent:

> The issue is not just finding companies. The issue is knowing when a company has a credible reason to buy.

Visual direction:

- Show a simple contrast: `static lead list` vs `fresh hiring behavior`.
- Do not use a heavy market-size slide unless required.

### 3. The Insight

Slide title:

`Hiring is a public trail of operational intent.`

Core message:

When a company hires for BI Analysts, Data Engineers, RevOps Managers, Cloud Engineers, Security Engineers, or Automation Specialists, it may reveal budget, bottlenecks, tooling gaps, expansion plans, or upcoming internal projects.

Suggested proof examples:

| Hiring pattern | Possible buying signal |
| --- | --- |
| BI Analyst + Tableau Developer | Dashboard backlog or reporting initiative |
| Data Engineer + Analytics Engineer | Data pipeline or metrics-layer buildout |
| Cloud Engineer + SRE | Infrastructure modernization or reliability push |
| Security Engineer + IAM role | Compliance, access, or risk readiness project |
| Automation Specialist + RevOps Manager | Process automation and GTM operations gap |

Speaker intent:

> A job post is not a guarantee of budget, but it is evidence of a business priority.

Visual direction:

- Use a signal map or compact table.
- Keep the insight sharper than the design. This is the mental-model shift slide.

### 4. The Product

Slide title:

`SignalScout turns hiring behavior into sales action.`

Core workflow:

```text
job data -> hiring signal -> lead score -> outreach draft -> Slack digest
```

Suggested bullets:

- Define what you sell.
- Load or fetch job postings.
- Detect company-level hiring patterns.
- Score leads by relevance, urgency, and confidence.
- Generate evidence-backed outreach.
- Preview a Slack-style morning digest.

Speaker intent:

> SignalScout is a workflow, not just a scraper. It turns raw hiring activity into ranked leads, evidence, and outreach a sales team can actually use.

Visual direction:

- Use one horizontal process flow.
- Keep it readable at thumbnail size.

### 5. The First User

Slide title:

`Built first for agencies and consultancies.`

Core message:

The first demo use case focuses on service providers that need timely, specific reasons to start sales conversations.

Suggested examples:

- Data-dashboard agencies
- Cloud migration consultancies
- Cybersecurity vendors
- Recruiting agencies
- AI automation service providers

Speaker intent:

> These teams sell expertise into companies that are already changing. Hiring signals help them spot that change earlier.

Visual direction:

- Use a simple row of buyer/use-case chips.
- Avoid a generic ICP slide with too many personas.

### 6. Why This Demo Matters

Slide title:

`From static lists to behavior-based prospecting.`

Core message:

The MVP shows how outbound can become less dependent on static lead lists and more grounded in real-time company behavior.

Suggested bullets:

- Stronger timing: reach companies while the need is active.
- Stronger relevance: tie outreach to the roles they are hiring.
- Stronger evidence: show exactly why a company was scored.
- Faster handoff: turn the best signals into a Slack digest.

Speaker intent:

> The product is early, but the end-to-end workflow already works. The value is demoable now: job data becomes a sales action.

Visual direction:

- Use one dashboard screenshot or a simple before/after.
- This is the last content-heavy slide before the demo.

### 7. Demo Transition

Slide title:

`Live demo`

Optional subtitle:

`Job data -> hiring signal -> lead score -> outreach -> Slack digest`

Purpose:

- Signal that the deck is done explaining.
- Move immediately to the website.

Speaker line:

> I will show the full workflow live, using the example of a data-dashboard agency selling into RevOps teams.

Important:

- Do not add screenshots, bullets, or detailed product steps here.
- Do not create separate demo-section slides.
- After this slide, switch directly to the live app.

## Demo Section Rule

The demo section should be the final and largest section of the presentation, but it should not contain deck content. Treat `Live demo` as a transition slide only.

During the live demo, follow `docs/DEMO_FLOW.md`.

## Speaker Spine

Use this compact narrative across the setup slides:

1. `Outbound teams need better timing, not just more names.`
2. `Hiring activity reveals active company change.`
3. `Different roles imply different vendor needs.`
4. `SignalScout turns those roles into scored, evidence-backed leads.`
5. `The MVP completes the loop into outreach and Slack.`

## What To Prepare Before Building Slides

Assets:

- Product logo: `public/logo.svg`
- Product screenshots:
  - `docs/screenshots/dashboard.png`
  - `docs/screenshots/lead-detail.png`
  - `docs/screenshots/slack-preview.png`
- Optional fresh screenshots after running the current app because the frontend has been upgraded since the original screenshot set.

Presenter setup:

- Browser tab opened to the app.
- Database reset and ready.
- Demo data language ready: `48 seed postings expanded into 240 provider-style postings`.
- `Data to RevOps` scenario tested.
- One strong lead selected in advance in case a judge asks to inspect evidence faster.
- Slack webhook decision made: either configured send or demo-safe preview.

Technical setup:

- Supabase schema migrated, including `agent_runs`.
- `OPENAI_API_KEY` configured.
- `OPENAI_MODEL` visible in the integration/model panel.
- Network stable enough for one live agent run.

## Slide Design Notes

- Keep setup slides visually simple and product-led.
- Use product screenshots as proof objects, not decoration.
- Prefer one claim per slide.
- Avoid dense feature grids.
- Avoid spending slide space on implementation details such as table schemas, unless judges ask.
- Keep the color palette aligned with the app: clean white, slate, emerald, and sky accents.
- The strongest visual moment should be the live product, not the slide deck.

## Rehearsal Checklist

1. Practice the setup slides in under 2 minutes.
2. Practice jumping from `Live demo` into the app without hesitation.
3. Run `Demo Reset`.
4. Load or run `Data to RevOps`.
5. Practice explaining one top account in under 60 seconds.
6. Practice showing one below-threshold diagnostic in under 20 seconds.
7. Practice ending on Slack Preview with the full workflow sentence.

Final closing line:

> SignalScout AI makes outbound sales less dependent on static lead lists and more grounded in real-time company behavior.
