alter table public.kmrl_experiments
  add column if not exists revision integer not null default 0;

update public.kmrl_experiments
set revision = coalesce((snapshot->>'revision')::integer, revision, 0)
where snapshot ? 'revision';

create or replace function public.kmrl_upsert_experiment(
  p_experiment_id text,
  p_expected_revision integer,
  p_snapshot jsonb
)
returns public.kmrl_experiments
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.kmrl_experiments;
  next_revision integer;
begin
  select * into current_row from public.kmrl_experiments
    where experiment_id = p_experiment_id for update;

  if found and current_row.revision <> p_expected_revision then
    raise exception 'REVISION_CONFLICT:%', current_row.revision using errcode = 'P0001';
  end if;

  next_revision := p_expected_revision + 1;
  insert into public.kmrl_experiments(experiment_id, revision, snapshot, updated_at)
  values (p_experiment_id, next_revision, jsonb_set(p_snapshot, '{revision}', to_jsonb(next_revision), true), now())
  on conflict (experiment_id) do update
    set revision = excluded.revision,
        snapshot = excluded.snapshot,
        updated_at = excluded.updated_at
  returning * into current_row;

  return current_row;
end;
$$;

revoke all on function public.kmrl_upsert_experiment(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.kmrl_upsert_experiment(text, integer, jsonb) to service_role;
