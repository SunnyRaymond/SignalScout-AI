import { enrichLeadsWithOpenAI } from "@/lib/openai";
import { leadPayload } from "@/lib/supabase";
import type { EvidenceJob, JobPosting, LeadSignalInput, OfferProfile } from "@/lib/types";

type Match = {
  job: JobPosting;
  score: number;
  matched_keywords: string[];
  negative_hits: string[];
};

type LeadDraft = {
  lead_key: string;
  company: string;
  offer: OfferProfile;
  evidence: EvidenceJob[];
  score: number;
  urgency_score: number;
  relevance_score: number;
  confidence_score: number;
};

export async function buildLeadSignals(offers: OfferProfile[], jobs: JobPosting[]) {
  const drafts = offers.flatMap((offer) => buildDraftsForOffer(offer, jobs)).sort((a, b) => b.score - a.score).slice(0, 15);
  const patches = await enrichLeadsWithOpenAI(drafts.map((draft) => ({
    lead_key: draft.lead_key,
    company: draft.company,
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
      job_match_score: job.job_match_score
    }))
  })));
  return drafts.map((draft) => {
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
}

function buildDraftsForOffer(offer: OfferProfile, jobs: JobPosting[]) {
  const grouped = new Map<string, Match[]>();
  for (const job of jobs) {
    const result = scoreJob(job, offer);
    if (result.score < 25) {
      continue;
    }
    const existing = grouped.get(job.company) || [];
    existing.push({ job, ...result });
    grouped.set(job.company, existing);
  }
  return Array.from(grouped.entries()).map(([company, matches]) => buildDraft(company, offer, matches));
}

function buildDraft(company: string, offer: OfferProfile, matches: Match[]): LeadDraft {
  const ranked = [...matches].sort((a, b) => b.score - a.score);
  const evidence = ranked.slice(0, 5).map(evidencePayload);
  const relevance = calculateRelevance(ranked);
  const urgency = calculateUrgency(ranked);
  const confidence = calculateConfidence(ranked);
  const score = Math.round((0.45 * relevance) + (0.35 * urgency) + (0.20 * confidence));
  return {
    lead_key: `${offer.id}:${company}`,
    company,
    offer,
    evidence,
    score: Math.max(0, Math.min(100, score)),
    urgency_score: urgency,
    relevance_score: relevance,
    confidence_score: confidence
  };
}

function scoreJob(job: JobPosting, offer: OfferProfile) {
  const text = normalize(`${job.title} ${job.company} ${job.location} ${job.description}`);
  const title = normalize(job.title);
  const matched: string[] = [];
  let points = 0;
  for (const keyword of offer.keywords) {
    const term = normalize(keyword);
    if (!term) {
      continue;
    }
    if (title.includes(term)) {
      points += 22;
      matched.push(keyword);
    } else if (text.includes(term)) {
      points += 12;
      matched.push(keyword);
    }
  }
  const negative_hits = offer.negative_keywords.filter((term) => normalize(term) && text.includes(normalize(term)));
  if (negative_hits.length > 0) {
    points -= 35;
  }
  const score = Math.max(0, Math.min(100, points + domainRoleBonus(title, offer.keywords)));
  return { score, matched_keywords: [...new Set(matched)].sort(), negative_hits };
}

function domainRoleBonus(title: string, keywords: string[]) {
  const keywordText = normalize(keywords.join(" "));
  const dataTerms = ["tableau", "power bi", "bi analyst", "analytics engineer", "data engineer", "sql", "dashboard", "reporting", "revops"];
  const cloudTerms = ["cloud", "devops", "sre", "platform", "kubernetes", "infrastructure"];
  const cyberTerms = ["soc", "security", "compliance", "iam", "risk", "incident"];
  if (dataTerms.some((term) => keywordText.includes(term)) && dataTerms.some((term) => title.includes(term))) {
    return 26;
  }
  if (cloudTerms.some((term) => keywordText.includes(term)) && cloudTerms.some((term) => title.includes(term))) {
    return 26;
  }
  if (cyberTerms.some((term) => keywordText.includes(term)) && cyberTerms.some((term) => title.includes(term))) {
    return 26;
  }
  return 0;
}

function evidencePayload(match: Match): EvidenceJob {
  return {
    title: match.job.title,
    company: match.job.company,
    location: match.job.location,
    url: match.job.url,
    posted_at: match.job.posted_at,
    matched_keywords: match.matched_keywords,
    job_match_score: match.score
  };
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
    return Number.isFinite(posted) && ((now - posted) / 86400000) <= 21;
  }).length;
  const uniqueRoles = new Set(matches.map((item) => item.job.title)).size;
  return Math.round(Math.min(100, 34 + (matches.length * 13) + (uniqueRoles * 5) + (recent * 6)));
}

function calculateConfidence(matches: Match[]) {
  const keywordHits = matches.reduce((sum, item) => sum + item.matched_keywords.length, 0);
  const negativeHits = matches.reduce((sum, item) => sum + item.negative_hits.length, 0);
  return Math.round(Math.max(0, Math.min(100, 42 + (keywordHits * 8) + (matches.length * 5) - (negativeHits * 20))));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
