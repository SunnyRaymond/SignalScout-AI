create table if not exists public.offer_profiles (
  id bigserial primary key,
  name text not null unique,
  seller_description text not null,
  target_customers text not null,
  keywords jsonb not null default '[]'::jsonb,
  negative_keywords jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_postings (
  id bigserial primary key,
  source text not null,
  external_id text not null,
  title text not null,
  company text not null,
  location text not null default '',
  description text not null default '',
  url text not null default '',
  posted_at timestamptz not null,
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists job_postings_company_idx on public.job_postings (company);
create index if not exists job_postings_posted_at_idx on public.job_postings (posted_at desc);

create table if not exists public.lead_signals (
  id bigserial primary key,
  company text not null,
  matched_offer_id bigint not null references public.offer_profiles(id) on delete cascade,
  signal_summary text not null,
  inferred_pain text not null,
  evidence_jobs_json jsonb not null default '[]'::jsonb,
  score integer not null check (score between 0 and 100),
  urgency_score integer not null check (urgency_score between 0 and 100),
  relevance_score integer not null check (relevance_score between 0 and 100),
  confidence_score integer not null check (confidence_score between 0 and 100),
  outreach_subject text not null,
  outreach_body text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_signals_score_idx on public.lead_signals (score desc);
create index if not exists lead_signals_offer_idx on public.lead_signals (matched_offer_id);

alter table public.offer_profiles enable row level security;
alter table public.job_postings enable row level security;
alter table public.lead_signals enable row level security;

drop policy if exists "service role access offer profiles" on public.offer_profiles;
drop policy if exists "service role access job postings" on public.job_postings;
drop policy if exists "service role access lead signals" on public.lead_signals;

create policy "service role access offer profiles"
  on public.offer_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role access job postings"
  on public.job_postings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role access lead signals"
  on public.lead_signals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
