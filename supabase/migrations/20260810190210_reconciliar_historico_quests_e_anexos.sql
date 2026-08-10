-- Registra duas migrations que já estavam integralmente aplicadas no projeto
-- remoto, mas tinham sido executadas antes de o histórico local ser alinhado.
-- Em bancos novos, as versões já existirão e este arquivo será um no-op.

begin;

do $preconditions$
begin
  if to_regclass('public.quest_respostas') is null
     or to_regclass('public.quest_anexos') is null
     or to_regclass('public.curso_duvidas') is null then
    raise exception 'Estrutura de Quests e dúvidas ausente; histórico não pode ser adotado';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quest_anexos'
      and column_name = 'removido_em'
  ) then
    raise exception 'Hardening de anexos ausente; histórico não pode ser adotado';
  end if;

  if to_regprocedure('private.is_active_member()') is null
     or to_regprocedure('private.is_admin()') is null
     or to_regprocedure('private.guard_quest_anexo_mutation()') is null then
    raise exception 'Funções de segurança de Quests ausentes; histórico não pode ser adotado';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.quest_anexos'::regclass
      and tgname = 'guard_quest_anexo_mutation'
      and not tgisinternal
  ) then
    raise exception 'Trigger de segurança de anexos ausente; histórico não pode ser adotado';
  end if;
end;
$preconditions$;

insert into supabase_migrations.schema_migrations (
  version,
  name,
  statements,
  created_by
)
values
  (
    '20260809152311',
    'curso_quests_duvidas',
    array['-- estrutura já aplicada e verificada antes da reconciliação']::text[],
    'reconciliacao_local'
  ),
  (
    '20260809164000',
    'harden_quest_uploads',
    array['-- hardening já aplicado e verificado antes da reconciliação']::text[],
    'reconciliacao_local'
  )
on conflict (version) do nothing;

commit;
