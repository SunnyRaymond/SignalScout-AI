"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BarChart3, BriefcaseBusiness, CheckCircle2, Clipboard, Cloud, Database, Loader2, MessageSquare, Radar, Search, Send, SlidersHorizontal, Sparkles, Target, X } from "lucide-react";

type OfferProfile = {
  id: number;
  name: string;
  seller_description: string;
  target_customers: string;
  keywords: string[];
  negative_keywords: string[];
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

type Status = {
  status: string;
  counts: { offers: number; jobs: number; leads: number };
  integrations: { openai: boolean; adzuna: boolean; slack: boolean };
};

type SlackPreview = {
  has_webhook: boolean;
  demo_mode: boolean;
  text: string;
  leads: LeadSignal[];
};

type OfferForm = {
  id?: number;
  name: string;
  seller_description: string;
  target_customers: string;
  keywords: string;
  negative_keywords: string;
};

const defaultOffer: OfferForm = {
  name: "Data Dashboard Agency",
  seller_description: "Sells Tableau dashboards, SQL pipelines, and executive reporting.",
  target_customers: "BI, Data, Analytics, RevOps, and Tableau teams.",
  keywords: "Tableau, Power BI, BI Analyst, Data Engineer, Analytics Engineer, SQL, Dashboard, Reporting, RevOps",
  negative_keywords: "intern, student, unpaid"
};

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "offer", label: "Offer Setup", icon: Target },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { id: "leads", label: "Leads", icon: Radar },
  { id: "slack", label: "Slack Preview", icon: MessageSquare }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [status, setStatus] = useState<Status | null>(null);
  const [offers, setOffers] = useState<OfferProfile[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [leads, setLeads] = useState<LeadSignal[]>([]);
  const [slackPreview, setSlackPreview] = useState<SlackPreview | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [offerForm, setOfferForm] = useState<OfferForm>(defaultOffer);
  const [leadQuery, setLeadQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [jobQuery, setJobQuery] = useState("");
  const [fetchQuery, setFetchQuery] = useState("analytics");
  const [selectedLead, setSelectedLead] = useState<LeadSignal | null>(null);
  const [loading, setLoading] = useState<string | null>("boot");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedOffer = useMemo(() => offers.find((offer) => offer.id === selectedOfferId) || offers[0], [offers, selectedOfferId]);

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => !selectedOfferId || lead.matched_offer_id === selectedOfferId)
      .filter((lead) => lead.score >= minScore)
      .filter((lead) => {
        const query = leadQuery.toLowerCase();
        return !query || `${lead.company} ${lead.signal_summary} ${lead.inferred_pain}`.toLowerCase().includes(query);
      });
  }, [leads, leadQuery, minScore, selectedOfferId]);

  const filteredJobs = useMemo(() => {
    const query = jobQuery.toLowerCase();
    return jobs.filter((job) => !query || `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase().includes(query));
  }, [jobs, jobQuery]);

  const stats = [
    { label: "Offers", value: status?.counts.offers ?? offers.length, icon: Target },
    { label: "Jobs", value: status?.counts.jobs ?? jobs.length, icon: BriefcaseBusiness },
    { label: "Leads", value: status?.counts.leads ?? leads.length, icon: Radar },
    { label: "Top score", value: leads[0]?.score ? `${leads[0].score}` : "0", icon: Sparkles }
  ];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading("boot");
    setError(null);
    try {
      const [statusData, offerData, jobData, leadData, slackData] = await Promise.all([
        apiFetch<Status>("/api/status"),
        apiFetch<OfferProfile[]>("/api/offers"),
        apiFetch<JobPosting[]>("/api/jobs"),
        apiFetch<LeadSignal[]>("/api/leads"),
        apiFetch<SlackPreview>("/api/slack/preview")
      ]);
      setStatus(statusData);
      setOffers(offerData);
      setJobs(jobData);
      setLeads(leadData);
      setSlackPreview(slackData);
      if (!selectedOfferId && offerData.length > 0) {
        const preferred = offerData.find((offer) => offer.name === "Data Dashboard Agency") || offerData[0];
        setSelectedOfferId(preferred.id);
        setOfferForm(fromOffer(preferred));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the SignalScout API.");
    } finally {
      setLoading(null);
    }
  }, [selectedOfferId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("lead") === "top" && filteredLeads.length > 0 && !selectedLead) {
      setSelectedLead(filteredLeads[0]);
    }
  }, [filteredLeads, selectedLead]);

  async function saveOffer() {
    setLoading("offer");
    setError(null);
    try {
      const payload = {
        name: offerForm.name,
        seller_description: offerForm.seller_description,
        target_customers: offerForm.target_customers,
        keywords: splitTerms(offerForm.keywords),
        negative_keywords: splitTerms(offerForm.negative_keywords)
      };
      const saved = offerForm.id
        ? await apiFetch<OfferProfile>(`/api/offers/${offerForm.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch<OfferProfile>("/api/offers", { method: "POST", body: JSON.stringify(payload) });
      setSelectedOfferId(saved.id);
      setOfferForm(fromOffer(saved));
      setNotice("Offer profile saved.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offer save failed.");
    } finally {
      setLoading(null);
    }
  }

  async function loadSampleJobs() {
    setLoading("sample");
    setError(null);
    try {
      const response = await apiFetch<{ added: number; updated: number; total: number }>("/api/jobs/load-sample", { method: "POST" });
      setNotice(`Sample jobs ready: ${response.added} added, ${response.updated} updated, ${response.total} total.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sample job load failed.");
    } finally {
      setLoading(null);
    }
  }

  async function fetchApiJobs() {
    setLoading("fetch");
    setError(null);
    try {
      const response = await apiFetch<{ status: string; message: string; added: number }>("/api/jobs/fetch", {
        method: "POST",
        body: JSON.stringify({ source: "muse", query: fetchQuery, location: "United States", limit: 20 })
      });
      setNotice(response.message || `Fetched ${response.added} jobs.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "API job fetch failed.");
    } finally {
      setLoading(null);
    }
  }

  async function runAgent() {
    setLoading("agent");
    setError(null);
    try {
      const response = await apiFetch<{ created: number; leads: LeadSignal[] }>("/api/agent/run", {
        method: "POST",
        body: JSON.stringify({ offer_id: selectedOffer?.id, clear_existing: true })
      });
      setNotice(`Agent created ${response.created} ranked lead signals.`);
      setActiveTab("leads");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setLoading(null);
    }
  }

  async function sendSlack() {
    setLoading("slack");
    setError(null);
    try {
      const response = await apiFetch<{ sent: boolean; message: string }>("/api/slack/send", { method: "POST" });
      setNotice(response.message);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slack send failed.");
    } finally {
      setLoading(null);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice("Copied.");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/82 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="SignalScout AI logo" width={48} height={48} className="rounded-lg" priority />
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">SignalScout AI</h1>
              <p className="text-sm text-slate-600">Job postings into B2B buying signals and Slack-ready outreach.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadSampleJobs} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300">
              {loading === "sample" ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
              Load sample
            </button>
            <button onClick={runAgent} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
              {loading === "agent" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Run Agent
            </button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white/76 p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {(error || notice) && (
          <div className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-teal-200 bg-teal-50 text-teal-900"}`}>
            <span>{error || notice}</span>
            <button onClick={() => (error ? setError(null) : setNotice(null))} className="rounded-md p-1 hover:bg-white/60" aria-label="Dismiss message">
              <X className="size-4" />
            </button>
          </div>
        )}

        {loading === "boot" ? (
          <LoadingPanel />
        ) : (
          <div className="flex flex-col gap-6">
            {activeTab === "dashboard" && (
              <section className="flex flex-col gap-6">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                    <div className="flex flex-col justify-between gap-5">
                      <div className="flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                          <Radar className="size-3.5" />
                          Buying-signal agent
                        </span>
                        <h2 className="max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">Spot accounts hiring for the problem you solve.</h2>
                        <p className="max-w-2xl text-base text-slate-600">
                          SignalScout reads hiring demand, groups it by company, scores urgency and relevance, then drafts the first outreach angle.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select value={selectedOfferId ?? ""} onChange={(event) => setSelectedOfferId(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                          {offers.map((offer) => (
                            <option key={offer.id} value={offer.id}>
                              {offer.name}
                            </option>
                          ))}
                        </select>
                        <button onClick={runAgent} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                          {loading === "agent" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                          Run Agent
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-slate-500">{stat.label}</span>
                              <Icon className="size-4 text-slate-500" />
                            </div>
                            <div className="mt-3 text-3xl font-semibold text-slate-950">{stat.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <RankedLeadTable leads={filteredLeads.slice(0, 8)} offers={offers} onOpen={setSelectedLead} />
              </section>
            )}

            {activeTab === "offer" && (
              <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Offer Setup</h2>
                      <p className="text-sm text-slate-600">Define what SignalScout should listen for in job postings.</p>
                    </div>
                    <button onClick={() => setOfferForm(defaultOffer)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Prefill
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Field label="Offer name">
                      <input value={offerForm.name} onChange={(event) => setOfferForm({ ...offerForm, name: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-600" />
                    </Field>
                    <Field label="Seller description">
                      <textarea value={offerForm.seller_description} onChange={(event) => setOfferForm({ ...offerForm, seller_description: event.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-600" />
                    </Field>
                    <Field label="Target customers">
                      <textarea value={offerForm.target_customers} onChange={(event) => setOfferForm({ ...offerForm, target_customers: event.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-600" />
                    </Field>
                    <Field label="Keywords">
                      <textarea value={offerForm.keywords} onChange={(event) => setOfferForm({ ...offerForm, keywords: event.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-600" />
                    </Field>
                    <Field label="Negative keywords">
                      <input value={offerForm.negative_keywords} onChange={(event) => setOfferForm({ ...offerForm, negative_keywords: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-teal-600" />
                    </Field>
                    <button onClick={saveOffer} className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      {loading === "offer" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Save Offer
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-950">Saved profiles</h3>
                  <div className="mt-4 flex flex-col gap-3">
                    {offers.map((offer) => (
                      <button key={offer.id} onClick={() => { setSelectedOfferId(offer.id); setOfferForm(fromOffer(offer)); }} className={`rounded-lg border p-4 text-left transition ${selectedOfferId === offer.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{offer.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{offer.seller_description}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{offer.keywords.length} terms</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {offer.keywords.slice(0, 8).map((keyword) => (
                            <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "jobs" && (
              <section className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Jobs</h2>
                    <p className="text-sm text-slate-600">Sample data works offline; API fetch uses optional job sources.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={loadSampleJobs} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      {loading === "sample" ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
                      Load sample
                    </button>
                    <div className="flex overflow-hidden rounded-lg border border-slate-200">
                      <input value={fetchQuery} onChange={(event) => setFetchQuery(event.target.value)} className="w-36 px-3 py-2 text-sm outline-none sm:w-48" />
                      <button onClick={fetchApiJobs} className="inline-flex items-center gap-2 border-l border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        {loading === "fetch" ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                        Fetch
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="size-4 text-slate-500" />
                  <input value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="Search jobs" className="w-full bg-transparent text-sm outline-none" />
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">Location</th>
                        <th className="px-4 py-3 font-semibold">Source</th>
                        <th className="px-4 py-3 font-semibold">Posted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredJobs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No jobs loaded yet.</td>
                        </tr>
                      ) : (
                        filteredJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-950">{job.title}</td>
                            <td className="px-4 py-3 text-slate-700">{job.company}</td>
                            <td className="px-4 py-3 text-slate-600">{job.location}</td>
                            <td className="px-4 py-3"><Badge>{job.source}</Badge></td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(job.posted_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "leads" && (
              <section className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Ranked Leads</h2>
                    <p className="text-sm text-slate-600">{selectedOffer?.name || "Selected offer"} - {filteredLeads.length} matches</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <Search className="size-4 text-slate-500" />
                      <input value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Search leads" className="w-40 bg-transparent text-sm outline-none" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <SlidersHorizontal className="size-4 text-slate-500" />
                      <input type="range" min={0} max={95} step={5} value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} />
                      <span className="text-sm font-medium text-slate-700">{minScore}+</span>
                    </div>
                  </div>
                </div>
                {filteredLeads.length === 0 ? (
                  <EmptyState title="No leads yet" text="Load sample jobs, choose an offer, and run the agent." action="Run Agent" onAction={runAgent} />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onOpen={() => setSelectedLead(lead)} onCopy={() => copyText(`${lead.outreach_subject}\n\n${lead.outreach_body}`)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "slack" && (
              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-950">Slack Preview</h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <div className={`rounded-lg border p-4 ${slackPreview?.has_webhook ? "border-teal-200 bg-teal-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className="text-sm font-semibold text-slate-950">{slackPreview?.has_webhook ? "Webhook configured" : "Demo mode"}</p>
                      <p className="mt-1 text-sm text-slate-700">{slackPreview?.has_webhook ? "Slack send will post to the configured webhook." : "No webhook detected; send returns a preview-safe response."}</p>
                    </div>
                    <button onClick={sendSlack} className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                      {loading === "slack" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send Digest
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#1f2229] shadow-soft">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-white">
                    <span className="size-3 rounded-full bg-rose-400" />
                    <span className="size-3 rounded-full bg-amber-400" />
                    <span className="size-3 rounded-full bg-teal-400" />
                    <span className="ml-2 text-sm font-semibold">#sales-signals</span>
                  </div>
                  <div className="flex gap-3 p-4 text-sm text-slate-100">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-500 font-bold text-slate-950">SS</div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">SignalScout AI</span>
                        <span className="text-xs text-slate-400">digest preview</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/7 p-4 font-sans leading-6 text-slate-100">{slackPreview?.text || "No digest yet."}</pre>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} onCopy={() => copyText(`${selectedLead.outreach_subject}\n\n${selectedLead.outreach_body}`)} />}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function RankedLeadTable({ leads, offers, onOpen }: { leads: LeadSignal[]; offers: OfferProfile[]; onOpen: (lead: LeadSignal) => void }) {
  const offerName = (id: number) => offers.find((offer) => offer.id === id)?.name || "Offer";
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Top buying signals</h3>
          <p className="text-sm text-slate-600">Ranked by relevance, urgency, and confidence.</p>
        </div>
        <Badge>Top {leads.length}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Offer</th>
              <th className="px-4 py-3 font-semibold">Signal</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No ranked leads yet.</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-950">{lead.company}</td>
                  <td className="px-4 py-3 text-slate-600">{offerName(lead.matched_offer_id)}</td>
                  <td className="max-w-md px-4 py-3 text-slate-700">{lead.signal_summary}</td>
                  <td className="px-4 py-3"><ScoreBadge score={lead.score} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(lead)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadCard({ lead, onOpen, onCopy }: { lead: LeadSignal; onOpen: () => void; onCopy: () => void }) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{lead.company}</h3>
          <p className="mt-1 text-sm text-slate-600">{lead.signal_summary}</p>
        </div>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{lead.inferred_pain}</div>
      <div className="flex flex-wrap gap-2">
        {lead.evidence_jobs_json.slice(0, 3).map((job) => (
          <span key={`${lead.id}-${job.title}`} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
            {job.title}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onOpen} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          <Radar className="size-4" />
          Detail
        </button>
        <button onClick={onCopy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Clipboard className="size-4" />
          Copy outreach
        </button>
      </div>
    </article>
  );
}

function LeadModal({ lead, onClose, onCopy }: { lead: LeadSignal; onClose: () => void; onCopy: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-soft">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{lead.company}</h2>
            <p className="mt-1 text-sm text-slate-600">{lead.signal_summary}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Close lead detail">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-4">
                <div className="score-ring flex size-24 items-center justify-center rounded-full" style={{ "--score": lead.score } as React.CSSProperties}>
                  <div className="flex size-20 items-center justify-center rounded-full bg-white text-2xl font-semibold text-slate-950">{lead.score}</div>
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <ScoreBar label="Relevance" value={lead.relevance_score} />
                  <ScoreBar label="Urgency" value={lead.urgency_score} />
                  <ScoreBar label="Confidence" value={lead.confidence_score} />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">Inferred pain</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{lead.inferred_pain}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">Evidence jobs</h3>
              <div className="mt-3 flex flex-col gap-3">
                {lead.evidence_jobs_json.map((job) => (
                  <a key={`${job.title}-${job.url}`} href={job.url} target="_blank" className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                    <p className="font-medium text-slate-950">{job.title}</p>
                    <p className="text-sm text-slate-600">{job.location} - {formatDate(job.posted_at)} - match {job.job_match_score}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {job.matched_keywords.map((keyword) => (
                        <span key={keyword} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{keyword}</span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950">Outreach</h3>
                <button onClick={onCopy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Clipboard className="size-4" />
                  Copy
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Subject</p>
                  <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-950">{lead.outreach_subject}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Body</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm leading-6 text-slate-700">{lead.outreach_body}</pre>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-teal-50 p-4">
              <p className="text-sm font-semibold text-teal-900">Slack-ready angle</p>
              <p className="mt-2 text-sm leading-6 text-teal-900">{lead.signal_summary}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-teal-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "bg-teal-50 text-teal-800 ring-teal-200" : score >= 60 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{score}/100</span>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{children}</span>;
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Radar className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{text}</p>
      <button onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
        <Sparkles className="size-4" />
        {action}
      </button>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 text-slate-600">
        <Loader2 className="size-5 animate-spin" />
        Loading SignalScout AI
      </div>
    </div>
  );
}

function splitTerms(value: string) {
  return value.split(/,|\n/).map((term) => term.trim()).filter(Boolean);
}

function fromOffer(offer: OfferProfile): OfferForm {
  return {
    id: offer.id,
    name: offer.name,
    seller_description: offer.seller_description,
    target_customers: offer.target_customers,
    keywords: offer.keywords.join(", "),
    negative_keywords: offer.negative_keywords.join(", ")
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      detail = payload.detail || payload.error || detail;
    } catch {
      detail = response.statusText;
    }
    throw new Error(detail);
  }
  return response.json();
}
