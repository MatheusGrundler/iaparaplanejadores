begin;

create table public.aluno_etapas (
  email text not null
    references public.whitelist(email)
    on update cascade
    on delete cascade,
  etapa_key text not null,
  liberada boolean not null,
  atualizada_em timestamptz not null default now(),

  primary key (email, etapa_key),
  constraint aluno_etapas_email_normalizado
    check (email = lower(btrim(email))),
  constraint aluno_etapas_key_valida
    check (
      etapa_key in (
        'semana-0',
        'semana-1',
        'semana-2',
        'semana-3',
        'semana-4'
      )
    )
);

comment on table public.aluno_etapas is
  'Exceções individuais de liberação de etapas. A ausência faz o aluno herdar a configuração da turma.';
comment on column public.aluno_etapas.liberada is
  'true libera e false bloqueia para o aluno, sempre prevalecendo sobre a turma.';

-- A chave primária atende as consultas por aluno; este índice cobre auditorias
-- e operações administrativas que partem da etapa.
create index aluno_etapas_etapa_email_idx
  on public.aluno_etapas (etapa_key, email);

-- O log existente passa a guardar o alvo da ação administrativa. Sem isso,
-- seria possível saber que uma etapa mudou, mas não qual aluno foi afetado.
alter table public.eventos
  add column if not exists alvo text;
alter table public.eventos
  drop constraint if exists eventos_alvo_valido;
alter table public.eventos
  add constraint eventos_alvo_valido
  check (alvo is null or char_length(alvo) between 1 and 320)
  not valid;
alter table public.eventos validate constraint eventos_alvo_valido;

create index if not exists eventos_alvo_criado_idx
  on public.eventos (alvo, criado_em desc)
  where alvo is not null;

alter table public.aluno_etapas enable row level security;
revoke all on table public.aluno_etapas
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.aluno_etapas
  to service_role;

-- Precedência: exceção individual > configuração da turma > bloqueada.
-- A função continua privada e SECURITY DEFINER porque é usada pelas policies
-- das respostas, sem expor a tabela de configuração aos alunos.
create or replace function private.is_week_released(target_week text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_active_member())
    and coalesce(
      (
        select ae.liberada
        from public.aluno_etapas as ae
        where ae.email = lower(btrim(coalesce((select auth.jwt() ->> 'email'), '')))
          and ae.etapa_key = target_week
      ),
      (
        select ts.liberada
        from public.whitelist as w
        join public.turma_semanas as ts on ts.turma_id = w.turma_id
        where w.email = lower(btrim(coalesce((select auth.jwt() ->> 'email'), '')))
          and ts.semana_key = target_week
      ),
      false
    );
$$;

revoke all on function private.is_week_released(text)
  from public, anon;
grant execute on function private.is_week_released(text)
  to authenticated, service_role;

commit;
