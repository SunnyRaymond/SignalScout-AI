# signalscout_hackathon_demo - Design Spec

> Human-readable design narrative for the SignalScout AI hackathon demo deck.
> Machine-readable execution contract: `spec_lock.md`.

## I. Project Information

| Item | Value |
| ---- | ----- |
| **Project Name** | signalscout_hackathon_demo |
| **Canvas Format** | PPT 16:9 (1280x720) |
| **Page Count** | 8 |
| **Design Style** | C) Top Consulting + product-led hackathon pitch |
| **Target Audience** | Hackathon judges evaluating a marketable product demo |
| **Use Case** | 3-5 minute slide setup inside a 15-minute demo; slides end at live website transition |
| **Created Date** | 2026-06-12 |

---

## II. Canvas Specification

| Property | Value |
| -------- | ----- |
| **Format** | PPT 16:9 |
| **Dimensions** | 1280x720 |
| **viewBox** | `0 0 1280 720` |
| **Margins** | 56px left/right, 44px top/bottom |
| **Content Area** | 1168x632 inside the safe area |

---

## III. Visual Theme

### Theme Style

- **Style**: Product-led judge pitch with conclusion-first slide titles.
- **Theme**: Light theme with slate product chrome and emerald/sky proof accents.
- **Tone**: Practical, credible, modern B2B SaaS; the live product is the strongest visual moment.

### Color Scheme

| Role | HEX | Purpose |
| ---- | --- | ------- |
| **Background** | `#FFFFFF` | Main slide background |
| **Secondary bg** | `#F8FAFC` | Soft panels and screenshot mats |
| **Primary** | `#10B981` | Signal, score, positive proof, product accent |
| **Accent** | `#38BDF8` | Secondary emphasis and flow connectors |
| **Secondary accent** | `#0F172A` | High-contrast product chrome and dark panels |
| **Body text** | `#0F172A` | Main copy |
| **Secondary text** | `#475569` | Explanatory copy and captions |
| **Tertiary text** | `#94A3B8` | Footers, page markers, low-emphasis labels |
| **Border/divider** | `#E2E8F0` | Rules, screenshot frames, light dividers |
| **Success** | `#10B981` | High-confidence signal |
| **Warning** | `#F59E0B` | Demo-safe mode and caveats |

### Gradient Scheme

Use restrained linear fades only for screenshot mats and cover depth:

```xml
<linearGradient id="softMint" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#ECFDF5"/>
  <stop offset="100%" stop-color="#F8FAFC"/>
</linearGradient>
```

---

## IV. Typography System

### Font Plan

**Typography direction**: restrained contrast - editorial claims with product UI body text.

| Role | Chinese | English | Fallback tail |
| ---- | ------- | ------- | ------------- |
| **Title** | `"Microsoft YaHei"` | `Georgia` | `serif` |
| **Body** | `"Microsoft YaHei", "PingFang SC"` | `Arial` | `sans-serif` |
| **Emphasis** | `"Microsoft YaHei"` | `Georgia` | `serif` |
| **Code** | - | `Consolas, "Courier New"` | `monospace` |

**Per-role font stacks**

- Title: `Georgia, Microsoft YaHei, serif`
- Body: `Arial, Microsoft YaHei, PingFang SC, sans-serif`
- Emphasis: `Georgia, Microsoft YaHei, serif`
- Code: `Consolas, Courier New, monospace`

### Font Size Hierarchy

**Baseline**: Body font size = 22px.

| Purpose | Ratio to body | Current Project | Weight |
| ------- | ------------- | --------------- | ------ |
| Cover title | 2.9-3.4x | 64-74px | Bold |
| Section / transition | 2.4-2.8x | 52-62px | Bold |
| Page title | 1.6-2.0x | 36-44px | Bold |
| Hero number | 2.0-2.8x | 44-62px | Bold |
| Subtitle | 1.15-1.35x | 25-30px | Semibold |
| Body content | 1x | 22px | Regular |
| Annotation / caption | 0.65-0.8x | 14-17px | Regular |
| Footer / page marker | 0.5-0.6x | 11-13px | Regular |

