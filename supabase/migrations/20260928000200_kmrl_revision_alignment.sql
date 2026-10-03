alter table public.kmrl_experiments
  add column if not exists revision integer not null default 0;

update public.kmrl_experiments
set revision = coalesce((snapshot->>'revision')::integer, revision, 0)
where snapshot ? 'revision';

create or replace function public.kmrl_upsert_experiment(
  p_experiment_id text,
  p_expected_revision integer,
  p_snapshot jsonb,
  p_owner_id uuid
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
  select * into current_row
    from public.kmrl_experiments
    where experiment_id = p_experiment_id
    for update;

  if found then
    if current_row.owner_id is null or current_row.owner_id <> p_owner_id then
      raise exception 'EXPERIMENT_FORBIDDEN' using errcode = 'P0001';
    end if;
    if current_row.revision <> p_expected_revision then
      raise exception 'REVISION_CONFLICT:%', current_row.revision using errcode = 'P0001';
    end if;
  elsif p_expected_revision <> 0 then
    raise exception 'REVISION_CONFLICT:0' using errcode = 'P0001';
  end if;

  next_revision := p_expected_revision + 1;

  insert into public.kmrl_experiments(
    experiment_id, owner_id, revision, snapshot, updated_at
  )
  values (
    p_experiment_id,
    p_owner_id,
    next_revision,
    jsonb_set(p_snapshot, '{revision}', to_jsonb(next_revision), true),
    now()
  )
  on conflict (experiment_id) do update
    set revision = excluded.revision,
        snapshot = excluded.snapshot,
        updated_at = excluded.updated_at
  returning * into current_row;

  return current_row;
end;
$$;

create or replace function public.kmrl_apply_mutation(
  p_experiment_id text,
  p_owner_id uuid,
  p_mutation_id text,
  p_base_revision integer,
  p_command jsonb,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.kmrl_experiments;
  existing_mutation public.kmrl_mutations;
  next_revision integer;
  saved_snapshot jsonb;
begin
  select * into current_row
    from public.kmrl_experiments
    where experiment_id = p_experiment_id
    for update;

  if not found then
    raise exception 'EXPERIMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if current_row.owner_id is null or current_row.owner_id <> p_owner_id then
    raise exception 'EXPERIMENT_FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into existing_mutation
    from public.kmrl_mutations
    where mutation_id = p_mutation_id
    for update;

  if found then
    return jsonb_build_object(
      'accepted', false,
      'duplicate', true,
      'snapshot', current_row.snapshot,
      'revision', current_row.revision
    );
  end if;

  if current_row.revision <> p_base_revision then
    raise exception 'REVISION_CONFLICT:%', current_row.revision using errcode = 'P0001';
  end if;

  if (p_snapshot->>'revision')::integer <> p_base_revision + 1 then
    raise exception 'INVALID_NEXT_REVISION' using errcode = 'P0001';
  end if;

  next_revision := p_base_revision + 1;
  saved_snapshot := jsonb_set(p_snapshot, '{revision}', to_jsonb(next_revision), true);

  update public.kmrl_experiments
  set revision = next_revision,
      snapshot = saved_snapshot,
      updated_at = now()
  where experiment_id = p_experiment_id;

  insert into public.kmrl_mutations(
    mutation_id, experiment_id, base_revision, command
  )
  values (
    p_mutation_id, p_experiment_id, p_base_revision, p_command
  );

  return jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'snapshot', saved_snapshot,
    'revision', next_revision
  );
end;
$$;

revoke all on function public.kmrl_upsert_experiment(text, integer, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.kmrl_upsert_experiment(text, integer, jsonb, uuid) to service_role;

revoke all on function public.kmrl_apply_mutation(text, uuid, text, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.kmrl_apply_mutation(text, uuid, text, integer, jsonb, jsonb) to service_role;
