import type { NextRequest } from "next/server";
import { buildLeadSignals, promptVersion } from "@/lib/agent";
import { fetchProviderJobs } from "@/lib/job-providers";
import { HttpError, fail, ok, readJson } from "@/lib/http";
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
import type { AgentRunRequest, FetchJobsRequest, JobPostingInput, OfferProfileInput } from "@/lib/types";

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
    const sampleJobs = await readSampleJobs();
    const { data: existing, error: existingError } = await supabase.from("job_postings").select("source,external_id");
    tableError(existingError);
    const existingKeys = new Set((existing || []).map((row) => `${row.source}:${row.external_id}`));
    const rows = sampleJobs.map(jobPayload);
    const { error } = await supabase.from("job_postings").upsert(rows, { onConflict: "source,external_id" });
    tableError(error, "Could not load sample jobs.");
    const total = await countRows("job_postings");
    const updated = rows.filter((row) => existingKeys.has(`${row.source}:${row.external_id}`)).length;
    return ok({ status: "loaded", added: rows.length - updated, updated, total });
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
