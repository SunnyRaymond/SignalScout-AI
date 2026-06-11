import type { NextRequest } from "next/server";
import { buildLeadSignals, previewLeadRanking, promptVersion } from "@/lib/agent";
import { fetchProviderJobs } from "@/lib/job-providers";
import { HttpError, csv, fail, ok, readJson } from "@/lib/http";
import { readSampleJobs } from "@/lib/sample-jobs";
import { buildSlackDigest, sendSlackDigest } from "@/lib/slack";
import {
  ensureDefaultOffers,
  getSupabase,
  jobPayload,
  normalizeJob,
  normalizeLead,
  normalizeOffer,
  offerPayload,
  tableError
} from "@/lib/supabase";
import type {
  AgentComparisonRequest,
  AgentComparisonRow,
  AgentRunHistory,
  AgentRunRequest,
  AgentTelemetry,
  AgentTraceStep,
  BuyerPersona,
  FetchJobsRequest,
  JobPostingInput,
  LeadDiagnostic,
  LeadSignal,
  OfferProfileInput
} from "@/lib/types";

export async function handleApiRequest(request: NextRequest, path: string[]) {
  try {
    const [resource, id, action] = path;
    if (!resource || resource === "health") {
      return ok({ status: "ok" });
    }
    if (resource === "status" && request.method === "GET") {
      return await status();
    }
    if (resource === "offers") {
      return await offers(request, id);
    }
    if (resource === "jobs") {
      return await jobs(request, id, action);
    }
    if (resource === "leads") {
      return await leads(request, id);
    }
    if (resource === "agent" && id === "run" && request.method === "POST") {
      return await runAgent(request);
    }
    if (resource === "agent" && id === "runs" && request.method === "GET") {
      return await agentRuns(request);
    }
    if (resource === "agent" && id === "compare" && request.method === "POST") {
      return await compareAgent(request);
    }
    if (resource === "demo" && id === "reset" && request.method === "POST") {
      return await demoReset();
    }
    if (resource === "exports") {
      return await exports(request, id);
    }
    if (resource === "slack") {
      return await slack(request, id);
    }
    throw new HttpError(404, "API route not found.");
  } catch (error) {
    return fail(error);
  }
}

async function status() {
  await ensureDefaultOffers();
  const [offers, jobs, leads] = await Promise.all([
    countRows("offer_profiles"),
    countRows("job_postings"),
    countRows("lead_signals")
  ]);
  return ok({
    status: "ok",
    database: "supabase",
    model: process.env.OPENAI_MODEL || "gpt-5.4-nano",
    counts: { offers, jobs, leads },
    integrations: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      slack: Boolean(process.env.SLACK_WEBHOOK_URL),
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
    }
  });
}

async function offers(request: NextRequest, id?: string) {
  await ensureDefaultOffers();
  const supabase = getSupabase();
  if (!id && request.method === "GET") {
    const { data, error } = await supabase.from("offer_profiles").select("*").order("id");
    tableError(error);
    return ok((data || []).map(normalizeOffer));
  }
  if (!id && request.method === "POST") {
    const payload = offerPayload(await readJson<OfferProfileInput>(request));
    const { data, error } = await supabase.from("offer_profiles").insert(payload).select("*").single();
    tableError(error, "Could not create offer.");
    return ok(normalizeOffer(data), 201);
  }
  const offerId = parseId(id, "Offer id is invalid.");
  if (request.method === "GET") {
    const { data, error } = await supabase.from("offer_profiles").select("*").eq("id", offerId).single();
    if (error?.code === "PGRST116") {
      throw new HttpError(404, "Offer not found.");
    }
    tableError(error);
    return ok(normalizeOffer(data));
  }
  if (request.method === "PUT") {
    const payload = offerPayload(await readJson<OfferProfileInput>(request));
    const { data, error } = await supabase.from("offer_profiles").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", offerId).select("*").single();
    if (error?.code === "PGRST116") {
      throw new HttpError(404, "Offer not found.");
    }
    tableError(error, "Could not update offer.");
    return ok(normalizeOffer(data));
  }
  if (request.method === "DELETE") {
    const { error: leadError } = await supabase.from("lead_signals").delete().eq("matched_offer_id", offerId);
    tableError(leadError, "Could not clear offer leads.");
    const { error } = await supabase.from("offer_profiles").delete().eq("id", offerId);
    tableError(error, "Could not delete offer.");
    return ok({ status: "deleted" });
  }
  throw new HttpError(405, "Method not allowed.");
}