Formula policy: text-only. No formula assets are needed.

---

## V. Layout Principles

### Page Structure

- **Header area**: 44-116px depending on rhythm. Kicker plus claim title; no heavy nav chrome.
- **Content area**: 500-560px. One dominant proof object per slide.
- **Footer area**: 24-36px. Quiet page marker and source note only when needed.

### Layout Pattern Library

| Pattern | Deck Usage |
| ------- | ---------- |
| **Single column centered** | Cover and live-demo transition |
| **Symmetric split (5:5)** | Problem contrast |
| **Asymmetric split (3:7 / 2:8)** | Product proof screenshot with explanation rail |
| **Top-bottom split** | Insight table with claim header |
| **Three/four column cards** | First user wedge only, not repeated across the deck |
| **Z-pattern / waterfall** | Product workflow and evidence handoff |
| **Negative-space-driven** | Live demo slide |

### Spacing Specification

| Element | Recommended Range | Current Project |
| ------- | ----------------- | --------------- |
| Safe margin from canvas edge | 44-60px | 56px |
| Content block gap | 24-44px | 32px |
| Icon-text gap | 8-14px | 10px |
| Card gap | 20-28px | 24px |
| Card padding | 20-28px | 24px |
| Card border radius | 8-12px | 10px maximum |

---

## VI. Icon Usage Specification

### Source

- **Built-in icon library**: `tabler-outline`
- **Stroke width**: 2
- **Usage method**: SVG placeholder `<use data-icon="tabler-outline/icon-name" .../>`

### Recommended Icon List

| Purpose | Icon Path | Page |
| ------- | --------- | ---- |
| Product signal | `tabler-outline/target` | P01, P08 |
| Job data | `tabler-outline/database` | P04 |
| Evidence extraction | `tabler-outline/filter-2-spark` | P04 |
| Lead scoring | `tabler-outline/chart-bar` | P04, P06 |
| Outreach | `tabler-outline/message-2-check` | P04, P06 |
| Digest handoff | `tabler-outline/send` | P04, P08 |
| First users | `tabler-outline/users` | P05 |
| Service provider wedge | `tabler-outline/briefcase` | P05 |

---

## VII. Visualization Reference List

Catalog read: 71 templates

| Page | Template | Path | Summary-quote (verbatim from `charts_index.json`) | Usage |
| ---- | -------- | ---- | ------------------------------------------------- | ----- |
| P02 | pros_cons_chart | `templates/charts/pros_cons_chart.svg` | "Pick for bilateral pros/cons list, 2-5 items per side. Skip for full feature comparison (use comparison_table) or numeric A/B mirror data (use butterfly_chart)." | Contrast static lead lists against fresh hiring behavior |
| P03 | basic_table | `templates/charts/basic_table.svg` | "Pick for plain tabular text/number grid, 3-8 columns. Skip if cells need visual bars (use consulting_table) or qualitative scores (use harvey_balls_table)." | Map hiring patterns to likely buying signals |
| P04 | pipeline_with_stages | `templates/charts/pipeline_with_stages.svg` | "Pick for 3-5 horizontal pipeline stages, each = title + 1-line description + output artifact, connected by arrows (data pipelines, ETL, build pipelines). Skip if any stage lacks an artifact (use process_flow or numbered_steps)." | Show job data to Slack digest workflow |
| P05 | vertical_pillars | `templates/charts/vertical_pillars.svg` | "Pick for 1×3 / 1×4 / 1×5 vertical column layout where each pillar = one independent category with title + bullets — PEST (Political/Economic/Social/Technological), four-pillar strategy overview, side-by-side independent categories. Skip for 2×2 quadrant (use quadrant_text_bullets), pricing tiers (use comparison_columns), or 2×2 parallel aspects (use labeled_card)." | Show first wedge: agencies and consultancies |
| P07 | vertical_list | `templates/charts/vertical_list.svg` | "Pick for 3-6 numbered key points each with a short description — design principles, core tenets, action items, key takeaways, recommendations, executive summary points. Skip for icon-style cards (use icon_grid) or sequential steps (use numbered_steps)." | Show commercial readiness before the demo |

