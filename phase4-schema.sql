alter table public.agents
  add column if not exists is_public boolean not null default false,
  add column if not exists public_slug text,
  add column if not exists deployment_api_key text;

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
