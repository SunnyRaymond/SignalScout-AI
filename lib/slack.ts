import type { LeadSignal, SlackPreview } from "@/lib/types";

export function buildSlackDigest(leads: LeadSignal[]): SlackPreview {
  const top = [...leads].sort((a, b) => b.score - a.score).slice(0, 5);
  const text = top.length === 0
    ? "SignalScout AI digest: no lead signals yet. Load sample jobs and run the agent."
    : [
      "SignalScout AI buying-signal digest",
      "",
      ...top.flatMap((lead, index) => [
        `${index + 1}. ${lead.company} - ${lead.score}/100`,
        `   ${lead.signal_summary}`,
        `   Pain: ${lead.inferred_pain}`
      ])
    ].join("\n");
  return {
    has_webhook: Boolean(process.env.SLACK_WEBHOOK_URL),
    demo_mode: !process.env.SLACK_WEBHOOK_URL,
    text,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*SignalScout AI buying-signal digest*\n${top.length ? "Top ranked leads from the latest run." : "No lead signals yet."}` }
      },
      ...top.flatMap((lead) => [
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${lead.company}* - ${lead.score}/100\n${lead.signal_summary}\n_Pain:_ ${lead.inferred_pain}`
          }
        }
      ])
    ],
    leads: top
  };
}

export async function sendSlackDigest(preview: SlackPreview) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return { sent: false, message: "Slack webhook is not configured. Preview is available.", preview: preview.text };
  }
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: preview.text, blocks: preview.blocks })
  });
  if (!response.ok) {
    return { sent: false, message: `Slack returned ${response.status}.`, preview: preview.text };
  }
  return { sent: true, message: "Slack digest sent.", preview: preview.text };
}
