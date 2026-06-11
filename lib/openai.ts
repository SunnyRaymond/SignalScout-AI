import { defaultOpenAIModel } from "@/lib/defaults";
import { HttpError } from "@/lib/http";
import type { AgentTelemetry, BuyerPersona } from "@/lib/types";

type OpenAILeadRequest = {
  lead_key: string;
  company: string;
  buyer_persona: BuyerPersona;
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
    keyword_contexts: Array<{ keyword: string; snippet: string; reason: string }>;
    role_driver: string;
    historical_delta: number;
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

export async function enrichLeadsWithOpenAI(leads: OpenAILeadRequest[], options: { prompt_version: string }) {
  const model = process.env.OPENAI_MODEL || defaultOpenAIModel;
  const telemetry: AgentTelemetry = {
    model,
    prompt_version: options.prompt_version,
    request_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0
  };
  if (leads.length === 0) {
    return { patches: new Map<string, OpenAILeadPatch>(), telemetry };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, "OPENAI_API_KEY is not configured. Agent output requires live OpenAI generation.");
  }
  const patches = new Map<string, OpenAILeadPatch>();
  for (const chunk of chunked(leads, 5)) {
    const result = await requestLeadPatches(chunk, apiKey, options.prompt_version, model);
    mergeTelemetry(telemetry, result.telemetry);
    for (const patch of result.patches) {
      patches.set(patch.lead_key, patch);
    }
  }
  const missing = leads.filter((lead) => !patches.has(lead.lead_key));
  for (const lead of missing) {
    const result = await requestLeadPatches([lead], apiKey, options.prompt_version, model);
    mergeTelemetry(telemetry, result.telemetry);
    for (const patch of result.patches) {
      patches.set(patch.lead_key, patch);
    }
  }
  telemetry.estimated_cost_usd = estimateCost(telemetry.input_tokens, telemetry.output_tokens);
  return { patches, telemetry };
}

async function requestLeadPatches(leads: OpenAILeadRequest[], apiKey: string, promptVersion: string, model: string) {
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const userContent = JSON.stringify({
    instruction: "For each lead, write one grounded signal summary, one inferred pain, and a short consultative outreach email. Tailor the language to the buyer_persona. Cite job evidence only from keyword_contexts and role_driver fields.",
    prompt_version: promptVersion,
    leads
  });
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
            "You are stage two of a two-step agent. Stage one already extracted evidence, scoring, persona, and attribution.",
            "Turn that extracted evidence into buying signals without inventing facts.",
            "Return compact JSON only with shape {\"leads\":[{\"lead_key\":\"...\",\"signal_summary\":\"...\",\"inferred_pain\":\"...\",\"outreach_subject\":\"...\",\"outreach_body\":\"...\"}]}.",
            "Return exactly one object for every input lead_key, preserving each lead_key byte-for-byte."
          ].join(" ")
        },
        {
          role: "user",
          content: userContent
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
    usage?: { prompt_tokens?: number; completion_tokens?: number };
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
  return {
    patches: output.leads.filter(isPatch),
    telemetry: {
      model,
      prompt_version: promptVersion,
      request_count: 1,
      input_tokens: payload.usage?.prompt_tokens || estimateTokens(userContent),
      output_tokens: payload.usage?.completion_tokens || estimateTokens(content),
      estimated_cost_usd: 0
    } satisfies AgentTelemetry
  };
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

function mergeTelemetry(target: AgentTelemetry, addition: AgentTelemetry) {
  target.request_count += addition.request_count;
  target.input_tokens += addition.input_tokens;
  target.output_tokens += addition.output_tokens;
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

function estimateCost(inputTokens: number, outputTokens: number) {
  const inputCost = inputTokens * 0.00000005;
  const outputCost = outputTokens * 0.0000004;
  return Number((inputCost + outputCost).toFixed(6));
}
