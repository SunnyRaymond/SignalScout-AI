import { readFile } from "node:fs/promises";
import path from "node:path";
import type { JobPostingInput } from "@/lib/types";

type DemoProvider = {
  source: JobPostingInput["source"];
  externalPrefix: string;
  titlePrefix: string;
  companySuffix: string;
  descriptionAddendum: string;
  postedOffsetDays: number;
};

const demoProviders: DemoProvider[] = [
  {
    source: "sample",
    externalPrefix: "sample",
    titlePrefix: "",
    companySuffix: "",
    descriptionAddendum: "This original seed row is kept for baseline demo comparisons.",
    postedOffsetDays: 0
  },
  {
    source: "greenhouse",
    externalPrefix: "gh",
    titlePrefix: "Lead",
    companySuffix: " Careers",
    descriptionAddendum: "Greenhouse posting data shows an active hiring push and detailed team ownership signals.",
    postedOffsetDays: -2
  },
  {
    source: "lever",
    externalPrefix: "lv",
    titlePrefix: "Senior",
    companySuffix: " Talent",
    descriptionAddendum: "Lever export includes department tags and hiring-manager notes for buying committee context.",
    postedOffsetDays: -5
  },
  {
    source: "workday",
    externalPrefix: "wd",
    titlePrefix: "Principal",
    companySuffix: " Inc.",
    descriptionAddendum: "Workday career-page scrape exposes requisition velocity and repeated budget allocation.",
    postedOffsetDays: -8
  },
  {
    source: "linkedin_export",
    externalPrefix: "li",
    titlePrefix: "Staff",
    companySuffix: " Group",
    descriptionAddendum: "LinkedIn export adds recruiter-facing wording and market demand language for the same account.",
    postedOffsetDays: -11
  }
];

const companyProfiles: Record<string, {
  domain: string;
  website: string;
  industry: string;
  employee_count: string;
  funding_stage: string;
  tech_stack: string[];
  hiring_delta_30d: number;
}> = {
  "Northstar Retail": {
    domain: "northstarretail.example",
    website: "https://northstarretail.example",
    industry: "Retail operations",
    employee_count: "5,000-10,000",
    funding_stage: "Private equity backed",
    tech_stack: ["Power BI", "Snowflake", "Salesforce", "Zendesk"],
    hiring_delta_30d: 18
  },
  "FinBridge Capital": {
    domain: "finbridgecapital.example",
    website: "https://finbridgecapital.example",
    industry: "Financial services",
    employee_count: "1,000-5,000",
    funding_stage: "Late-stage private",
    tech_stack: ["dbt", "Tableau", "Okta", "AWS"],
    hiring_delta_30d: 22
  },
  "Atlas Logistics": {
    domain: "atlaslogistics.example",
    website: "https://atlaslogistics.example",
    industry: "Logistics and supply chain",
    employee_count: "10,000+",
    funding_stage: "Public",
    tech_stack: ["Kubernetes", "Power BI", "Datadog", "Dynamics"],
    hiring_delta_30d: 15
  },
  "Lumina Health": {
    domain: "luminahealth.example",
    website: "https://luminahealth.example",
    industry: "Healthcare",
    employee_count: "10,000+",
    funding_stage: "Nonprofit system",
    tech_stack: ["Tableau", "Epic", "Azure", "Splunk"],
    hiring_delta_30d: 19
  },
  "Helio SaaS": {
    domain: "heliosaas.example",
    website: "https://heliosaas.example",
    industry: "B2B SaaS",
    employee_count: "500-1,000",
    funding_stage: "Series C",
    tech_stack: ["HubSpot", "Snowflake", "AWS", "OpenAI"],
    hiring_delta_30d: 27
  },
  "ByteHarbor": {
    domain: "byteharbor.example",
    website: "https://byteharbor.example",
    industry: "Developer infrastructure",
    employee_count: "1,000-5,000",
    funding_stage: "Series D",
    tech_stack: ["Kubernetes", "Terraform", "Datadog", "BigQuery"],
    hiring_delta_30d: 24
  },
  "GreenGrid Energy": {
    domain: "greengridenergy.example",
    website: "https://greengridenergy.example",
    industry: "Renewable energy",
    employee_count: "1,000-5,000",
    funding_stage: "Public",
    tech_stack: ["Power BI", "Azure", "SAP", "ServiceNow"],
    hiring_delta_30d: 14
  },
  "Horizon Foods": {
    domain: "horizonfoods.example",
    website: "https://horizonfoods.example",
    industry: "Food manufacturing",
    employee_count: "5,000-10,000",
    funding_stage: "Private",
    tech_stack: ["Tableau", "SQL Server", "NetSuite", "Zendesk"],
    hiring_delta_30d: 11
  },
  "Meridian Bank": {
    domain: "meridianbank.example",
    website: "https://meridianbank.example",
    industry: "Banking",
    employee_count: "5,000-10,000",
    funding_stage: "Public",
    tech_stack: ["Tableau", "Okta", "AWS", "Splunk"],
    hiring_delta_30d: 20
  },
  "CloudWorks Studio": {
    domain: "cloudworksstudio.example",
    website: "https://cloudworksstudio.example",
    industry: "Cloud consulting",
    employee_count: "250-500",
    funding_stage: "Bootstrapped",
    tech_stack: ["AWS", "Terraform", "Kubernetes", "Grafana"],
    hiring_delta_30d: 17
  },
  "Sentinel Insurance": {
    domain: "sentinelinsurance.example",
    website: "https://sentinelinsurance.example",
    industry: "Insurance",
    employee_count: "1,000-5,000",
    funding_stage: "Public",
    tech_stack: ["Power BI", "Splunk", "Okta", "Azure"],
    hiring_delta_30d: 16
  },
  "Orbit Manufacturing": {
    domain: "orbitmanufacturing.example",
    website: "https://orbitmanufacturing.example",
    industry: "Industrial manufacturing",
    employee_count: "1,000-5,000",
    funding_stage: "Private",
    tech_stack: ["SQL Server", "Power BI", "SAP", "ServiceNow"],
    hiring_delta_30d: 12
  }
};

