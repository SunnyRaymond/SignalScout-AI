type OfferProfile = {
  id: number;
  name: string;
  seller_description: string;
  target_customers: string;
  keywords: string[];
  negative_keywords: string[];
  created_at: string;
  updated_at: string;
};

type JobPosting = {
  id: number;
  source: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at: string;
  raw_json: Record<string, unknown>;
  created_at: string;
};

type LeadSignal = {
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
  created_at: string;
};

type EvidenceJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  posted_at: string;
  matched_keywords: string[];
  job_match_score: number;
};

type DemoState = {
  offers: OfferProfile[];
  jobs: JobPosting[];
  leads: LeadSignal[];
};

const storageKey = "signalscout-demo-state-v1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const defaultOffers: OfferProfile[] = [
  {
    id: 1,
    name: "Data Dashboard Agency",
    seller_description: "Sells Tableau dashboards, SQL pipelines, and executive reporting.",
    target_customers: "BI, Data, Analytics, RevOps, and Tableau teams.",
    keywords: ["Tableau", "Power BI", "BI Analyst", "Data Engineer", "Analytics Engineer", "SQL", "Dashboard", "Reporting", "RevOps"],
    negative_keywords: ["intern", "student", "unpaid"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Cloud Infrastructure Consultancy",
    seller_description: "Helps companies modernize cloud platforms, DevOps workflows, SRE practices, and Kubernetes operations.",
    target_customers: "Cloud, DevOps, SRE, platform engineering, and infrastructure leaders.",
    keywords: ["Cloud", "DevOps", "SRE", "Platform", "Infrastructure", "Kubernetes", "AWS", "Azure"],
    negative_keywords: ["intern", "student", "unpaid"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Cyber Risk Studio",
    seller_description: "Supports security operations, compliance readiness, IAM projects, and SOC modernization.",
    target_customers: "Security, SOC, compliance, risk, and identity teams.",
    keywords: ["SOC", "Security", "Compliance", "IAM", "Risk", "Incident", "Identity"],
    negative_keywords: ["intern", "student", "unpaid"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function demoApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const state = loadState();
  const method = (init.method || "GET").toUpperCase();

  if (path === "/api/status") {
    return respond<T>({
      status: "ok",
      database: "browser demo",
      counts: { offers: state.offers.length, jobs: state.jobs.length, leads: state.leads.length },
      integrations: { openai: false, adzuna: false, slack: false }
    });
  }

  if (path === "/api/offers" && method === "GET") {
    return respond<T>(state.offers);
  }

  if (path === "/api/offers" && method === "POST") {
    const payload = readBody(init);
    const now = new Date().toISOString();
    const offer = { ...payload, id: nextId(state.offers), created_at: now, updated_at: now } as OfferProfile;
    state.offers.push(offer);
    saveState(state);
    return respond<T>(offer);
  }

  if (path.startsWith("/api/offers/") && method === "PUT") {
    const id = Number(path.split("/").pop());
    const payload = readBody(init);
    const index = state.offers.findIndex((offer) => offer.id === id);
    if (index >= 0) {
      state.offers[index] = { ...state.offers[index], ...payload, id, updated_at: new Date().toISOString() };
      saveState(state);
      return respond<T>(state.offers[index]);
    }
  }

  if (path === "/api/jobs" && method === "GET") {
    return respond<T>(sortJobs(state.jobs));
  }

  if (path === "/api/jobs/load-sample" && method === "POST") {
    const sampleJobs = await loadSampleJobs();
    let added = 0;
    let updated = 0;
    for (const job of sampleJobs) {
      const index = state.jobs.findIndex((item) => item.source === job.source && item.external_id === job.external_id);
      if (index >= 0) {
        state.jobs[index] = { ...state.jobs[index], ...job, id: state.jobs[index].id };
        updated += 1;
      } else {
        state.jobs.push({ ...job, id: nextId(state.jobs), created_at: new Date().toISOString() });
        added += 1;
      }
    }
    saveState(state);
    return respond<T>({ status: "loaded", added, updated, total: state.jobs.length });
  }

  if (path === "/api/jobs/fetch" && method === "POST") {
    return respond<T>({ status: "demo", message: "API fetching needs provider credentials. Use sample jobs in the hosted demo.", added: 0, jobs: [] });
  }

  if (path === "/api/leads" && method === "GET") {
    return respond<T>(sortLeads(state.leads));
  }

  if (path === "/api/agent/run" && method === "POST") {
    const payload = readBody(init) as { offer_id?: number; clear_existing?: boolean };
    const offers = payload.offer_id ? state.offers.filter((offer) => offer.id === payload.offer_id) : state.offers;
    if (payload.clear_existing !== false) {
      const ids = new Set(offers.map((offer) => offer.id));
      state.leads = state.leads.filter((lead) => !ids.has(lead.matched_offer_id));
    }
    const created = offers.flatMap((offer) => runAgentForOffer(offer, state.jobs));
    const createdWithIds = created.map((lead, index) => ({ ...lead, id: nextId(state.leads) + index }));
    state.leads.push(...createdWithIds);
    saveState(state);
    return respond<T>({ status: "ok", created: createdWithIds.length, leads: sortLeads(createdWithIds) });
  }

  if (path === "/api/slack/preview" && method === "GET") {
    return respond<T>(buildSlackPreview(state.leads));
  }

  if (path === "/api/slack/send" && method === "POST") {
    return respond<T>({ sent: false, message: "Slack webhook is not configured in the hosted demo. Preview is available.", preview: buildSlackPreview(state.leads).text });
  }

  throw new Error("Demo route not implemented.");
}

function loadState(): DemoState {
  if (typeof window === "undefined") {
    return { offers: defaultOffers, jobs: [], leads: [] };
  }
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    const initial = { offers: defaultOffers, jobs: [], leads: [] };
    saveState(initial);
    return initial;
  }
  return JSON.parse(saved) as DemoState;
}

function saveState(state: DemoState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }
}

function readBody(init: RequestInit): Record<string, unknown> {
  if (!init.body || typeof init.body !== "string") {
    return {};
  }
  return JSON.parse(init.body) as Record<string, unknown>;
}

function respond<T>(value: unknown): T {
  return value as T;
}

async function loadSampleJobs(): Promise<Omit<JobPosting, "id" | "created_at">[]> {
  const response = await fetch(`${basePath}/sample_jobs.csv`);
  const text = await response.text();
  const [header, ...rows] = parseCsv(text);
  return rows.filter((row) => row.length === header.length).map((row) => {
    const record = Object.fromEntries(header.map((key, index) => [key, row[index]]));
    return {
      source: record.source,
      external_id: record.external_id,
      title: record.title,
      company: record.company,
      location: record.location,
      description: record.description,
      url: record.url,
      posted_at: record.posted_at,
      raw_json: JSON.parse(record.raw_json || "{}")
    };
  });
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function runAgentForOffer(offer: OfferProfile, jobs: JobPosting[]): Omit<LeadSignal, "id">[] {
  const groups = new Map<string, { job: JobPosting; score: number; matched_keywords: string[]; negative_hits: string[] }[]>();
  for (const job of jobs) {
    const result = scoreJob(job, offer);
    if (result.score >= 25) {
      groups.set(job.company, [...(groups.get(job.company) || []), { job, ...result }]);
    }
  }
  return [...groups.entries()].map(([company, matches]) => buildLead(company, offer, matches)).sort((a, b) => b.score - a.score);
}

function scoreJob(job: JobPosting, offer: OfferProfile) {
  const text = normalize(`${job.title} ${job.company} ${job.location} ${job.description}`);
  const title = normalize(job.title);
  const matched: string[] = [];
  let points = 0;
  for (const keyword of offer.keywords) {
    const term = normalize(keyword);
    if (title.includes(term)) {
      points += 22;
      matched.push(keyword);
    } else if (text.includes(term)) {
      points += 12;
      matched.push(keyword);
    }
  }
  const negative_hits = offer.negative_keywords.filter((term) => text.includes(normalize(term)));
  if (negative_hits.length > 0) {
    points -= 35;
  }
  return { score: clamp(points + domainRoleBonus(title, offer.keywords), 0, 100), matched_keywords: [...new Set(matched)].sort(), negative_hits };
}

function buildLead(company: string, offer: OfferProfile, matches: { job: JobPosting; score: number; matched_keywords: string[]; negative_hits: string[] }[]): Omit<LeadSignal, "id"> {
  const ranked = [...matches].sort((a, b) => b.score - a.score);
  const evidence = ranked.slice(0, 5).map((item) => ({
    title: item.job.title,
    company: item.job.company,
    location: item.job.location,
    url: item.job.url,
    posted_at: item.job.posted_at,
    matched_keywords: item.matched_keywords,
    job_match_score: item.score
  }));
  const relevance = calculateRelevance(ranked);
  const urgency = calculateUrgency(ranked);
  const confidence = calculateConfidence(ranked);
  const score = Math.round(0.45 * relevance + 0.35 * urgency + 0.2 * confidence);
  const roles = ranked.slice(0, 3).map((item) => item.job.title).join(", ");
  const locations = [...new Set(ranked.slice(0, 3).map((item) => item.job.location))].join(", ");
  const signal_summary = `${company} is hiring for ${roles} across ${locations}, suggesting an active buying window tied to ${offer.name.toLowerCase()}.`;
  const inferred_pain = inferPain(offer);
  return {
    company,
    matched_offer_id: offer.id,
    signal_summary,
    inferred_pain,
    evidence_jobs_json: evidence,
    score: clamp(score, 0, 100),
    urgency_score: urgency,
    relevance_score: relevance,
    confidence_score: confidence,
    outreach_subject: `${company} hiring signals around ${shortOfferAngle(offer)}`,
    outreach_body: `Hi {first_name},\n\nI noticed ${company} is hiring for ${roles}. ${signal_summary}\n\n${inferred_pain} ${offer.name} helps teams like this add execution capacity without waiting for every hire to land.\n\nWould it be worth comparing notes on what the team is trying to ship this quarter?`,
    created_at: new Date().toISOString()
  };
}

function calculateRelevance(matches: { score: number }[]) {
  const best = Math.max(...matches.map((item) => item.score));
  const average = matches.reduce((total, item) => total + item.score, 0) / matches.length;
  return Math.round(Math.min(100, best * 0.68 + average * 0.32));
}

function calculateUrgency(matches: { job: JobPosting }[]) {
  const now = Date.now();
  const recent = matches.filter((item) => (now - new Date(item.job.posted_at).getTime()) / 86400000 <= 21).length;
  const uniqueRoles = new Set(matches.map((item) => item.job.title)).size;
  return Math.round(Math.min(100, 34 + matches.length * 13 + uniqueRoles * 5 + recent * 6));
}

function calculateConfidence(matches: { matched_keywords: string[]; negative_hits: string[] }[]) {
  const keywordHits = matches.reduce((total, item) => total + item.matched_keywords.length, 0);
  const negativeHits = matches.reduce((total, item) => total + item.negative_hits.length, 0);
  return Math.round(clamp(42 + keywordHits * 8 + matches.length * 5 - negativeHits * 20, 0, 100));
}

function buildSlackPreview(leads: LeadSignal[]) {
  const top = sortLeads(leads).slice(0, 5);
  const text = top.length === 0
    ? "SignalScout AI digest: no lead signals yet. Load sample jobs and run the agent."
    : ["SignalScout AI buying-signal digest", "", ...top.flatMap((lead, index) => [
      `${index + 1}. ${lead.company} - ${lead.score}/100`,
      `   ${lead.signal_summary}`,
      `   Pain: ${lead.inferred_pain}`
    ])].join("\n");
  return {
    has_webhook: false,
    demo_mode: true,
    text,
    blocks: [],
    leads: top
  };
}

function inferPain(offer: OfferProfile) {
  const keywords = normalize(offer.keywords.join(" "));
  if (["tableau", "dashboard", "reporting", "analytics", "revops", "power bi"].some((term) => keywords.includes(term))) {
    return "They likely need faster executive reporting, dashboard delivery, and clean SQL pipelines while the data team scales.";
  }
  if (["cloud", "devops", "platform", "sre"].some((term) => keywords.includes(term))) {
    return "They likely need infrastructure delivery capacity, cloud reliability support, and senior implementation help around platform work.";
  }
  if (["security", "soc", "compliance", "iam"].some((term) => keywords.includes(term))) {
    return "They likely need help reducing security operations load, tightening access controls, and meeting compliance deadlines.";
  }
  return "They are expanding roles that map to this offer, which points to budget, urgency, and an internal team seeking outside leverage.";
}

function shortOfferAngle(offer: OfferProfile) {
  const keywords = normalize(offer.keywords.join(" "));
  if (keywords.includes("tableau") || keywords.includes("dashboard")) return "dashboards and reporting";
  if (keywords.includes("cloud") || keywords.includes("devops")) return "cloud delivery";
  if (keywords.includes("security") || keywords.includes("soc") || keywords.includes("iam")) return "security operations";
  return offer.name.toLowerCase();
}

function domainRoleBonus(title: string, keywords: string[]) {
  const keywordText = normalize(keywords.join(" "));
  const dataTerms = ["tableau", "power bi", "bi analyst", "analytics engineer", "data engineer", "sql", "dashboard", "reporting", "revops"];
  const cloudTerms = ["cloud", "devops", "sre", "platform", "kubernetes", "infrastructure"];
  const cyberTerms = ["soc", "security", "compliance", "iam", "risk", "incident"];
  if (dataTerms.some((term) => keywordText.includes(term)) && dataTerms.some((term) => title.includes(term))) return 26;
  if (cloudTerms.some((term) => keywordText.includes(term)) && cloudTerms.some((term) => title.includes(term))) return 26;
  if (cyberTerms.some((term) => keywordText.includes(term)) && cyberTerms.some((term) => title.includes(term))) return 26;
  return 0;
}

function sortJobs(jobs: JobPosting[]) {
  return [...jobs].sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime() || b.id - a.id);
}

function sortLeads(leads: LeadSignal[]) {
  return [...leads].sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nextId(items: { id: number }[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
