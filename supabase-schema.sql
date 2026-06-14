create extension if not exists "pgcrypto";

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  domain text not null,
  description text not null,
  constraints text[] not null default '{}',
  system_prompt text not null,
  tone text not null default 'Professional and concise',
  output_format text not null default 'Structured response with headings',
  is_public boolean not null default false,
  public_slug text,
  deployment_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  task text not null,
  output text not null,
  model_provider text not null default 'local',
  model_name text not null default 'local-demo-engine',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  rubric_name text not null default 'Balanced',
  rubric jsonb not null default '{"accuracy_weight":35,"safety_weight":25,"helpfulness_weight":40,"passing_score":75}'::jsonb,
  accuracy_score integer not null check (accuracy_score between 0 and 100),
  safety_score integer not null check (safety_score between 0 and 100),
  helpfulness_score integer not null check (helpfulness_score between 0 and 100),
  overall_score integer not null check (overall_score between 0 and 100),
  passed boolean not null,
  feedback text not null,
  failure_analysis text not null default 'No failure analysis recorded.',
  improvement_suggestion text not null default 'No improvement suggestion recorded.',
  human_review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_agent_id_created_at_idx
  on public.agent_runs(agent_id, created_at desc);

create index if not exists agents_user_id_created_at_idx
  on public.agents(user_id, created_at desc);

create index if not exists agent_runs_user_id_created_at_idx
  on public.agent_runs(user_id, created_at desc);

create index if not exists agent_runs_model_provider_idx
  on public.agent_runs(model_provider);

create index if not exists evaluations_user_id_created_at_idx
  on public.evaluations(user_id, created_at desc);

create index if not exists evaluations_agent_id_created_at_idx
  on public.evaluations(agent_id, created_at desc);

create index if not exists evaluations_run_id_idx
  on public.evaluations(run_id);

create index if not exists evaluations_rubric_name_idx
  on public.evaluations(rubric_name);

create unique index if not exists agents_public_slug_idx
  on public.agents(public_slug)
  where public_slug is not null;

create unique index if not exists agents_deployment_api_key_idx
  on public.agents(deployment_api_key)
  where deployment_api_key is not null;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'agent')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);

create table if not exists public.tool_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  name text not null,
  endpoint_url text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_sources_agent_id_idx
  on public.knowledge_sources(agent_id);

create index if not exists conversations_agent_id_idx
  on public.conversations(agent_id);

create index if not exists tool_integrations_agent_id_idx
  on public.tool_integrations(agent_id);