async function jobs(request: NextRequest, id?: string, action?: string) {
  const supabase = getSupabase();
  if (id === "load-sample" && request.method === "POST") {
    return ok({ status: "loaded", ...await loadSampleJobsIntoDatabase() });
  }
  if (id === "fetch" && request.method === "POST") {
    const fetched = await fetchProviderJobs(await readJson<FetchJobsRequest>(request));
    const { data: existing, error: existingError } = await supabase.from("job_postings").select("source,external_id");
    tableError(existingError);
    const existingKeys = new Set((existing || []).map((row) => `${row.source}:${row.external_id}`));
    const rows = fetched.jobs.map(jobPayload);
    if (rows.length > 0) {
      const { error } = await supabase.from("job_postings").upsert(rows, { onConflict: "source,external_id" });
      tableError(error, "Could not save fetched jobs.");
    }
    const added = rows.filter((row) => !existingKeys.has(`${row.source}:${row.external_id}`)).length;
    return ok({ status: "ok", message: fetched.message, added, jobs: rows });
  }
  if (!id && request.method === "GET") {
    const { data, error } = await supabase.from("job_postings").select("*").order("posted_at", { ascending: false }).order("id", { ascending: false });
    tableError(error);
    return ok((data || []).map(normalizeJob));
  }
  if (!id && request.method === "POST") {
    const payload = jobPayload(await readJson<JobPostingInput>(request));
    const { data, error } = await supabase.from("job_postings").upsert(payload, { onConflict: "source,external_id" }).select("*").single();
    tableError(error, "Could not save job.");
    return ok(normalizeJob(data), 201);
  }
  if (action) {
    throw new HttpError(404, "Job route not found.");
  }
  const jobId = parseId(id, "Job id is invalid.");
  if (request.method === "GET") {
    const { data, error } = await supabase.from("job_postings").select("*").eq("id", jobId).single();
    if (error?.code === "PGRST116") {
      throw new HttpError(404, "Job not found.");
    }
    tableError(error);
    return ok(normalizeJob(data));
  }
  if (request.method === "PUT") {
    const payload = jobPayload(await readJson<JobPostingInput>(request));
    const { data, error } = await supabase.from("job_postings").update(payload).eq("id", jobId).select("*").single();
    if (error?.code === "PGRST116") {
      throw new HttpError(404, "Job not found.");
    }
    tableError(error, "Could not update job.");
    return ok(normalizeJob(data));
  }
  if (request.method === "DELETE") {
    const { error } = await supabase.from("job_postings").delete().eq("id", jobId);
    tableError(error, "Could not delete job.");
    return ok({ status: "deleted" });
  }
  throw new HttpError(405, "Method not allowed.");
}

async function demoReset() {
  const supabase = getSupabase();
  const { error: leadError } = await supabase.from("lead_signals").delete().neq("id", 0);
  tableError(leadError, "Could not clear demo leads.");
  const { error: runError } = await supabase.from("agent_runs").delete().not("id", "is", null);
  if (runError && runError.code !== "42P01" && !runError.message?.includes("does not exist") && !runError.message?.includes("schema cache")) {
    tableError(runError, "Could not clear demo run history.");
  }
  const { error: jobError } = await supabase.from("job_postings").delete().neq("id", 0);
  tableError(jobError, "Could not clear demo jobs.");
  const sample = await loadSampleJobsIntoDatabase();
  return ok({
    status: "reset",
    message: `Demo reset complete: ${sample.total} jobs loaded and leads cleared.`,
    leads_cleared: true,
    jobs: sample
  });
}

