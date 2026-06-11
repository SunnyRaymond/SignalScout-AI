import { enrichLeadsWithOpenAI } from "@/lib/openai";
import { leadPayload } from "@/lib/supabase";
import type {
  AgentTelemetry,
  AgentTraceStep,
  BuyerPersona,
  CompanyEnrichment,
  EvidenceJob,
  JobPosting,
  LeadDiagnostic,
  LeadSignalInput,
  OfferProfile,
  ScoringWeights
} from "@/lib/types";

export const promptVersion = "signalscout-agent-v2-demo";

type AgentOptions = {
  buyer_persona?: BuyerPersona;
  scoring_weights?: ScoringWeights;
};

type AgentRuntimeOptions = {
  buyer_persona: BuyerPersona;
  scoring_weights?: ScoringWeights;
};

type Match = {
  job: JobPosting;
  score: number;
  matched_keywords: string[];
  keyword_contexts: EvidenceJob["keyword_contexts"];
  negative_hits: string[];
  role_driver: string;
  historical_delta: number;
  company_domain: string;
  company_enrichment: CompanyEnrichment;
};

type LeadDraft = {
  lead_key: string;
  company: string;
  company_domain: string;
  offer: OfferProfile;
  evidence: EvidenceJob[];
  score: number;
  urgency_score: number;
  relevance_score: number;
  confidence_score: number;
};

const defaultWeights: ScoringWeights = { relevance: 45, urgency: 35, confidence: 20 };

const personaKeywords: Record<BuyerPersona, string[]> = {
  revops: ["revops", "revenue operations", "crm", "sales reporting", "forecasting", "pipeline", "funnel", "gtm"],
  it: ["cloud", "devops", "platform", "infrastructure", "integration", "sre", "kubernetes", "observability"],
  security: ["security", "soc", "compliance", "iam", "risk", "incident", "audit", "vulnerability"],
  data: ["data", "analytics", "dashboard", "tableau", "power bi", "sql", "dbt", "warehouse", "reporting"]
};

export async function buildLeadSignals(offers: OfferProfile[], jobs: JobPosting[], options: AgentOptions = {}) {
  const buyerPersona = options.buyer_persona || "revops";
  const extracted = extractEvidenceDrafts(offers, jobs, { ...options, buyer_persona: buyerPersona });
  const drafts = extracted.drafts.sort((a, b) => b.score - a.score).slice(0, 18);
  const { patches, telemetry } = await enrichLeadsWithOpenAI(drafts.map((draft) => ({
    lead_key: draft.lead_key,
    company: draft.company,
    buyer_persona: buyerPersona,
    offer_name: draft.offer.name,
    seller_description: draft.offer.seller_description,
    target_customers: draft.offer.target_customers,
    score: draft.score,
    urgency_score: draft.urgency_score,
    relevance_score: draft.relevance_score,
    confidence_score: draft.confidence_score,
    evidence: draft.evidence.map((job) => ({
      title: job.title,
      location: job.location,
      matched_keywords: job.matched_keywords,
      keyword_contexts: job.keyword_contexts,
      role_driver: job.role_driver,
      historical_delta: job.historical_delta,
      job_match_score: job.job_match_score
    }))
  })), { prompt_version: promptVersion });

  const leads = drafts.map((draft) => {
    const patch = patches.get(draft.lead_key);
    if (!patch) {
      throw new Error(`OpenAI did not return a lead for ${draft.company}.`);
    }
    return leadPayload({
      company: draft.company,
      matched_offer_id: draft.offer.id,
      signal_summary: patch.signal_summary,
      inferred_pain: patch.inferred_pain,
      evidence_jobs_json: draft.evidence,
      score: draft.score,
      urgency_score: draft.urgency_score,
      relevance_score: draft.relevance_score,
      confidence_score: draft.confidence_score,
      outreach_subject: patch.outreach_subject,
      outreach_body: patch.outreach_body
    } satisfies LeadSignalInput);
  });

  return {
    leads,
    diagnostics: extracted.diagnostics.sort((a, b) => b.score - a.score).slice(0, 24),
    telemetry,
    trace: buildTrace(jobs.length, extracted.drafts.length, extracted.diagnostics.length, leads.length, telemetry)
  };
}

