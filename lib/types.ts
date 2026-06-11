export type JsonRecord = Record<string, unknown>;

export type BuyerPersona = "revops" | "it" | "security" | "data";

export type ScoringWeights = {
  relevance: number;
  urgency: number;
  confidence: number;
};

export type CompanyEnrichment = {
  website?: string;
  industry?: string;
  employee_count?: string;
  funding_stage?: string;
  tech_stack?: string[];
};

export type OfferProfile = {
  id: number;
  name: string;
  seller_description: string;
  target_customers: string;
  keywords: string[];
  negative_keywords: string[];
  scoring_weights?: ScoringWeights;
  created_at?: string;
  updated_at?: string;
};

export type OfferProfileInput = Omit<OfferProfile, "id" | "created_at" | "updated_at">;

export type JobPosting = {
  id: number;
  source: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at: string;
  raw_json: JsonRecord;
  created_at?: string;
};

export type JobPostingInput = Omit<JobPosting, "id" | "created_at">;

export type EvidenceJob = {
  title: string;
  company: string;
  source: string;
  company_domain: string;
  location: string;
  url: string;
  posted_at: string;
  matched_keywords: string[];
  keyword_contexts: Array<{
    keyword: string;
    snippet: string;
    reason: string;
  }>;
  role_driver: string;
  historical_delta: number;
  company_enrichment: CompanyEnrichment;
  job_match_score: number;
};

export type LeadDiagnostic = {
  company: string;
  company_domain: string;
  title: string;
  source: string;
  score: number;
  reason: string;
  negative_hits: string[];
  missing_keywords: string[];
  url: string;
};

export type LeadSignal = {
  id: number;
  company: string;
  matched_offer_id: number;
  signal_summary: string;
  inferred_pain: string;
  evidence_jobs_json: EvidenceJob[];
  score: number;
  urgency_score: number;
  relevance_score: number;
  confidence_score: number;
  outreach_subject: string;
  outreach_body: string;
  created_at?: string;
};

export type LeadSignalInput = Omit<LeadSignal, "id" | "created_at">;

export type AgentRunRequest = {
  offer_id?: number;
  clear_existing?: boolean;
  buyer_persona?: BuyerPersona;
  scoring_weights?: ScoringWeights;
};

export type FetchJobsRequest = {
  source?: "muse" | "adzuna" | "greenhouse" | "lever" | "workday" | "linkedin_export";
  query?: string;
  location?: string;
  limit?: number;
};

export type AgentTelemetry = {
  model: string;
  prompt_version: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
};

export type AgentTraceStep = {
  label: string;
  detail: string;
  count: number;
};

export type SlackPreview = {
  has_webhook: boolean;
  demo_mode: boolean;
  text: string;
  blocks: JsonRecord[];
  leads: LeadSignal[];
};
