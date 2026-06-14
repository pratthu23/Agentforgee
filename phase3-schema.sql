alter table public.agent_runs
  add column if not exists model_provider text not null default 'local',
  add column if not exists model_name text not null default 'local-demo-engine',
  add column if not exists input_tokens integer not null default 0,
  add column if not exists output_tokens integer not null default 0,
  add column if not exists estimated_cost_usd numeric(12, 6) not null default 0;

create index if not exists agent_runs_model_provider_idx
  on public.agent_runs(model_provider);
