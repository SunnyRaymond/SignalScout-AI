export type JsonRecord = Record<string, unknown>;

export type OfferProfile = {
  id: number;
  name: string;
  seller_description: string;
  target_customers: string;
  keywords: string[];
  negative_keywords: string[];
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
  location: string;
  url: string;
  posted_at: string;
  matched_keywords: string[];
  job_match_score: number;
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
};

export type FetchJobsRequest = {
  source?: "muse" | "adzuna";
  query?: string;
  location?: string;
  limit?: number;
};

export type SlackPreview = {
  has_webhook: boolean;
  demo_mode: boolean;
  text: string;
  blocks: JsonRecord[];
  leads: LeadSignal[];
};