async function leads(request: NextRequest, id?: string) {
  const supabase = getSupabase();
  if (!id && request.method === "GET") {
    const { data, error } = await supabase.from("lead_signals").select("*").order("score", { ascending: false }).order("created_at", { ascending: false });
    tableError(error);
    return ok((data || []).map(normalizeLead));
  }
  if (!id && request.method === "DELETE") {
    const { error } = await supabase.from("lead_signals").delete().neq("id", 0);
    tableError(error, "Could not clear leads.");
    return ok({ status: "deleted" });
  }
  const leadId = parseId(id, "Lead id is invalid.");
  if (request.method === "GET") {
    const { data, error } = await supabase.from("lead_signals").select("*").eq("id", leadId).single();
    if (error?.code === "PGRST116") {
      throw new HttpError(404, "Lead not found.");
    }
    tableError(error);
    return ok(normalizeLead(data));
  }
  if (request.method === "DELETE") {
    const { error } = await supabase.from("lead_signals").delete().eq("id", leadId);
    tableError(error, "Could not delete lead.");
    return ok({ status: "deleted" });
  }
  throw new HttpError(405, "Method not allowed.");
}

async function runAgent(request: NextRequest) {
  await ensureDefaultOffers();
  const supabase = getSupabase();
  const payload = await readJson<AgentRunRequest>(request);
  const startedAt = Date.now();
  const buyerPersona = payload.buyer_persona || "revops";
  let offersQuery = supabase.from("offer_profiles").select("*").order("id");
  if (payload.offer_id) {
    offersQuery = offersQuery.eq("id", payload.offer_id);
  }
  const [{ data: offerRows, error: offerError }, { data: jobRows, error: jobError }] = await Promise.all([
    offersQuery,
    supabase.from("job_postings").select("*").order("posted_at", { ascending: false })
  ]);
  tableError(offerError);
  tableError(jobError);
  const offers = (offerRows || []).map(normalizeOffer);
  if (payload.offer_id && offers.length === 0) {
    throw new HttpError(404, "Offer not found.");
  }
  const jobs = (jobRows || []).map(normalizeJob);
  if (offers.length === 0 || jobs.length === 0) {
    return ok({ status: "ok", created: 0, leads: [], diagnostics: [], trace: [], telemetry: null, prompt_version: promptVersion });
  }
  const generated = await buildLeadSignals(offers, jobs, {
    buyer_persona: buyerPersona,
    scoring_weights: payload.scoring_weights
  });
  if (payload.clear_existing !== false) {
    const { error } = await supabase.from("lead_signals").delete().in("matched_offer_id", offers.map((offer) => offer.id));
    tableError(error, "Could not clear previous leads.");
  }
  if (generated.leads.length === 0) {
    await tryInsertAgentRun({
      offer_ids: offers.map((offer) => offer.id),
      buyer_persona: buyerPersona,
      prompt_version: promptVersion,
      model: generated.telemetry.model,
      created_leads: 0,
      duration_ms: Date.now() - startedAt,
      diagnostics_json: generated.diagnostics,
      telemetry_json: generated.telemetry,
      trace_json: generated.trace
    });
    return ok({ status: "ok", created: 0, leads: [], diagnostics: generated.diagnostics, trace: generated.trace, telemetry: generated.telemetry, prompt_version: promptVersion });
  }
  const { data, error } = await supabase.from("lead_signals").insert(generated.leads).select("*");
  tableError(error, "Could not save generated leads.");
  const leadsOut = (data || []).map(normalizeLead).sort((a, b) => b.score - a.score);
  await tryInsertAgentRun({
    offer_ids: offers.map((offer) => offer.id),
    buyer_persona: buyerPersona,
    prompt_version: promptVersion,
    model: generated.telemetry.model,
    created_leads: leadsOut.length,
    duration_ms: Date.now() - startedAt,
    diagnostics_json: generated.diagnostics,
    telemetry_json: generated.telemetry,
    trace_json: generated.trace
  });
  return ok({
    status: "ok",
    created: leadsOut.length,
    leads: leadsOut,
    diagnostics: generated.diagnostics,
    trace: generated.trace,
    telemetry: generated.telemetry,
    prompt_version: promptVersion
  });
}

async function agentRuns(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 6), 1), 20);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  tableError(error, "Could not load agent run history.");
  return ok({ status: "ok", runs: (data || []).map(normalizeAgentRun) });
}

