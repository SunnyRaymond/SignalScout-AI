import { defaultOpenAIModel } from "@/lib/defaults";
import { HttpError } from "@/lib/http";

type OpenAILeadRequest = {
  lead_key: string;
  company: string;
  offer_name: string;
  seller_description: string;
  target_customers: string;
  score: number;
  urgency_score: number;
  relevance_score: number;
  confidence_score: number;
  evidence: Array<{
    title: string;
    location: string;
    matched_keywords: string[];
    job_match_score: number;
  }>;
};

export type OpenAILeadPatch = {
  lead_key: string;
  signal_summary: string;
  inferred_pain: string;
  outreach_subject: string;
  outreach_body: string;
};

export async function enrichLeadsWithOpenAI(leads: OpenAILeadRequest[]) {
  if (leads.length === 0) {
    return new Map<string, OpenAILeadPatch>();
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, "OPENAI_API_KEY is not configured. Agent output requires live OpenAI generation.");
  }
  const patches = new Map<string, OpenAILeadPatch>();
  for (const chunk of chunked(leads, 5)) {
    for (const patch of await requestLeadPatches(chunk, apiKey)) {
      patches.set(patch.lead_key, patch);
    }
  }
  const missing = leads.filter((lead) => !patches.has(lead.lead_key));
  for (const lead of missing) {
    for (const patch of await requestLeadPatches([lead], apiKey)) {
      patches.set(patch.lead_key, patch);
    }
  }
  return patches;
}

async function requestLeadPatches(leads: OpenAILeadRequest[], apiKey: string) {
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || defaultOpenAIModel;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "You are SignalScout AI, a concise B2B sales intelligence agent.",
            "Turn hiring evidence into buying signals without inventing facts.",
            "Return compact JSON only with shape {\"leads\":[{\"lead_key\":\"...\",\"signal_summary\":\"...\",\"inferred_pain\":\"...\",\"outreach_subject\":\"...\",\"outreach_body\":\"...\"}]}.",
            "Return exactly one object for every input lead_key, preserving each lead_key byte-for-byte."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: "For each lead, write one grounded signal summary, one inferred pain, and a short consultative outreach email. Keep each field specific to the job evidence.",
            leads
          })
        }
      ],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const detail = await safeResponseText(response);
    throw new HttpError(502, `OpenAI generation failed for ${model}: ${detail}`);
  }
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new HttpError(502, "OpenAI returned an empty generation.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, "OpenAI returned malformed JSON.");
  }
  const output = parsed as { leads?: OpenAILeadPatch[] };
  if (!Array.isArray(output.leads)) {
    throw new HttpError(502, "OpenAI JSON did not include a leads array.");
  }
  return output.leads.filter(isPatch);
}

function isPatch(value: unknown): value is OpenAILeadPatch {
  const patch = value as OpenAILeadPatch;
  return Boolean(patch?.lead_key && patch.signal_summary && patch.inferred_pain && patch.outreach_subject && patch.outreach_body);
}

async function safeResponseText(response: Response) {
  try {
    const text = await response.text();
    return text.slice(0, 800) || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function chunked<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