export function previewLeadRanking(offers: OfferProfile[], jobs: JobPosting[], options: AgentOptions = {}) {
  const buyerPersona = options.buyer_persona || "revops";
  const extracted = extractEvidenceDrafts(offers, jobs, { ...options, buyer_persona: buyerPersona });
  return extracted.drafts
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map((draft, index) => ({
      rank: index + 1,
      company: draft.company,
      company_domain: draft.company_domain,
      score: draft.score,
      urgency_score: draft.urgency_score,
      relevance_score: draft.relevance_score,
      confidence_score: draft.confidence_score,
      top_evidence: draft.evidence[0]?.title || ""
    }));
}

function extractEvidenceDrafts(offers: OfferProfile[], jobs: JobPosting[], options: AgentRuntimeOptions) {
  const diagnostics: LeadDiagnostic[] = [];
  const drafts = offers.flatMap((offer) => buildDraftsForOffer(offer, jobs, options, diagnostics));
  return { drafts, diagnostics };
}

function buildDraftsForOffer(offer: OfferProfile, jobs: JobPosting[], options: AgentRuntimeOptions, diagnostics: LeadDiagnostic[]) {
  const grouped = new Map<string, { company: string; matches: Match[] }>();
  for (const job of jobs) {
    const result = scoreJob(job, offer, options.buyer_persona);
    if (result.score < 25) {
      diagnostics.push(diagnosticPayload(job, offer, result));
      continue;
    }
    const existing = grouped.get(result.company_domain) || { company: canonicalCompany(job.company), matches: [] };
    existing.matches.push({ job, ...result });
    grouped.set(result.company_domain, existing);
  }
  return Array.from(grouped.values()).map(({ company, matches }) => buildDraft(company, offer, matches, options.scoring_weights));
}

function buildDraft(company: string, offer: OfferProfile, matches: Match[], scoringWeights?: ScoringWeights): LeadDraft {
  const ranked = [...matches].sort((a, b) => b.score - a.score);
  const evidence = ranked.slice(0, 6).map(evidencePayload);
  const relevance = calculateRelevance(ranked);
  const urgency = calculateUrgency(ranked);
  const confidence = calculateConfidence(ranked);
  const weights = normalizeWeights(scoringWeights || offer.scoring_weights || defaultWeights);
  const score = Math.round(
    ((weights.relevance * relevance) + (weights.urgency * urgency) + (weights.confidence * confidence)) /
    (weights.relevance + weights.urgency + weights.confidence)
  );
  const domain = ranked[0]?.company_domain || slugDomain(company);
  return {
    lead_key: `${offer.id}:${domain}`,
    company,
    company_domain: domain,
    offer,
    evidence,
    score: clamp(score),
    urgency_score: urgency,
    relevance_score: relevance,
    confidence_score: confidence
  };
}

function scoreJob(job: JobPosting, offer: OfferProfile, buyerPersona: BuyerPersona) {
  const text = normalize(`${job.title} ${job.company} ${job.location} ${job.description}`);
  const title = normalize(job.title);
  const matched = new Map<string, EvidenceJob["keyword_contexts"][number]>();
  let points = 0;
  for (const keyword of offer.keywords) {
    const term = normalize(keyword);
    if (!term) {
      continue;
    }
    if (title.includes(term)) {
      points += 22;
      matched.set(keyword, keywordContext(job, keyword, "Keyword appears in the role title."));
    } else if (text.includes(term)) {
      points += 12;
      matched.set(keyword, keywordContext(job, keyword, "Keyword appears in the job description."));
    }
  }
  for (const keyword of personaKeywords[buyerPersona]) {
    const term = normalize(keyword);
    if (title.includes(term)) {
      points += 16;
      matched.set(keyword, keywordContext(job, keyword, "Persona-specific role signal appears in the title."));
    } else if (text.includes(term)) {
      points += 8;
      matched.set(keyword, keywordContext(job, keyword, "Persona-specific buying signal appears in the description."));
    }
  }
  const negative_hits = offer.negative_keywords.filter((term) => normalize(term) && text.includes(normalize(term)));
  if (negative_hits.length > 0) {
    points -= 35;
  }
  const driver = roleDriver(title, buyerPersona);
  const score = clamp(points + driver.bonus);
  return {
    score,
    matched_keywords: [...new Set(matched.keys())].sort(),
    keyword_contexts: [...matched.values()].slice(0, 6),
    negative_hits,
    role_driver: driver.label,
    historical_delta: historicalDelta(job),
    company_domain: companyDomain(job),
    company_enrichment: companyEnrichment(job)
  };
}

