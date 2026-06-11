"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Cloud,
  Database,
  Download,
  Filter,
  Gauge,
  History,
  Layers3,
  Loader2,
  MessageSquare,
  Radar,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AgentTelemetry,
  AgentTraceStep,
  AgentComparisonRow,
  AgentRunHistory,
  BuyerPersona,
  EvidenceJob,
  JobPosting,
  LeadDiagnostic,
  LeadSignal,
  OfferProfile,
  ScoringWeights
} from "@/lib/types";

gsap.registerPlugin(useGSAP);

type Status = {
  status: string;
  counts: { offers: number; jobs: number; leads: number };
  integrations: { openai: boolean; adzuna: boolean; slack: boolean; supabase?: boolean };
  model?: string;
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

type AgentRunResponse = {
  created: number;
  leads: LeadSignal[];
  diagnostics: LeadDiagnostic[];
  trace: AgentTraceStep[];
  telemetry: AgentTelemetry | null;
  prompt_version: string;
};

type AgentRunsResponse = {
  runs: AgentRunHistory[];
};

type AgentComparisonResponse = {
  rows: AgentComparisonRow[];
};

const defaultOffer: OfferForm = {
  name: "Data Dashboard Agency",
  seller_description: "Sells Tableau dashboards, SQL pipelines, and executive reporting.",
  target_customers: "BI, Data, Analytics, RevOps, and Tableau teams.",
  keywords: "Tableau, Power BI, BI Analyst, Data Engineer, Analytics Engineer, SQL, Dashboard, Reporting, RevOps",
  negative_keywords: "intern, student, unpaid"
};

const defaultWeights: ScoringWeights = { relevance: 45, urgency: 35, confidence: 20 };

const demoScenarios: Array<{
  id: string;
  label: string;
  offerName: string;
  persona: BuyerPersona;
  weights: ScoringWeights;
  promise: string;
}> = [
  {
    id: "data-revops",
    label: "Data to RevOps",
    offerName: "Data Dashboard Agency",
    persona: "revops",
    weights: { relevance: 45, urgency: 35, confidence: 20 },
    promise: "Executive reporting and pipeline visibility"
  },
  {
    id: "cloud-it",
    label: "Cloud to IT",
    offerName: "Cloud Infrastructure Consultancy",
    persona: "it",
    weights: { relevance: 42, urgency: 43, confidence: 15 },
    promise: "Platform modernization and reliability"
  },
  {
    id: "cyber-security",
    label: "Cyber to Security",
    offerName: "Cyber Risk Studio",
    persona: "security",
    weights: { relevance: 48, urgency: 30, confidence: 22 },
    promise: "SOC, IAM, compliance, and risk readiness"
  }
];

const personas: Array<{ id: BuyerPersona; label: string; description: string; icon: LucideIcon }> = [
  { id: "revops", label: "RevOps", description: "Forecasting, CRM, pipeline, GTM ops", icon: TrendingUp },
  { id: "data", label: "Data", description: "BI, SQL, dashboards, metrics layers", icon: BarChart3 },
  { id: "it", label: "IT", description: "Cloud, platform, SRE, infrastructure", icon: Cloud },
  { id: "security", label: "Security", description: "SOC, IAM, compliance, risk", icon: ShieldCheck }
];

const tabs = [
  { id: "dashboard", label: "Command Center", icon: Radar },
  { id: "offer", label: "Offer Studio", icon: Target },
  { id: "jobs", label: "Signal Feed", icon: BriefcaseBusiness },
  { id: "leads", label: "Lead Workspace", icon: Layers3 },
  { id: "slack", label: "Slack Preview", icon: MessageSquare }
];

const providerOptions = [
  { id: "muse", label: "The Muse" },
  { id: "adzuna", label: "Adzuna" },
  { id: "greenhouse", label: "Greenhouse demo" },
  { id: "lever", label: "Lever demo" },
  { id: "workday", label: "Workday demo" },
  { id: "linkedin_export", label: "LinkedIn export demo" }
];

export default function Home() {
  const shellRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [status, setStatus] = useState<Status | null>(null);
  const [offers, setOffers] = useState<OfferProfile[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [leads, setLeads] = useState<LeadSignal[]>([]);
  const [slackPreview, setSlackPreview] = useState<SlackPreview | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [offerForm, setOfferForm] = useState<OfferForm>(defaultOffer);
  const [buyerPersona, setBuyerPersona] = useState<BuyerPersona>("revops");
  const [weights, setWeights] = useState<ScoringWeights>(defaultWeights);
  const [diagnostics, setDiagnostics] = useState<LeadDiagnostic[]>([]);
  const [trace, setTrace] = useState<AgentTraceStep[]>([]);
  const [telemetry, setTelemetry] = useState<AgentTelemetry | null>(null);
  const [runHistory, setRunHistory] = useState<AgentRunHistory[]>([]);
  const [comparisonRows, setComparisonRows] = useState<AgentComparisonRow[]>([]);
  const [leadQuery, setLeadQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [jobQuery, setJobQuery] = useState("");
  const [fetchQuery, setFetchQuery] = useState("analytics");
  const [fetchSource, setFetchSource] = useState("greenhouse");
  const [selectedLead, setSelectedLead] = useState<LeadSignal | null>(null);
  const [loading, setLoading] = useState<string | null>("boot");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedOffer = useMemo(() => offers.find((offer) => offer.id === selectedOfferId) || offers[0], [offers, selectedOfferId]);
  const topLead = leads[0] || null;
  const focusedLead = selectedLead || topLead;

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
    return jobs.filter((job) => !query || `${job.title} ${job.company} ${job.location} ${job.description} ${job.source}`.toLowerCase().includes(query));
  }, [jobs, jobQuery]);

  const providerMix = useMemo(() => {
    return Object.entries(jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.source] = (acc[job.source] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [jobs]);

  const stats = [
    { label: "Offers", value: status?.counts.offers ?? offers.length, icon: Target, tone: "text-sky-700" },
    { label: "Jobs", value: status?.counts.jobs ?? jobs.length, icon: BriefcaseBusiness, tone: "text-emerald-700" },
    { label: "Leads", value: status?.counts.leads ?? leads.length, icon: Radar, tone: "text-rose-700" },
    { label: "Top score", value: topLead ? topLead.score : 0, icon: Gauge, tone: "text-amber-700" }
  ];

  useGSAP(() => {
    if (loading === "boot" || !shellRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    gsap.fromTo(
      ".reveal",
      { y: 14 },
      { y: 0, duration: 0.32, stagger: 0.035, ease: "power3.out", clearProps: "transform" }
    );
    gsap.fromTo(
      ".score-fill",
      { scaleX: 0 },
      { scaleX: 1, duration: 0.55, stagger: 0.04, ease: "power3.out", transformOrigin: "left center" }
    );
  }, { scope: shellRef, dependencies: [loading, activeTab, leads.length, diagnostics.length], revertOnUpdate: true });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const loadAll = useCallback(async (loadingMode: string | null = "boot") => {
    if (loadingMode) {
      setLoading(loadingMode);
    }
    setError(null);
    try {
      const [statusData, offerData, jobData, leadData, slackData, historyData] = await Promise.all([
        apiFetch<Status>("/api/status"),
        apiFetch<OfferProfile[]>("/api/offers"),
        apiFetch<JobPosting[]>("/api/jobs"),
        apiFetch<LeadSignal[]>("/api/leads"),
        apiFetch<SlackPreview>("/api/slack/preview"),
        apiFetch<AgentRunsResponse>("/api/agent/runs?limit=6").catch(() => ({ runs: [] }))
      ]);
      setStatus(statusData);
      setOffers(offerData);
      setJobs(jobData);
      setLeads(leadData);
      setSlackPreview(slackData);
      setRunHistory(historyData.runs || []);
      const latestRun = historyData.runs?.[0];
      setDiagnostics(latestRun?.diagnostics_json || []);
      setTrace(latestRun?.trace_json || []);
      setTelemetry(latestRun?.telemetry_json || null);
      if (!selectedOfferId && offerData.length > 0) {
        const preferred = offerData.find((offer) => offer.name === "Data Dashboard Agency") || offerData[0];
        setSelectedOfferId(preferred.id);
        setOfferForm(fromOffer(preferred));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the SignalScout API.");
    } finally {
      if (loadingMode) {
        setLoading(null);
      }
    }
  }, [selectedOfferId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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
      await loadAll(null);
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
      setNotice(`Demo dataset ready: ${response.added} added, ${response.updated} updated, ${response.total} total.`);
      await loadAll(null);
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
        body: JSON.stringify({ source: fetchSource, query: fetchQuery, location: "United States", limit: 30 })
      });
      setNotice(response.message || `Fetched ${response.added} jobs.`);
      await loadAll(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "API job fetch failed.");
    } finally {
      setLoading(null);
    }
  }

  async function demoReset() {
    setLoading("reset");
    setError(null);
    try {
      const response = await apiFetch<{ message: string; jobs: { total: number } }>("/api/demo/reset", { method: "POST" });
      setDiagnostics([]);
      setTrace([]);
      setTelemetry(null);
      setComparisonRows([]);
      setSelectedLead(null);
      setNotice(response.message || `Demo reset complete: ${response.jobs.total} jobs loaded.`);
      await loadAll(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo reset failed.");
    } finally {
      setLoading(null);
    }
  }

  async function runAgent(overrides: { offerId?: number; persona?: BuyerPersona; scoringWeights?: ScoringWeights } = {}) {
    const offerId = overrides.offerId ?? selectedOffer?.id;
    const persona = overrides.persona ?? buyerPersona;
    const scoringWeights = overrides.scoringWeights ?? weights;
    if (!offerId) {
      setError("Choose an offer before running the agent.");
      return;
    }
    setLoading("agent");
    setError(null);
    try {
      const response = await apiFetch<AgentRunResponse>("/api/agent/run", {
        method: "POST",
        body: JSON.stringify({
          offer_id: offerId,
          clear_existing: true,
          buyer_persona: persona,
          scoring_weights: scoringWeights
        })
      });
      setDiagnostics(response.diagnostics || []);
      setTelemetry(response.telemetry || null);
      setTrace(response.trace || []);
      setLeads(response.leads || []);
      setNotice(`Agent created ${response.created} ranked signals for ${personaLabel(persona)}.`);
      setActiveTab("leads");
      await loadAll(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setLoading(null);
    }
  }

  function applyScenario(scenario: typeof demoScenarios[number]) {
    const offer = offers.find((item) => item.name === scenario.offerName);
    if (!offer) {
      setError(`Offer not found for scenario: ${scenario.offerName}.`);
      return;
    }
    setSelectedOfferId(offer.id);
    setOfferForm(fromOffer(offer));
    setBuyerPersona(scenario.persona);
    setWeights(scenario.weights);
    setNotice(`${scenario.label} scenario loaded.`);
  }

  async function runScenario(scenario: typeof demoScenarios[number]) {
    const offer = offers.find((item) => item.name === scenario.offerName);
    if (!offer) {
      setError(`Offer not found for scenario: ${scenario.offerName}.`);
      return;
    }
    setSelectedOfferId(offer.id);
    setOfferForm(fromOffer(offer));
    setBuyerPersona(scenario.persona);
    setWeights(scenario.weights);
    await runAgent({ offerId: offer.id, persona: scenario.persona, scoringWeights: scenario.weights });
  }

  async function compareWeights() {
    if (!selectedOffer?.id) {
      setError("Choose an offer before comparing score presets.");
      return;
    }
    setLoading("compare");
    setError(null);
    try {
      const response = await apiFetch<AgentComparisonResponse>("/api/agent/compare", {
        method: "POST",
        body: JSON.stringify({
          offer_id: selectedOffer.id,
          buyer_persona: buyerPersona,
          baseline_weights: defaultWeights,
          challenger_weights: weights
        })
      });
      setComparisonRows(response.rows || []);
      setNotice(`Comparison ready for ${selectedOffer.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setLoading(null);
    }
  }

  function downloadCsv(kind: "leads" | "diagnostics") {
    window.location.href = `/api/exports/${kind}`;
  }

  async function sendSlack() {
    setLoading("slack");
    setError(null);
    try {
      const response = await apiFetch<{ sent: boolean; message: string }>("/api/slack/send", { method: "POST" });
      setNotice(response.message);
      await loadAll(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slack send failed.");
    } finally {
      setLoading(null);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied.");
    } catch {
      setError("Clipboard access was blocked by the browser.");
    }
  }

  return (
    <main ref={shellRef} className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="reveal flex flex-col gap-4 rounded-lg border border-slate-200 bg-white/90 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo.svg" alt="SignalScout AI logo" width={48} height={48} className="rounded-lg" priority />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950">SignalScout AI</h1>
                <Badge tone="sky">Demo command center</Badge>
              </div>
              <p className="text-sm text-slate-600">Hiring signals, buyer-fit scoring, evidence, and outreach in one workflow.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadSampleJobs} disabled={Boolean(loading)} className="btn-secondary">
              {loading === "sample" ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
              Load 5x data
            </button>
            <button onClick={demoReset} disabled={Boolean(loading)} className="btn-secondary">
              {loading === "reset" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Demo Reset
            </button>
            <button onClick={() => runAgent()} disabled={Boolean(loading) || !selectedOffer} className="btn-primary">
              {loading === "agent" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Run Agent
            </button>
          </div>
        </header>

        <nav className="reveal flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white/82 p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {(error || notice) && (
          <div className={`reveal flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            <span>{error || notice}</span>
            <button onClick={() => (error ? setError(null) : setNotice(null))} className="rounded-md p-1 transition hover:bg-white/70" aria-label="Dismiss message">
              <X className="size-4" />
            </button>
          </div>
        )}

        {loading === "boot" ? (
          <LoadingPanel />
        ) : (
          <div className="flex flex-col gap-5">
            {activeTab === "dashboard" && (
              <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="reveal rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div>
                        <Badge tone="emerald">Two-step buying-signal agent</Badge>
                        <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">
                          Turn hiring noise into a judge-ready sales signal.
                        </h2>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                          Load enriched postings, tune the buyer persona and score weights, then show exactly why a company became a lead or why it was filtered out.
                        </p>
                      </div>
                      <Pipeline loading={loading} onLoad={loadSampleJobs} onRun={() => runAgent()} onSlack={sendSlack} />
                    </div>
                    <TopSignal lead={topLead} offer={selectedOffer} onOpen={() => topLead && setSelectedLead(topLead)} />
                  </div>
                </div>

                <div className="reveal grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                  ))}
                </div>

                <div className="reveal grid gap-5 xl:col-span-2 lg:grid-cols-[0.72fr_1.28fr]">
                  <div className="grid gap-5">
                    <ControlPanel
                      offers={offers}
                      selectedOfferId={selectedOfferId}
                      setSelectedOfferId={setSelectedOfferId}
                      selectedOffer={selectedOffer}
                      buyerPersona={buyerPersona}
                      setBuyerPersona={setBuyerPersona}
                      weights={weights}
                      setWeights={setWeights}
                      integrations={status?.integrations}
                      model={status?.model}
                    />
                    <ScenarioPanel scenarios={demoScenarios} loading={loading} onApply={applyScenario} onRun={runScenario} />
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <ProviderMix providerMix={providerMix} total={jobs.length} />
                    <DiagnosticsPanel diagnostics={diagnostics} compact />
                    <TracePanel trace={trace} />
                    <TelemetryPanel telemetry={telemetry} />
                    <RunHistoryPanel runs={runHistory} />
                    <ComparisonPanel rows={comparisonRows} loading={loading === "compare"} onCompare={compareWeights} baseline={defaultWeights} challenger={weights} />
                  </div>
                </div>

                <div className="reveal xl:col-span-2">
                  <RankedLeadTable leads={filteredLeads.slice(0, 8)} offers={offers} onOpen={setSelectedLead} />
                </div>
              </section>
            )}

            {activeTab === "offer" && (
              <section className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="reveal rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Offer Studio</h2>
                      <p className="text-sm text-slate-600">Define the problem SignalScout should listen for in job postings.</p>
                    </div>
                    <button onClick={() => setOfferForm(defaultOffer)} className="btn-secondary">
                      <Target className="size-4" />
                      Prefill
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Field label="Offer name">
                      <input value={offerForm.name} onChange={(event) => setOfferForm({ ...offerForm, name: event.target.value })} className="input" />
                    </Field>
                    <Field label="Seller description">
                      <textarea value={offerForm.seller_description} onChange={(event) => setOfferForm({ ...offerForm, seller_description: event.target.value })} rows={3} className="input" />
                    </Field>
                    <Field label="Target customers">
                      <textarea value={offerForm.target_customers} onChange={(event) => setOfferForm({ ...offerForm, target_customers: event.target.value })} rows={2} className="input" />
                    </Field>
                    <Field label="Keywords">
                      <textarea value={offerForm.keywords} onChange={(event) => setOfferForm({ ...offerForm, keywords: event.target.value })} rows={3} className="input" />
                    </Field>
                    <Field label="Negative keywords">
                      <input value={offerForm.negative_keywords} onChange={(event) => setOfferForm({ ...offerForm, negative_keywords: event.target.value })} className="input" />
                    </Field>
                    <button onClick={saveOffer} disabled={loading === "offer"} className="btn-primary w-fit">
                      {loading === "offer" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Save Offer
                    </button>
                  </div>
                </div>
                <div className="reveal rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-slate-950">Saved profiles</h3>
                    <p className="text-sm text-slate-600">Each profile can be paired with a different buyer persona during the demo run.</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {offers.map((offer) => (
                      <button key={offer.id} onClick={() => { setSelectedOfferId(offer.id); setOfferForm(fromOffer(offer)); }} className={`rounded-lg border p-4 text-left transition ${selectedOfferId === offer.id ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{offer.name}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{offer.seller_description}</p>
                          </div>
                          <Badge tone="slate">{offer.keywords.length} terms</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {offer.keywords.slice(0, 10).map((keyword) => (
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
              <section className="reveal flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Signal Feed</h2>
                    <p className="text-sm text-slate-600">{filteredJobs.length} visible postings across sample, API, and demo provider sources.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <Search className="size-4 text-slate-500" />
                      <input value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="Search jobs" className="w-44 bg-transparent text-sm outline-none" />
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <select value={fetchSource} onChange={(event) => setFetchSource(event.target.value)} className="border-r border-slate-200 px-3 py-2 text-sm outline-none">
                        {providerOptions.map((provider) => (
                          <option key={provider.id} value={provider.id}>{provider.label}</option>
                        ))}
                      </select>
                      <input value={fetchQuery} onChange={(event) => setFetchQuery(event.target.value)} className="w-36 px-3 py-2 text-sm outline-none sm:w-48" />
                      <button onClick={fetchApiJobs} className="inline-flex items-center gap-2 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        {loading === "fetch" ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                        Fetch
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">Source</th>
                        <th className="px-4 py-3 font-semibold">Location</th>
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
                          <tr key={job.id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-950">{job.title}</td>
                            <td className="px-4 py-3 text-slate-700">{job.company}</td>
                            <td className="px-4 py-3"><Badge tone="sky">{sourceLabel(job.source)}</Badge></td>
                            <td className="px-4 py-3 text-slate-600">{job.location}</td>
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
              <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
                <div className="reveal flex flex-col gap-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-950">Lead Workspace</h2>
                        <p className="text-sm text-slate-600">{selectedOffer?.name || "Selected offer"} - {filteredLeads.length} matches</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <Search className="size-4 text-slate-500" />
                          <input value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Search leads" className="w-40 bg-transparent text-sm outline-none" />
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <Filter className="size-4 text-slate-500" />
                          <input type="range" min={0} max={95} step={5} value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} />
                          <span className="text-sm font-semibold text-slate-700">{minScore}+</span>
                        </div>
                        <button onClick={() => downloadCsv("leads")} className="btn-secondary">
                          <Download className="size-4" />
                          Leads CSV
                        </button>
                        <button onClick={() => downloadCsv("diagnostics")} className="btn-secondary">
                          <Download className="size-4" />
                          Diagnostics CSV
                        </button>
                      </div>
                    </div>
                  </div>
                  {filteredLeads.length === 0 ? (
                    <EmptyState title="No leads yet" text="Load sample jobs, choose an offer, and run the agent." action="Run Agent" onAction={runAgent} />
                  ) : (
                    <div className="grid gap-3">
                      {filteredLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} active={focusedLead?.id === lead.id} onOpen={() => setSelectedLead(lead)} onCopy={() => copyText(`${lead.outreach_subject}\n\n${lead.outreach_body}`)} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="reveal">
                  <LeadDetailPanel lead={focusedLead} onCopy={() => focusedLead && copyText(`${focusedLead.outreach_subject}\n\n${focusedLead.outreach_body}`)} />
                </div>
                <div className="reveal xl:col-span-2">
                  <DiagnosticsPanel diagnostics={diagnostics} />
                </div>
              </section>
            )}

            {activeTab === "slack" && (
              <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="reveal rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-950">Slack Digest Control</h2>
                  <p className="mt-1 text-sm text-slate-600">Show the judges how the ranked signal becomes a channel-ready update.</p>
                  <div className="mt-4 grid gap-3">
                    <div className={`rounded-lg border p-4 ${slackPreview?.has_webhook ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className="text-sm font-semibold text-slate-950">{slackPreview?.has_webhook ? "Webhook configured" : "Demo-safe mode"}</p>
                      <p className="mt-1 text-sm text-slate-700">{slackPreview?.has_webhook ? "Slack send will post to the configured webhook." : "No webhook detected; send returns a preview-safe response."}</p>
                    </div>
                    <button onClick={sendSlack} className="btn-primary w-fit">
                      {loading === "slack" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send Digest
                    </button>
                  </div>
                </div>
                <div className="reveal overflow-hidden rounded-lg border border-slate-800 bg-[#1f2229] shadow-soft">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-white">
                    <span className="size-3 rounded-full bg-rose-400" />
                    <span className="size-3 rounded-full bg-amber-400" />
                    <span className="size-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-sm font-semibold">#sales-signals</span>
                  </div>
                  <div className="flex gap-3 p-4 text-sm text-slate-100">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400 font-bold text-slate-950">SS</div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">SignalScout AI</span>
                        <span className="text-xs text-slate-400">digest preview</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/10 p-4 font-sans leading-6 text-slate-100">{slackPreview?.text || "No digest yet."}</pre>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ControlPanel({
  offers,
  selectedOfferId,
  setSelectedOfferId,
  selectedOffer,
  buyerPersona,
  setBuyerPersona,
  weights,
  setWeights,
  integrations,
  model
}: {
  offers: OfferProfile[];
  selectedOfferId: number | null;
  setSelectedOfferId: (value: number) => void;
  selectedOffer?: OfferProfile;
  buyerPersona: BuyerPersona;
  setBuyerPersona: (value: BuyerPersona) => void;
  weights: ScoringWeights;
  setWeights: (value: ScoringWeights) => void;
  integrations?: Status["integrations"];
  model?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Demo Controls</h3>
          <p className="text-sm text-slate-600">Tune the same account for different buyers and score formulas.</p>
        </div>
        <Badge tone="amber">{model || "model pending"}</Badge>
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="Offer profile">
          <select value={selectedOfferId ?? ""} onChange={(event) => setSelectedOfferId(Number(event.target.value))} className="input">
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>{offer.name}</option>
            ))}
          </select>
        </Field>
        <div>
          <p className="text-sm font-semibold text-slate-700">Buyer persona</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {personas.map((persona) => {
              const Icon = persona.icon;
              const active = buyerPersona === persona.id;
              return (
                <button key={persona.id} onClick={() => setBuyerPersona(persona.id)} className={`rounded-lg border p-3 text-left transition ${active ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2 font-semibold text-slate-950">
                    <Icon className="size-4" />
                    {persona.label}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{persona.description}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-3">
          <WeightControl label="Relevance" value={weights.relevance} onChange={(value) => setWeights({ ...weights, relevance: value })} />
          <WeightControl label="Urgency" value={weights.urgency} onChange={(value) => setWeights({ ...weights, urgency: value })} />
          <WeightControl label="Confidence" value={weights.confidence} onChange={(value) => setWeights({ ...weights, confidence: value })} />
        </div>
        <div className="grid gap-2 border-t border-slate-200 pt-4">
          <IntegrationBadge label="OpenAI" ready={Boolean(integrations?.openai)} />
          <IntegrationBadge label="Supabase" ready={Boolean(integrations?.supabase)} />
          <IntegrationBadge label="Slack" ready={Boolean(integrations?.slack)} />
        </div>
        {selectedOffer && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{selectedOffer.target_customers}</p>
        )}
      </div>
    </div>
  );
}

function ScenarioPanel({
  scenarios,
  loading,
  onApply,
  onRun
}: {
  scenarios: typeof demoScenarios;
  loading: string | null;
  onApply: (scenario: typeof demoScenarios[number]) => void;
  onRun: (scenario: typeof demoScenarios[number]) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Canned Demo Scenarios</h3>
          <p className="text-sm text-slate-600">One click sets offer, persona, and score weights for a crisp judge story.</p>
        </div>
        <Badge tone="emerald">3 presets</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{scenario.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{scenario.promise}</p>
              </div>
              <Badge tone="sky">{personaLabel(scenario.persona)}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onApply(scenario)} disabled={Boolean(loading)} className="btn-secondary px-3 py-1.5 text-xs">
                Load
              </button>
              <button onClick={() => onRun(scenario)} disabled={Boolean(loading)} className="btn-primary px-3 py-1.5 text-xs">
                {loading === "agent" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Run
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pipeline({ loading, onLoad, onRun, onSlack }: { loading: string | null; onLoad: () => void; onRun: () => void; onSlack: () => void }) {
  const steps = [
    { label: "Load enriched jobs", detail: "5x provider mix", icon: Database, action: onLoad, loadingKey: "sample" },
    { label: "Extract evidence", detail: "Persona and weights", icon: Sparkles, action: onRun, loadingKey: "agent" },
    { label: "Send digest", detail: "Slack-ready output", icon: Send, action: onSlack, loadingKey: "slack" }
  ];
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <button key={step.label} onClick={step.action} disabled={Boolean(loading)} className="group rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-sky-300 hover:bg-white">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm">
                {loading === step.loadingKey ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              </span>
              <span className="text-xs font-semibold text-slate-500">0{index + 1}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-950">{step.label}</p>
            <p className="text-xs text-slate-600">{step.detail}</p>
          </button>
        );
      })}
    </div>
  );
}

function TopSignal({ lead, offer, onOpen }: { lead: LeadSignal | null; offer?: OfferProfile; onOpen: () => void }) {
  if (!lead) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
        <Badge tone="slate">Waiting for run</Badge>
        <h3 className="mt-4 text-2xl font-semibold text-slate-950">No top signal yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Load the enriched sample data and run the agent to fill this cockpit with ranked evidence.</p>
      </div>
    );
  }
  const evidence = lead.evidence_jobs_json[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="emerald">Top account</Badge>
          <h3 className="mt-4 text-3xl font-semibold">{lead.company}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{lead.signal_summary}</p>
        </div>
        <div className="score-ring flex size-24 shrink-0 items-center justify-center rounded-full" style={{ "--score": lead.score } as CSSProperties}>
          <div className="flex size-20 items-center justify-center rounded-full bg-slate-950 text-2xl font-semibold">{lead.score}</div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ScoreBar label="Relevance" value={lead.relevance_score} dark />
        <ScoreBar label="Urgency" value={lead.urgency_score} dark />
        <ScoreBar label="Confidence" value={lead.confidence_score} dark />
      </div>
      <div className="mt-5 rounded-lg border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-semibold uppercase text-slate-400">Primary evidence</p>
        <p className="mt-1 text-sm font-semibold">{evidence?.title || offer?.name || "Evidence pending"}</p>
        <p className="mt-1 text-xs text-slate-300">{evidence?.role_driver || "Run the agent to extract role drivers."}</p>
      </div>
      <button onClick={onOpen} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
        <Radar className="size-4" />
        Inspect signal
      </button>
    </div>
  );
}

function ProviderMix({ providerMix, total }: { providerMix: Array<[string, number]>; total: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">Provider mix</h3>
      <p className="mt-1 text-sm text-slate-600">{total} postings after 5x expansion and fetches.</p>
      <div className="mt-4 grid gap-3">
        {providerMix.length === 0 ? (
          <p className="text-sm text-slate-500">No provider data yet.</p>
        ) : providerMix.map(([source, count]) => (
          <div key={source}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{sourceLabel(source)}</span>
              <span className="text-slate-500">{count}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="score-fill h-2 rounded-full bg-sky-500" style={{ width: `${Math.max(8, (count / Math.max(total, 1)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticsPanel({ diagnostics, compact = false }: { diagnostics: LeadDiagnostic[]; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Why-not-a-lead diagnostics</h3>
          <p className="text-sm text-slate-600">Below-threshold postings stay explainable.</p>
        </div>
        <Badge tone="rose">{diagnostics.length}</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        {diagnostics.length === 0 ? (
          <p className="text-sm text-slate-500">Run the agent to show filtered noise.</p>
        ) : diagnostics.slice(0, compact ? 3 : 12).map((item) => (
          <div key={`${item.company}-${item.title}-${item.source}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.company}</p>
                <p className="text-xs text-slate-600">{item.title} - {sourceLabel(item.source)}</p>
              </div>
              <ScoreBadge score={item.score} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{item.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TracePanel({ trace }: { trace: AgentTraceStep[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">Agent evolution trace</h3>
      <div className="mt-4 grid gap-3">
        {trace.length === 0 ? (
          <p className="text-sm text-slate-500">Trace appears after an agent run.</p>
        ) : trace.map((step) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-700">{step.count}</div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{step.label}</p>
              <p className="text-xs leading-5 text-slate-600">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelemetryPanel({ telemetry }: { telemetry: AgentTelemetry | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">Cost telemetry</h3>
      {!telemetry ? (
        <p className="mt-4 text-sm text-slate-500">Model cost estimate appears after generation.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <MiniStat label="Model" value={telemetry.model} />
          <MiniStat label="Requests" value={telemetry.request_count} />
          <MiniStat label="Input tokens" value={telemetry.input_tokens} />
          <MiniStat label="Est. cost" value={`$${telemetry.estimated_cost_usd.toFixed(6)}`} />
        </div>
      )}
    </div>
  );
}

function RunHistoryPanel({ runs }: { runs: AgentRunHistory[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Agent Run History</h3>
          <p className="text-sm text-slate-600">Reads from the `agent_runs` audit table.</p>
        </div>
        <History className="size-4 text-slate-500" />
      </div>
      <div className="mt-4 grid gap-3">
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">Run the agent after the schema migration to populate history.</p>
        ) : runs.slice(0, 4).map((run) => (
          <div key={run.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">{run.created_leads} leads</p>
              <Badge tone="sky">{personaLabel(run.buyer_persona)}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-600">{run.model} - {run.prompt_version}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MiniStat label="Cost" value={`$${(run.telemetry_json?.estimated_cost_usd || 0).toFixed(6)}`} />
              <MiniStat label="Time" value={`${Math.round(run.duration_ms / 1000)}s`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonPanel({
  rows,
  loading,
  onCompare,
  baseline,
  challenger
}: {
  rows: AgentComparisonRow[];
  loading: boolean;
  onCompare: () => void;
  baseline: ScoringWeights;
  challenger: ScoringWeights;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">Score Preset Comparison</h3>
          <p className="text-sm text-slate-600">
            Baseline {weightLabel(baseline)} vs current {weightLabel(challenger)}.
          </p>
        </div>
        <button onClick={onCompare} disabled={loading} className="btn-secondary w-fit">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Gauge className="size-4" />}
          Compare weights
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Company</th>
              <th className="px-3 py-2 font-semibold">Base</th>
              <th className="px-3 py-2 font-semibold">Current</th>
              <th className="px-3 py-2 font-semibold">Move</th>
              <th className="px-3 py-2 font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">Run a comparison to show rank changes.</td>
              </tr>
            ) : rows.slice(0, 8).map((row) => (
              <tr key={row.company_domain} className="align-top">
                <td className="px-3 py-2 font-semibold text-slate-950">{row.company}</td>
                <td className="px-3 py-2 text-slate-600">#{row.baseline_rank || "-"} / {row.baseline_score ?? "-"}</td>
                <td className="px-3 py-2 text-slate-600">#{row.challenger_rank || "-"} / {row.challenger_score ?? "-"}</td>
                <td className="px-3 py-2">
                  <RankDelta value={row.rank_delta} />
                </td>
                <td className="max-w-xs px-3 py-2 text-slate-600">{row.top_evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
        <Badge tone="sky">Top {leads.length}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Offer</th>
              <th className="px-4 py-3 font-semibold">Evidence</th>
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
                <tr key={lead.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-950">{lead.company}</td>
                  <td className="px-4 py-3 text-slate-600">{offerName(lead.matched_offer_id)}</td>
                  <td className="max-w-md px-4 py-3 text-slate-700">{lead.evidence_jobs_json[0]?.role_driver || lead.signal_summary}</td>
                  <td className="px-4 py-3"><ScoreBadge score={lead.score} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(lead)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Open</button>
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

function LeadCard({ lead, active, onOpen, onCopy }: { lead: LeadSignal; active: boolean; onOpen: () => void; onCopy: () => void }) {
  const evidence = lead.evidence_jobs_json[0];
  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm transition ${active ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200 hover:border-slate-300"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{lead.company}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{lead.signal_summary}</p>
        </div>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ScoreBar label="Rel" value={lead.relevance_score} />
        <ScoreBar label="Urg" value={lead.urgency_score} />
        <ScoreBar label="Conf" value={lead.confidence_score} />
      </div>
      {evidence && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">{evidence.role_driver}: {evidence.title}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onOpen} className="btn-primary">
          <Radar className="size-4" />
          Detail
        </button>
        <button onClick={onCopy} className="btn-secondary">
          <Clipboard className="size-4" />
          Copy outreach
        </button>
      </div>
    </article>
  );
}

function LeadDetailPanel({ lead, onCopy }: { lead: LeadSignal | null; onCopy: () => void }) {
  if (!lead) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <Radar className="mx-auto size-10 text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-950">Select a lead</h3>
        <p className="mt-2 text-sm text-slate-600">Run the agent or open a lead to inspect score drivers, evidence lines, enrichment, and outreach.</p>
      </div>
    );
  }
  const enrichment = lead.evidence_jobs_json[0]?.company_enrichment;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{lead.company}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{lead.signal_summary}</p>
          </div>
          <ScoreBadge score={lead.score} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ScoreBar label="Relevance" value={lead.relevance_score} />
          <ScoreBar label="Urgency" value={lead.urgency_score} />
          <ScoreBar label="Confidence" value={lead.confidence_score} />
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-4">
          <InfoPanel title="Inferred pain" text={lead.inferred_pain} />
          {enrichment && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">Company enrichment</h3>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <MiniStat label="Industry" value={enrichment.industry || "Unknown"} />
                <MiniStat label="Employees" value={enrichment.employee_count || "Unknown"} />
                <MiniStat label="Stage" value={enrichment.funding_stage || "Unknown"} />
                <div className="flex flex-wrap gap-2 pt-1">
                  {(enrichment.tech_stack || []).slice(0, 6).map((tech) => (
                    <span key={tech} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <EvidenceList evidence={lead.evidence_jobs_json} />
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-950">Outreach</h3>
            <button onClick={onCopy} className="btn-secondary">
              <Clipboard className="size-4" />
              Copy
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Subject</p>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-950">{lead.outreach_subject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Body</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm leading-6 text-slate-700">{lead.outreach_body}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: EvidenceJob[] }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-950">Evidence jobs</h3>
      <div className="mt-3 grid gap-3">
        {evidence.map((job) => (
          <a key={`${job.title}-${job.url}-${job.source}`} href={job.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-950">{job.title}</p>
              <Badge tone="sky">{sourceLabel(job.source)}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{job.location} - {formatDate(job.posted_at)} - match {job.job_match_score}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">{job.role_driver} - +{job.historical_delta} roles in 30 days</p>
            <div className="mt-2 grid gap-2">
              {job.keyword_contexts.slice(0, 2).map((context) => (
                <div key={`${job.title}-${context.keyword}-${context.snippet}`} className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-slate-800">{context.keyword}:</span> {context.snippet}
                </div>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function WeightControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input className="w-full accent-sky-700" type="range" min={0} max={80} step={5} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function IntegrationBadge({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ready ? "text-emerald-700" : "text-amber-700"}`}>
        <Activity className="size-3" />
        {ready ? "ready" : "demo"}
      </span>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center justify-between text-xs font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-slate-100"}`}>
        <div className={`score-fill h-2 rounded-full ${dark ? "bg-emerald-300" : "bg-sky-600"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : score >= 60 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{score}/100</span>;
}

function RankDelta({ value }: { value: number | null }) {
  if (value === null || value === 0) {
    return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">No move</span>;
  }
  const improved = value > 0;
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${improved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {improved ? "+" : ""}{value} ranks
    </span>
  );
}

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "sky" | "emerald" | "amber" | "rose" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    sky: "bg-sky-50 text-sky-800 ring-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200"
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
        <Radar className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{text}</p>
      <button onClick={onAction} className="btn-primary mt-5">
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

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    sample: "Sample",
    muse: "The Muse",
    adzuna: "Adzuna",
    greenhouse: "Greenhouse",
    lever: "Lever",
    workday: "Workday",
    linkedin_export: "LinkedIn"
  };
  return labels[source] || source;
}

function personaLabel(persona: BuyerPersona) {
  return personas.find((item) => item.id === persona)?.label || persona;
}

function weightLabel(value: ScoringWeights) {
  return `${value.relevance}/${value.urgency}/${value.confidence}`;
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
