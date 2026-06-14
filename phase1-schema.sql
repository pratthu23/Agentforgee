alter table public.agents
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists tone text not null default 'Professional and concise',
  add column if not exists output_format text not null default 'Structured response with headings',
  add column if not exists updated_at timestamptz;

alter table public.agent_runs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.evaluations
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists agents_user_id_created_at_idx
  on public.agents(user_id, created_at desc);

create index if not exists agent_runs_user_id_created_at_idx
  on public.agent_runs(user_id, created_at desc);

create index if not exists evaluations_user_id_created_at_idx
  on public.evaluations(user_id, created_at desc);