**Runners-up considered**

- `process_flow` | rejected for P04: the workflow has named output artifacts at each step, so `pipeline_with_stages` is more precise.
- `icon_grid` | rejected for P05: the first-user slide has independent service-provider categories with short bullets, not equal feature cards.
- `comparison_columns` | rejected for P02: the problem is a two-sided contrast, not pricing or service tiers.

---

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Layout pattern | Acquire Via | Status | Reference | text_policy | page_role |
| -------- | ---------- | ----- | ------- | ---- | -------------- | ----------- | ------ | --------- | ----------- | --------- |
| logo.svg | 128x128 | 1.00 | Product logo on cover and footer lockup | Brand asset | #63 Transparent PNG sticker / cutout | user | Existing | User-provided SignalScout logo from `public/logo.svg` | | |
| dashboard-live.png | 1440x1000 | 1.44 | Current app command center proof image | Screenshot | #46 Background image + bordered "lens" rectangle highlighting a sub-region + #21 Rounded rectangle crop | user | Existing | Live Playwright capture of Command Center after data loaded | | |
| lead-workspace-live.png | 1440x1000 | 1.44 | Current lead detail and outreach proof image | Screenshot | #45 Background image + numbered hotspots with sidebar legend + #21 Rounded rectangle crop | user | Existing | Live Playwright capture of Lead Workspace | | |
| slack-preview-live.png | 1440x1000 | 1.44 | Current Slack digest handoff proof image | Screenshot | #38 Background image + annotation cards with bezier leader lines + #21 Rounded rectangle crop | user | Existing | Live Playwright capture of Slack Preview | | |

The deck has three screenshot-bearing pages, so the required image-as-canvas coverage threshold for four or more image-bearing pages does not apply. P06 still uses image-as-proof with native overlay callouts.

---

## IX. Content Outline

### Part 1: Setup

#### Slide 01 - Cover

- **Layout**: Product logo, large centered title, compact screenshot strip bleeding from the lower right.
- **Title**: SignalScout AI
- **Subtitle**: Turn job postings into B2B buying signals.
- **Core message**: Job postings are the evidence layer for a more timely outbound workflow.
- **Visualization**: Product screenshot + minimal lockup.
- **Content**: One-line premise only; no feature list.

#### Slide 02 - The Problem

- **Layout**: Two-sided contrast using `pros_cons_chart` logic.
- **Title**: Outbound teams are late to the signal.
- **Core message**: Static lead lists tell sellers who exists, but not why now.
- **Visualization**: `pros_cons_chart`
- **Content**:
  - Static lists: who exists; firmographics; stale intent.
  - Fresh hiring behavior: active change; role evidence; timing signal.
  - Transition sentence: the problem is not finding more companies; it is finding a credible reason to reach out today.

#### Slide 03 - The Insight

- **Layout**: Compact signal map table with one highlighted row.
- **Title**: Hiring is a public trail of operational intent.
- **Core message**: A role opening is not proof of budget, but it is evidence of a business priority.
- **Visualization**: `basic_table`
- **Content**:
  - BI Analyst + Tableau Developer -> dashboard backlog or reporting initiative.
  - Data Engineer + Analytics Engineer -> data pipeline or metrics-layer buildout.
  - Cloud Engineer + SRE -> infrastructure modernization or reliability push.
  - Security Engineer + IAM role -> compliance, access, or risk readiness project.
  - Automation Specialist + RevOps Manager -> process automation and GTM operations gap.

#### Slide 04 - The Product

