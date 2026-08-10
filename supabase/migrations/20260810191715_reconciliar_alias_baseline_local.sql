-- A baseline local histórica foi criada com um timestamp diferente do registro
-- inicial remoto. Mantemos ambos para que `db push` não tente reaplicá-la.

begin;

do $precondition$
begin
  if to_regclass('public.admins') is null
     or to_regclass('public.whitelist') is null
     or to_regclass('public.turmas') is null then
    raise exception 'Baseline da área de membros ausente; alias não pode ser registrado';
  end if;
end;
$precondition$;

insert into supabase_migrations.schema_migrations (
  version,
  name,
  statements,
  created_by
)
values (
  '20260711195822',
  'baseline_expected_schema',
  array['-- alias da baseline local já aplicada e verificada']::text[],
  'reconciliacao_local'
)
on conflict (version) do nothing;

commit;