async function compareAgent(request: NextRequest) {
  await ensureDefaultOffers();
  const supabase = getSupabase();
  const payload = await readJson<AgentComparisonRequest>(request);
  const offerId = parseId(String(payload.offer_id || ""), "Offer id is invalid.");
  const buyerPersona = normalizePersona(payload.buyer_persona);
  const [{ data: offerRow, error: offerError }, { data: jobRows, error: jobError }] = await Promise.all([
    supabase.from("offer_profiles").select("*").eq("id", offerId).single(),
    supabase.from("job_postings").select("*").order("posted_at", { ascending: false })
  ]);
  if (offerError?.code === "PGRST116") {
    throw new HttpError(404, "Offer not found.");
  }
  tableError(offerError);
  tableError(jobError);
  const offer = normalizeOffer(offerRow);
  const jobs = (jobRows || []).map(normalizeJob);
  const baseline = previewLeadRanking([offer], jobs, {
    buyer_persona: buyerPersona,
    scoring_weights: payload.baseline_weights
  });
  const challenger = previewLeadRanking([offer], jobs, {
    buyer_persona: buyerPersona,
    scoring_weights: payload.challenger_weights
  });
  const rows = comparisonRows(baseline, challenger);
  return ok({
    status: "ok",
    offer_id: offerId,
    offer_name: offer.name,
    buyer_persona: buyerPersona,
    baseline_weights: payload.baseline_weights,
    challenger_weights: payload.challenger_weights,
    rows
  });
}

async function exports(request: NextRequest, id?: string) {
  if (request.method !== "GET") {
    throw new HttpError(405, "Method not allowed.");
  }
  if (id === "leads") {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("lead_signals").select("*").order("score", { ascending: false }).order("created_at", { ascending: false });
    tableError(error, "Could not export leads.");
    const leads = (data || []).map(normalizeLead);
    return csv(leadsCsv(leads), "signalscout-ranked-leads.csv");
  }
  if (id === "diagnostics") {
    const latest = await latestAgentRun();
    return csv(diagnosticsCsv(latest?.diagnostics_json || []), "signalscout-diagnostics.csv");
  }
  throw new HttpError(404, "Export route not found.");
}

async function slack(request: NextRequest, id?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("lead_signals").select("*").order("score", { ascending: false }).order("created_at", { ascending: false }).limit(5);
  tableError(error);
  const preview = buildSlackDigest((data || []).map(normalizeLead));
  if (id === "preview" && request.method === "GET") {
    return ok(preview);
  }
  if (id === "send" && request.method === "POST") {
    return ok(await sendSlackDigest(preview));
  }
  throw new HttpError(404, "Slack route not found.");
}

async function countRows(table: "offer_profiles" | "job_postings" | "lead_signals") {
  const supabase = getSupabase();
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  tableError(error);
  return count || 0;
}

async function loadSampleJobsIntoDatabase() {
  const supabase = getSupabase();
  const sampleJobs = await readSampleJobs();
  const { data: existing, error: existingError } = await supabase.from("job_postings").select("source,external_id");
  tableError(existingError);
  const existingKeys = new Set((existing || []).map((row) => `${row.source}:${row.external_id}`));
  const rows = sampleJobs.map(jobPayload);
  const { error } = await supabase.from("job_postings").upsert(rows, { onConflict: "source,external_id" });
  tableError(error, "Could not load sample jobs.");
  const total = await countRows("job_postings");
  const updated = rows.filter((row) => existingKeys.has(`${row.source}:${row.external_id}`)).length;
  return { added: rows.length - updated, updated, total };
}

function parseId(value: string | undefined, message: string) {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, message);
  }
  return parsed;
}

async function tryInsertAgentRun(payload: Record<string, unknown>) {
  const supabase = getSupabase();
  const { error } = await supabase.from("agent_runs").insert(payload);
  if (!error || error.code === "42P01" || error.message?.includes("does not exist")) {
    return;
  }
  console.warn("Agent run audit was not stored.", error.message);
}

async function latestAgentRun() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  tableError(error, "Could not load latest agent diagnostics.");
  const first = data?.[0];
  return first ? normalizeAgentRun(first) : null;
}

