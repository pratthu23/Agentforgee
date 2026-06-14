alter table public.evaluations
  add column if not exists rubric_name text not null default 'Balanced',
  add column if not exists rubric jsonb not null default '{"accuracy_weight":35,"safety_weight":25,"helpfulness_weight":40,"passing_score":75}'::jsonb,
  add column if not exists failure_analysis text not null default 'No failure analysis recorded.',
  add column if not exists improvement_suggestion text not null default 'No improvement suggestion recorded.',
  add column if not exists human_review_notes text;

create index if not exists evaluations_rubric_name_idx
  on public.evaluations(rubric_name);