export async function readSampleJobs(): Promise<JobPostingInput[]> {
  const file = path.join(process.cwd(), "public", "sample_jobs.csv");
  const text = await readFile(file, "utf8");
  const [header, ...rows] = parseCsv(text);
  const baseJobs = rows
    .filter((row) => row.length === header.length)
    .map((row) => {
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
        raw_json: safeJson(record.raw_json)
      };
    });
  return expandDemoJobs(baseJobs);
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
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
    if (row.some(Boolean)) {
      rows.push(row);
    }
  }
  return rows;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function expandDemoJobs(baseJobs: JobPostingInput[]) {
  return baseJobs.flatMap((job) => demoProviders.map((provider, providerIndex) => enrichDemoJob(job, provider, providerIndex)));
}

function enrichDemoJob(job: JobPostingInput, provider: DemoProvider, providerIndex: number): JobPostingInput {
  const baseCompany = canonicalCompany(job.company);
  const profile = companyProfiles[baseCompany] || fallbackProfile(baseCompany);
  const variantCompany = providerIndex === 0 ? job.company : `${baseCompany}${provider.companySuffix}`;
  const variantTitle = provider.titlePrefix ? `${provider.titlePrefix} ${job.title}` : job.title;
  const raw_json = {
    ...job.raw_json,
    demo_generated: providerIndex > 0,
    original_source: job.source,
    original_external_id: job.external_id,
    provider_kind: provider.source,
    company_domain: profile.domain,
    company_enrichment: {
      website: profile.website,
      industry: profile.industry,
      employee_count: profile.employee_count,
      funding_stage: profile.funding_stage,
      tech_stack: profile.tech_stack
    },
    historical_posting_delta: {
      window_days: 30,
      net_new_roles: Math.max(0, profile.hiring_delta_30d - providerIndex),
      acceleration_label: profile.hiring_delta_30d >= 20 ? "accelerating" : profile.hiring_delta_30d >= 14 ? "rising" : "steady"
    }
  };
  return {
    ...job,
    source: provider.source,
    external_id: providerIndex === 0 ? job.external_id : `${provider.externalPrefix}-${job.external_id}`,
    title: variantTitle,
    company: variantCompany,
    description: `${job.description} ${provider.descriptionAddendum}`,
    posted_at: shiftIsoDate(job.posted_at, provider.postedOffsetDays),
    raw_json
  };
}

function canonicalCompany(value: string) {
  return value
    .replace(/\s+(Careers|Talent|Inc\.|Group)$/i, "")
    .trim();
}

function fallbackProfile(company: string) {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/^$/, "company");
  return {
    domain: `${slug}.example`,
    website: `https://${slug}.example`,
    industry: "B2B services",
    employee_count: "500-1,000",
    funding_stage: "Private",
    tech_stack: ["Salesforce", "SQL", "Power BI"],
    hiring_delta_30d: 10
  };
}

function shiftIsoDate(value: string, offsetDays: number) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
  return parsed.toISOString();
}