function normalizeAgentRun(row: Record<string, unknown>): AgentRunHistory {
  return {
    id: String(row.id || ""),
    offer_ids: Array.isArray(row.offer_ids) ? row.offer_ids.map((value) => Number(value)).filter(Number.isFinite) : [],
    buyer_persona: normalizePersona(row.buyer_persona),
    prompt_version: String(row.prompt_version || ""),
    model: String(row.model || ""),
    created_leads: Number(row.created_leads || 0),
    duration_ms: Number(row.duration_ms || 0),
    diagnostics_json: normalizeDiagnostics(row.diagnostics_json),
    telemetry_json: normalizeTelemetry(row.telemetry_json),
    trace_json: normalizeTrace(row.trace_json),
    created_at: String(row.created_at || "")
  };
}

function comparisonRows(
  baseline: ReturnType<typeof previewLeadRanking>,
  challenger: ReturnType<typeof previewLeadRanking>
): AgentComparisonRow[] {
  const baseMap = new Map(baseline.map((item) => [item.company_domain, item]));
  const challengeMap = new Map(challenger.map((item) => [item.company_domain, item]));
  const domains = [...new Set([...baseMap.keys(), ...challengeMap.keys()])];
  return domains.map((domain) => {
    const base = baseMap.get(domain);
    const challenge = challengeMap.get(domain);
    const baselineRank = base?.rank ?? null;
    const challengerRank = challenge?.rank ?? null;
    const baselineScore = base?.score ?? null;
    const challengerScore = challenge?.score ?? null;
    return {
      company: challenge?.company || base?.company || domain,
      company_domain: domain,
      baseline_rank: baselineRank,
      challenger_rank: challengerRank,
      baseline_score: baselineScore,
      challenger_score: challengerScore,
      rank_delta: baselineRank && challengerRank ? baselineRank - challengerRank : null,
      score_delta: baselineScore !== null && challengerScore !== null ? challengerScore - baselineScore : null,
      top_evidence: challenge?.top_evidence || base?.top_evidence || ""
    };
  }).sort((a, b) => {
    if (a.challenger_rank && b.challenger_rank) {
      return a.challenger_rank - b.challenger_rank;
    }
    return (a.challenger_rank || 999) - (b.challenger_rank || 999);
  });
}

function normalizePersona(value: unknown): BuyerPersona {
  return value === "it" || value === "security" || value === "data" || value === "revops" ? value : "revops";
}

function normalizeDiagnostics(value: unknown): LeadDiagnostic[] {
  return Array.isArray(value) ? value as LeadDiagnostic[] : [];
}

function normalizeTrace(value: unknown): AgentTraceStep[] {
  return Array.isArray(value) ? value as AgentTraceStep[] : [];
}

function normalizeTelemetry(value: unknown): AgentTelemetry | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AgentTelemetry : null;
}

function leadsCsv(leads: LeadSignal[]) {
  const rows = leads.map((lead, index) => {
    const top = lead.evidence_jobs_json[0];
    return [
      index + 1,
      lead.company,
      lead.score,
      lead.relevance_score,
      lead.urgency_score,
      lead.confidence_score,
      top?.title || "",
      top?.source || "",
      top?.role_driver || "",
      lead.signal_summary,
      lead.inferred_pain,
      lead.outreach_subject,
      lead.outreach_body
    ];
  });
  return toCsv([
    "rank",
    "company",
    "score",
    "relevance_score",
    "urgency_score",
    "confidence_score",
    "top_evidence_title",
    "top_evidence_source",
    "role_driver",
    "signal_summary",
    "inferred_pain",
    "outreach_subject",
    "outreach_body"
  ], rows);
}

function diagnosticsCsv(diagnostics: LeadDiagnostic[]) {
  const rows = diagnostics.map((item, index) => [
    index + 1,
    item.company,
    item.company_domain,
    item.title,
    item.source,
    item.score,
    item.reason,
    item.negative_hits.join("; "),
    item.missing_keywords.join("; "),
    item.url
  ]);
  return toCsv([
    "rank",
    "company",
    "company_domain",
    "title",
    "source",
    "score",
    "reason",
    "negative_hits",
    "missing_keywords",
    "url"
  ], rows);
}

function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  return [headers, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\r\n");
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}
