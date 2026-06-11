import { HttpError } from "@/lib/http";
import { readSampleJobs } from "@/lib/sample-jobs";
import type { FetchJobsRequest, JobPostingInput } from "@/lib/types";

export async function fetchProviderJobs(payload: FetchJobsRequest): Promise<{ message: string; jobs: JobPostingInput[] }> {
  const source = payload.source || "muse";
  const query = payload.query || "analytics";
  const location = payload.location || "United States";
  const limit = Math.min(Math.max(Number(payload.limit || 20), 1), 50);
  if (source === "adzuna") {
    return fetchAdzunaJobs(query, location, limit);
  }
  if (source === "greenhouse" || source === "lever" || source === "workday" || source === "linkedin_export") {
    return fetchDemoProviderJobs(source, query, location, limit);
  }
  return fetchMuseJobs(query, location, limit);
}

async function fetchDemoProviderJobs(source: NonNullable<FetchJobsRequest["source"]>, query: string, location: string, limit: number) {
  const terms = normalizeSearch(`${query} ${location}`).split(" ").filter((term) => term.length > 2);
  const jobs = (await readSampleJobs())
    .filter((job) => job.source === source)
    .filter((job) => {
      const text = normalizeSearch(`${job.title} ${job.company} ${job.location} ${job.description}`);
      return terms.length === 0 || terms.some((term) => text.includes(term));
    })
    .slice(0, limit);
  const label = source === "linkedin_export" ? "LinkedIn export" : source[0].toUpperCase() + source.slice(1);
  return { message: `Loaded ${jobs.length} demo jobs from ${label}.`, jobs };
}

async function fetchMuseJobs(query: string, location: string, limit: number) {
  const url = new URL("https://www.themuse.com/api/public/jobs");
  url.searchParams.set("page", "1");
  url.searchParams.set("descending", "true");
  url.searchParams.set("q", query);
  if (location) {
    url.searchParams.set("location", location);
  }
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new HttpError(502, `The Muse API returned ${response.status}.`);
  }
  const data = await response.json() as { results?: Array<Record<string, unknown>> };
  const jobs = (data.results || []).slice(0, limit).map((item) => {
    const locations = Array.isArray(item.locations) ? item.locations as Array<{ name?: string }> : [];
    const refs = item.refs as { landing_page?: string } | undefined;
    return {
      source: "muse",
      external_id: String(item.id || refs?.landing_page || crypto.randomUUID()),
      title: String(item.name || "Untitled role"),
      company: String((item.company as { name?: string } | undefined)?.name || "Unknown company"),
      location: locations.map((entry) => entry.name).filter(Boolean).join(", ") || location,
      description: stripHtml(String(item.contents || "")),
      url: String(refs?.landing_page || ""),
      posted_at: normalizeDate(String(item.publication_date || new Date().toISOString())),
      raw_json: item
    };
  });
  return { message: `Fetched ${jobs.length} jobs from The Muse.`, jobs };
}

async function fetchAdzunaJobs(query: string, location: string, limit: number) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new HttpError(400, "Adzuna credentials are not configured.");
  }
  const url = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("what", query);
  url.searchParams.set("where", location);
  url.searchParams.set("results_per_page", String(limit));
  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) {
    throw new HttpError(502, `Adzuna API returned ${response.status}.`);
  }
  const data = await response.json() as { results?: Array<Record<string, unknown>> };
  const jobs = (data.results || []).slice(0, limit).map((item) => ({
    source: "adzuna",
    external_id: String(item.id || crypto.randomUUID()),
    title: String(item.title || "Untitled role"),
    company: String((item.company as { display_name?: string } | undefined)?.display_name || "Unknown company"),
    location: String((item.location as { display_name?: string } | undefined)?.display_name || location),
    description: stripHtml(String(item.description || "")),
    url: String(item.redirect_url || ""),
    posted_at: normalizeDate(String(item.created || new Date().toISOString())),
    raw_json: item
  }));
  return { message: `Fetched ${jobs.length} jobs from Adzuna.`, jobs };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
