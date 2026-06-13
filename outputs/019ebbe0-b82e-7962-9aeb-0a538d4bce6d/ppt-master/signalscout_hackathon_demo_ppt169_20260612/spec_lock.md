# Execution Lock

## canvas
- viewBox: 0 0 1280 720
- format: PPT 16:9

## colors
- bg: #FFFFFF
- bg_soft: #F8FAFC
- primary: #10B981
- accent: #38BDF8
- secondary_accent: #0F172A
- text: #0F172A
- text_secondary: #475569
- text_tertiary: #94A3B8
- border: #E2E8F0
- success: #10B981
- warning: #F59E0B

## typography
- font_family: Arial, Microsoft YaHei, PingFang SC, sans-serif
- title_family: Georgia, Microsoft YaHei, serif
- emphasis_family: Georgia, Microsoft YaHei, serif
- code_family: Consolas, Courier New, monospace
- body: 22
- title: 40
- subtitle: 28
- annotation: 15
- cover_title: 72
- section_title: 58
- hero_number: 56
- footer: 12

## icons
- library: tabler-outline
- stroke_width: 2
- inventory: target, database, filter-2-spark, chart-bar, message-2-check, send, users, briefcase

## images
- logo: images/logo.svg | no-crop
- dashboard_live: images/dashboard-live.png | no-crop
- lead_workspace_live: images/lead-workspace-live.png | no-crop
- slack_preview_live: images/slack-preview-live.png | no-crop

## page_rhythm
- P01: anchor
- P02: dense
- P03: dense
- P04: dense
- P05: dense
- P06: breathing
- P07: dense
- P08: anchor

## page_charts
- P02: pros_cons_chart
- P03: basic_table
- P04: pipeline_with_stages
- P05: vertical_pillars
- P07: vertical_list

## forbidden
- Mixing icon libraries
- rgba()
- `<style>`, `class`, `<foreignObject>`, `textPath`, `@font-face`, `<animate*>`, `<script>`, `<iframe>`, `<symbol>`+`<use>`
- `<g opacity>` (set opacity on each child element individually)
- HTML named entities in text (`&nbsp;`, `&mdash;`, `&copy;`, `&ndash;`, `&reg;`, `&hellip;`, `&bull;`)