function diagnosticPayload(job: JobPosting, offer: OfferProfile, result: ReturnType<typeof scoreJob>): LeadDiagnostic {
  const text = normalize(`${job.title} ${job.description}`);
  const missing = offer.keywords.filter((keyword) => !text.includes(normalize(keyword))).slice(0, 5);
  const reason = result.negative_hits.length > 0
    ? `Excluded because it matched negative terms: ${result.negative_hits.join(", ")}.`
    : result.matched_keywords.length === 0
      ? "No offer keywords or persona signals were found in the role."
      : "Some signal exists, but the score stayed below the demo lead threshold.";
  return {
    company: canonicalCompany(job.company),
    company_domain: result.company_domain,
    title: job.title,
    source: job.source,
    score: result.score,
    reason,
    negative_hits: result.negative_hits,
    missing_keywords: missing,
    url: job.url
  };
}

function evidencePayload(match: Match): EvidenceJob {
  return {
    title: match.job.title,
    company: canonicalCompany(match.job.company),
    source: match.job.source,
    company_domain: match.company_domain,
    location: match.job.location,
    url: match.job.url,
    posted_at: match.job.posted_at,
    matched_keywords: match.matched_keywords,
    keyword_contexts: match.keyword_contexts,
    role_driver: match.role_driver,
    historical_delta: match.historical_delta,
    company_enrichment: match.company_enrichment,
    job_match_score: match.score
  };
}

function keywordContext(job: JobPosting, keyword: string, reason: string) {
  return {
    keyword,
    snippet: snippetForKeyword(job, keyword),
    reason
  };
}

function snippetForKeyword(job: JobPosting, keyword: string) {
  const term = normalize(keyword);
  const sentences = [job.title, ...job.description.split(/(?<=[.!?])\s+/)];
  const match = sentences.find((sentence) => normalize(sentence).includes(term)) || job.description;
  return match.replace(/\s+/g, " ").trim().slice(0, 220);
}

function calculateRelevance(matches: Match[]) {
  const best = Math.max(...matches.map((item) => item.score));
  const average = matches.reduce((sum, item) => sum + item.score, 0) / matches.length;
  return Math.round(Math.min(100, (best * 0.68) + (average * 0.32)));
}

function calculateUrgency(matches: Match[]) {
  const now = Date.now();
  const recent = matches.filter((item) => {
    const posted = new Date(item.job.posted_at).getTime();
    return Number.isFinite(posted) && ((now - posted) / 86400000) <= 30;
  }).length;
  const uniqueRoles = new Set(matches.map((item) => item.job.title)).size;
  const acceleration = matches.reduce((sum, item) => sum + item.historical_delta, 0);
  return Math.round(Math.min(100, 30 + (matches.length * 9) + (uniqueRoles * 4) + (recent * 5) + Math.min(18, acceleration / 3)));
}

function calculateConfidence(matches: Match[]) {
  const keywordHits = matches.reduce((sum, item) => sum + item.matched_keywords.length, 0);
  const contextHits = matches.reduce((sum, item) => sum + item.keyword_contexts.length, 0);
  const negativeHits = matches.reduce((sum, item) => sum + item.negative_hits.length, 0);
  return Math.round(Math.max(0, Math.min(100, 40 + (keywordHits * 6) + (contextHits * 3) + (matches.length * 4) - (negativeHits * 20))));
}