- **Layout**: Horizontal pipeline with five stages and named output artifact per stage.
- **Title**: SignalScout turns hiring behavior into sales action.
- **Core message**: The product is a workflow, not a scraper.
- **Visualization**: `pipeline_with_stages`
- **Content**:
  - Job data -> postings by company and source.
  - Hiring signal -> role pattern and matched evidence.
  - Lead score -> relevance, urgency, confidence.
  - Outreach draft -> grounded opening line.
  - Slack digest -> morning team handoff.

### Part 2: Demo Setup

#### Slide 05 - The First User

- **Layout**: Four vertical pillars, restrained cards with user-category headlines.
- **Title**: Built first for agencies and consultancies.
- **Core message**: Service providers benefit first because hiring reveals the work clients are already trying to solve.
- **Visualization**: `vertical_pillars`
- **Content**:
  - Data-dashboard agencies: reporting, BI, RevOps visibility.
  - Cloud migration consultancies: platform modernization and reliability.
  - Cybersecurity vendors: compliance, IAM, risk readiness.
  - AI automation service providers: workflow and operations bottlenecks.

#### Slide 06 - Product Proof

- **Layout**: Large live screenshot with three native callouts over calm regions.
- **Title**: SignalScout already completes the loop.
- **Core message**: SignalScout shows the end-to-end path from loaded jobs to ranked lead and evidence-backed handoff.
- **Visualization**: Screenshot proof with native overlay callouts.
- **Content**:
  - Command Center loads enriched provider-style job data.
  - Lead Workspace explains score, evidence, inferred pain, and outreach.
  - Slack Preview turns top leads into a channel-ready digest.

#### Slide 07 - Commercial Readiness

- **Layout**: Buyer panel plus vertical readiness list.
- **Title**: Ready to sell into service teams.
- **Core message**: SignalScout is a practical prospecting product for agencies and consultancies, not only a demo artifact.
- **Visualization**: `vertical_list`
- **Content**:
  - Primary buyer: B2B agencies and consultancies.
  - Public data: job postings refresh the signal source.
  - Daily priority list: ranked accounts with evidence.
  - Sales artifacts: inferred pain, proof, and outreach draft.
  - Workflow fit: Slack digest and export paths support a small-team pilot.

#### Slide 08 - Live Demo

- **Layout**: Negative-space transition slide with one workflow line.
- **Title**: Live demo
- **Subtitle**: Job data -> hiring signal -> lead score -> outreach -> Slack digest
- **Core message**: The deck is done explaining; the website now shows the full workflow live.
- **Visualization**: Minimal process line only.
- **Content**: Speaker moves immediately to the app and follows `docs/DEMO_FLOW.md`.

---

## X. Speaker Notes Requirements

One speaker note file per page, saved to `notes/` after SVG generation.

- **Filename**: match SVG name, e.g. `01_cover.md`.
- **Master file**: `notes/total.md` uses `#` headings for splitting.
- **Total slide duration**: 3-5 minutes.
- **Notes style**: conversational, concise, buyer-facing.
- **Presentation purpose**: persuade judges that SignalScout has a coherent buyer insight and a marketable workflow.

---

## XI. Technical Constraints Reminder

### SVG Generation Must Follow

1. viewBox: `0 0 1280 720`
2. Background uses `<rect>` elements.
3. Text wrapping uses `<tspan>`; `<foreignObject>` is forbidden.
4. Transparency uses `fill-opacity` / `stroke-opacity`; `rgba()` is forbidden.
5. Forbidden: `mask`, `<style>`, `class`, `foreignObject`, `textPath`, `animate*`, `script`.
6. Use raw Unicode only when needed; XML reserved characters must be escaped.
7. `clipPath` may be used only on image elements.

### PPT Compatibility Rules

- No group opacity; set opacity on each child element.
- Inline attributes only; no external CSS and no `@font-face`.
- Screenshots marked as no-crop in the execution lock must use `meet` or a container that preserves all useful UI detail.
