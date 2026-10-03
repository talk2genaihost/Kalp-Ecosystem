create table if not exists public.kmrl_experiments (
  experiment_id text primary key,
  owner_id uuid,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kmrl_experiments
  add column if not exists owner_id uuid;

create table if not exists public.kmrl_mutations (
  mutation_id text primary key,
  experiment_id text not null references public.kmrl_experiments(experiment_id) on delete cascade,
  base_revision integer not null,
  command jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists kmrl_experiments_owner_idx on public.kmrl_experiments(owner_id);
create index if not exists kmrl_mutations_experiment_idx on public.kmrl_mutations(experiment_id, created_at);

alter table public.kmrl_experiments enable row level security;
alter table public.kmrl_mutations enable row level security;

comment on table public.kmrl_experiments is 'KMRL remote experiment snapshots; ownership is enforced by the authenticated kmrl-sync Edge Function.';
comment on table public.kmrl_mutations is 'KMRL idempotent remote mutation ledger.';