function roleDriver(title: string, buyerPersona: BuyerPersona) {
  const dataTerms = ["tableau", "power bi", "bi analyst", "analytics engineer", "data engineer", "sql", "dashboard", "reporting", "revops"];
  const cloudTerms = ["cloud", "devops", "sre", "platform", "kubernetes", "infrastructure"];
  const cyberTerms = ["soc", "security", "compliance", "iam", "risk", "incident"];
  const revopsTerms = ["revops", "revenue operations", "crm", "forecasting", "sales reporting", "pipeline"];
  if (dataTerms.some((term) => title.includes(term))) {
    return { label: "Data and analytics hiring", bonus: buyerPersona === "data" || buyerPersona === "revops" ? 28 : 18 };
  }
  if (cloudTerms.some((term) => title.includes(term))) {
    return { label: "Cloud and platform hiring", bonus: buyerPersona === "it" ? 28 : 16 };
  }
  if (cyberTerms.some((term) => title.includes(term))) {
    return { label: "Security and risk hiring", bonus: buyerPersona === "security" ? 28 : 16 };
  }
  if (revopsTerms.some((term) => title.includes(term))) {
    return { label: "Revenue operations hiring", bonus: buyerPersona === "revops" ? 28 : 18 };
  }
  return { label: "Adjacent operational hiring", bonus: 0 };
}

function companyDomain(job: JobPosting) {
  const raw = job.raw_json || {};
  const rawDomain = stringValue(raw.company_domain);
  if (rawDomain) {
    return rawDomain;
  }
  const enrichment = companyEnrichment(job);
  if (enrichment.website) {
    try {
      return new URL(enrichment.website).hostname.replace(/^www\./, "");
    } catch {
      return enrichment.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }
  }
  try {
    return new URL(job.url).hostname.replace(/^www\./, "");
  } catch {
    return slugDomain(job.company);
  }
}

function companyEnrichment(job: JobPosting): CompanyEnrichment {
  const raw = job.raw_json || {};
  const value = raw.company_enrichment;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    website: stringValue(record.website),
    industry: stringValue(record.industry),
    employee_count: stringValue(record.employee_count),
    funding_stage: stringValue(record.funding_stage),
    tech_stack: Array.isArray(record.tech_stack) ? record.tech_stack.map((item) => String(item)).filter(Boolean) : []
  };
}

function historicalDelta(job: JobPosting) {
  const raw = job.raw_json || {};
  const value = raw.historical_posting_delta;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }
  return Number((value as Record<string, unknown>).net_new_roles || 0);
}

function buildTrace(jobCount: number, draftCount: number, diagnosticCount: number, leadCount: number, telemetry: AgentTelemetry): AgentTraceStep[] {
  return [
    { label: "Evidence extraction", detail: "Scored job lines, keyword contexts, role drivers, and hiring deltas before generation.", count: jobCount },
    { label: "Domain dedupe", detail: "Grouped inconsistent company names by inferred company domain.", count: draftCount },
    { label: "Noise diagnostics", detail: "Kept below-threshold postings so the demo can explain why they were not leads.", count: diagnosticCount },
    { label: "Outreach generation", detail: `${telemetry.request_count} OpenAI request(s) using ${telemetry.model}.`, count: leadCount }
  ];
}

function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  return {
    relevance: Math.max(0, Number(weights.relevance) || defaultWeights.relevance),
    urgency: Math.max(0, Number(weights.urgency) || defaultWeights.urgency),
    confidence: Math.max(0, Number(weights.confidence) || defaultWeights.confidence)
  };
}

function canonicalCompany(value: string) {
  return value.replace(/\s+(Careers|Talent|Inc\.|Group)$/i, "").trim();
}

function slugDomain(value: string) {
  const slug = canonicalCompany(value).toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/^$/, "company");
  return `${slug}.example`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
