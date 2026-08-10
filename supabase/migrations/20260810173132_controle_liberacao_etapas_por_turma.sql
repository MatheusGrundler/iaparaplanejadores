begin;

create table public.turma_semanas (
  turma_id bigint not null references public.turmas(id) on delete cascade,
  semana_key text not null,
  liberada boolean not null default false,
  liberada_em timestamptz,
  atualizada_em timestamptz not null default now(),

  primary key (turma_id, semana_key),
  constraint turma_semanas_key_valida
    check (
      semana_key in (
        'semana-0',
        'semana-1',
        'semana-2',
        'semana-3',
        'semana-4'
      )
    ),
  constraint turma_semanas_estado_coerente
    check (
      (liberada and liberada_em is not null)
      or (not liberada and liberada_em is null)
    )
);

comment on table public.turma_semanas is
  'Controle manual de liberação das etapas do curso por turma.';

create index turma_semanas_semana_idx
  on public.turma_semanas (semana_key, turma_id)
  where liberada;

-- Toda etapa nasce bloqueada. A abertura é sempre uma decisão explícita do admin.
insert into public.turma_semanas (
  turma_id,
  semana_key,
  liberada,
  liberada_em
)
select
  t.id,
  s.semana_key,
  false,
  null
from public.turmas as t
cross join (
  values
    ('semana-0'),
    ('semana-1'),
    ('semana-2'),
    ('semana-3'),
    ('semana-4')
) as s(semana_key)
on conflict (turma_id, semana_key) do nothing;

-- Garante o mesmo conjunto ao criar turmas futuras.
create or replace function private.seed_turma_semanas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.turma_semanas (
    turma_id,
    semana_key,
    liberada,
    liberada_em
  )
  values
    (new.id, 'semana-0', false, null),
    (new.id, 'semana-1', false, null),
    (new.id, 'semana-2', false, null),
    (new.id, 'semana-3', false, null),
    (new.id, 'semana-4', false, null);
  return new;
end;
$$;

revoke all on function private.seed_turma_semanas()
  from public, anon, authenticated;

create trigger turmas_seed_semanas
after insert on public.turmas
for each row execute function private.seed_turma_semanas();

create or replace function private.is_week_released(target_week text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_active_member())
    and exists (
      select 1
      from public.whitelist as w
      join public.turma_semanas as ts on ts.turma_id = w.turma_id
      where w.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        and ts.semana_key = target_week
        and ts.liberada
    );
$$;

revoke all on function private.is_week_released(text)
  from public, anon;
grant execute on function private.is_week_released(text)
  to authenticated, service_role;

alter table public.turma_semanas enable row level security;
revoke all on table public.turma_semanas
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.turma_semanas
  to service_role;

-- A tabela de configuração fica server-only. As policies das respostas usam
-- a função privada para impedir leitura/inserção direta em etapa bloqueada.
drop policy if exists quest_respostas_select_owner_admin
  on public.quest_respostas;
create policy quest_respostas_select_owner_admin
on public.quest_respostas
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and (select private.is_week_released(semana_key))
  )
);

drop policy if exists quest_anexos_select_owner_admin
  on public.quest_anexos;
create policy quest_anexos_select_owner_admin
on public.quest_anexos
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and (select private.is_week_released(semana_key))
  )
);

drop policy if exists curso_duvidas_select_owner_admin
  on public.curso_duvidas;
create policy curso_duvidas_select_owner_admin
on public.curso_duvidas
for select
to authenticated
using (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and (select private.is_week_released(semana_key))
  )
);

drop policy if exists curso_duvidas_insert_owner_admin
  on public.curso_duvidas;
create policy curso_duvidas_insert_owner_admin
on public.curso_duvidas
for insert
to authenticated
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and (select private.is_week_released(semana_key))
    and status = 'aberta'
    and resposta is null
    and respondida_por is null
    and respondida_em is null
  )
);

commit;
