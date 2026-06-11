import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { defaultOffers } from "@/lib/defaults";
import { HttpError } from "@/lib/http";
import type { JobPosting, JobPostingInput, LeadSignal, LeadSignalInput, OfferProfile, OfferProfileInput, ScoringWeights } from "@/lib/types";

let cached: SupabaseClient | null = null;

export function getSupabase() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new HttpError(500, "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY.");
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { "x-application-name": "signalscout-ai" },
        fetch: timeoutFetch
      }
    });
  }
  return cached;
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) {
    return value;
  }
  try {
    const url = new URL(value.trim());
    url.pathname = url.pathname.replace(/\/rest\/v1\/?$/i, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

async function timeoutFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function tableError(error: { message?: string; code?: string } | null, fallback = "Database request failed.") {
  if (!error) {
    return;
  }
  if (error.code === "42P01" || error.message?.includes("does not exist")) {
    throw new HttpError(500, "Supabase tables are missing. Run supabase/schema.sql in the Supabase SQL editor.");
  }
  if (error.message?.includes("fetch failed") || error.message?.includes("aborted")) {
    throw new HttpError(500, "Could not reach Supabase. Check SUPABASE_URL, SUPABASE_KEY, and network access.");
  }
  throw new HttpError(500, error.message || fallback);
}

export async function ensureDefaultOffers() {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase.from("offer_profiles").select("id", { count: "exact", head: true });
  tableError(countError);
  if ((count || 0) > 0) {
    return;
  }
  const { error } = await supabase.from("offer_profiles").insert(defaultOffers);
  tableError(error, "Could not seed default offers.");
}

export function normalizeOffer(row: Record<string, unknown>): OfferProfile {
  return {
    id: Number(row.id),
    name: String(row.name || ""),
    seller_description: String(row.seller_description || ""),
    target_customers: String(row.target_customers || ""),
    keywords: normalizeStringArray(row.keywords),
    negative_keywords: normalizeStringArray(row.negative_keywords),
    scoring_weights: normalizeScoringWeights(row.scoring_weights),
    created_at: optionalString(row.created_at),
    updated_at: optionalString(row.updated_at)
  };
}

export function normalizeJob(row: Record<string, unknown>): JobPosting {
  return {
    id: Number(row.id),
    source: String(row.source || ""),
    external_id: String(row.external_id || ""),
    title: String(row.title || ""),
    company: String(row.company || ""),
    location: String(row.location || ""),
    description: String(row.description || ""),
    url: String(row.url || ""),
    posted_at: String(row.posted_at || ""),
    raw_json: normalizeRecord(row.raw_json),
    created_at: optionalString(row.created_at)
  };
}

export function normalizeLead(row: Record<string, unknown>): LeadSignal {
  return {
    id: Number(row.id),
    company: String(row.company || ""),
    matched_offer_id: Number(row.matched_offer_id),
    signal_summary: String(row.signal_summary || ""),
    inferred_pain: String(row.inferred_pain || ""),
    evidence_jobs_json: Array.isArray(row.evidence_jobs_json) ? row.evidence_jobs_json as LeadSignal["evidence_jobs_json"] : [],
    score: Number(row.score || 0),
    urgency_score: Number(row.urgency_score || 0),
    relevance_score: Number(row.relevance_score || 0),
    confidence_score: Number(row.confidence_score || 0),
    outreach_subject: String(row.outreach_subject || ""),
    outreach_body: String(row.outreach_body || ""),
    created_at: optionalString(row.created_at)
  };
}

export function offerPayload(payload: OfferProfileInput) {
  return {
    name: requiredString(payload.name, "Offer name is required."),
    seller_description: requiredString(payload.seller_description, "Seller description is required."),
    target_customers: requiredString(payload.target_customers, "Target customers are required."),
    keywords: normalizeStringArray(payload.keywords),
    negative_keywords: normalizeStringArray(payload.negative_keywords)
  };
}

export function jobPayload(payload: JobPostingInput) {
  return {
    source: requiredString(payload.source, "Job source is required."),
    external_id: requiredString(payload.external_id, "External job id is required."),
    title: requiredString(payload.title, "Job title is required."),
    company: requiredString(payload.company, "Company is required."),
    location: String(payload.location || ""),
    description: String(payload.description || ""),
    url: String(payload.url || ""),
    posted_at: requiredString(payload.posted_at, "Posted date is required."),
    raw_json: normalizeRecord(payload.raw_json)
  };
}

export function leadPayload(payload: LeadSignalInput) {
  return {
    company: requiredString(payload.company, "Lead company is required."),
    matched_offer_id: Number(payload.matched_offer_id),
    signal_summary: requiredString(payload.signal_summary, "Signal summary is required."),
    inferred_pain: requiredString(payload.inferred_pain, "Inferred pain is required."),
    evidence_jobs_json: payload.evidence_jobs_json || [],
    score: clampScore(payload.score),
    urgency_score: clampScore(payload.urgency_score),
    relevance_score: clampScore(payload.relevance_score),
    confidence_score: clampScore(payload.confidence_score),
    outreach_subject: requiredString(payload.outreach_subject, "Outreach subject is required."),
    outreach_body: requiredString(payload.outreach_body, "Outreach body is required.")
  };
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/,|\n/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeScoringWeights(value: unknown): ScoringWeights {
  const record = normalizeRecord(value);
  const relevance = Number(record.relevance ?? 45);
  const urgency = Number(record.urgency ?? 35);
  const confidence = Number(record.confidence ?? 20);
  return {
    relevance: Number.isFinite(relevance) ? relevance : 45,
    urgency: Number.isFinite(urgency) ? urgency : 35,
    confidence: Number.isFinite(confidence) ? confidence : 20
  };
}

function requiredString(value: unknown, message: string) {
  const text = String(value || "").trim();
  if (!text) {
    throw new HttpError(400, message);
  }
  return text;
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
