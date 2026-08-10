-- Currículo nativo da plataforma: Quests, anexos e dúvidas semanais.
-- Migration incremental; não substitui leituras/dúvidas dos materiais antigos.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;

do $preconditions$
begin
  if to_regclass('public.admins') is null then
    raise exception 'Pré-requisito ausente: public.admins';
  end if;

  if to_regclass('public.whitelist') is null then
    raise exception 'Pré-requisito ausente: public.whitelist';
  end if;

  if to_regclass('public.turmas') is null then
    raise exception 'Pré-requisito ausente: public.turmas';
  end if;
end;
$preconditions$;

-- O remoto anterior à baseline não possuía esta função apesar de as tabelas
-- de acesso já existirem. Criá-la aqui torna a migration incremental também
-- naquele estado, sem reexecutar a baseline destrutiva.
create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.whitelist as w
    left join public.turmas as t on t.id = w.turma_id
    where w.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and (
        coalesce(w.expira_em, t.acesso_ate) is null
        or coalesce(w.expira_em, t.acesso_ate) > now()
      )
  );
$function$;

revoke all on function private.is_active_member()
  from public, anon, authenticated;
grant execute on function private.is_active_member()
  to authenticated, service_role;

-- Compatibilidade com o modelo atual de admins, cuja fonte de verdade ainda é
-- o e-mail verificado do JWT. SECURITY DEFINER é necessário porque admins não é
-- exposta ao cliente; schema privado + search_path vazio limitam a superfície.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.admins as a
      where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    );
$function$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, service_role;

-- Atualiza somente a coluna de auditoria das respostas. SECURITY INVOKER não
-- concede privilégios além dos já presentes na operação que disparou o trigger.
create or replace function private.touch_quest_resposta_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.atualizado_em := now();
  return new;
end;
$function$;

revoke all on function private.touch_quest_resposta_atualizado_em()
  from public, anon, authenticated;
grant execute on function private.touch_quest_resposta_atualizado_em()
  to authenticated, service_role;

grant usage on schema private to authenticated, service_role;
grant usage on schema public to authenticated, service_role;

create table if not exists public.quest_respostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  semana_key text not null,
  quest_key text not null,
  respostas jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  status text not null default 'rascunho',
  enviada_em timestamptz,
  revisada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint quest_respostas_email_normalizado
    check (
      email = lower(btrim(email))
      and char_length(email) between 3 and 254
      and email like '%_@_%._%'
    ),
  constraint quest_respostas_semana_valida
    check (
      semana_key in (
        'semana-0',
        'semana-1',
        'semana-2',
        'semana-3',
        'semana-4'
      )
    ),
  constraint quest_respostas_quest_key_valida
    check (
      char_length(quest_key) between 2 and 100
      and quest_key ~ '^[a-z0-9][a-z0-9-]*$'
      and quest_key like (semana_key || '-%')
    ),
  constraint quest_respostas_json_objeto
    check (jsonb_typeof(respostas) = 'object'),
  constraint quest_respostas_json_tamanho
    check (octet_length(respostas::text) <= 32768),
  constraint quest_respostas_schema_version_valida
    check (schema_version > 0),
  constraint quest_respostas_status_valido
    check (status in ('rascunho', 'enviada', 'revisada')),
  constraint quest_respostas_status_datas_coerentes
    check (
      (status = 'rascunho' and enviada_em is null and revisada_em is null)
      or
      (status = 'enviada' and enviada_em is not null and revisada_em is null)
      or
      (status = 'revisada' and enviada_em is not null and revisada_em is not null)
    ),
  -- Necessária pelo onConflict usado na API.
  constraint quest_respostas_user_quest_unique
    unique (user_id, quest_key),
  -- Chave candidata dos anexos: garante dono, semana e Quest no mesmo FK.
  constraint quest_respostas_anexo_owner_unique
    unique (id, user_id, semana_key, quest_key)
);

comment on table public.quest_respostas is
  'Rascunhos, entregas e revisões das atividades do currículo novo.';
comment on column public.quest_respostas.user_id is
  'Dono canônico da resposta em auth.users; RLS compara com auth.uid().';
comment on column public.quest_respostas.email is
  'Snapshot normalizado do e-mail verificado para relatórios administrativos.';
comment on column public.quest_respostas.respostas is
  'Objeto validado pela definição da atividade em lib/curso-atividades.ts.';
comment on column public.quest_respostas.status is
  'Aluno controla rascunho/enviada; revisada é gravada pelo admin no servidor.';

create table if not exists public.quest_anexos (
  id uuid primary key default gen_random_uuid(),
  resposta_id uuid not null,
  user_id uuid not null,
  semana_key text not null,
  quest_key text not null,
  campo text not null,
  file text not null unique,
  nome_original text not null,
  mime_declarado text not null,
  bytes_declarados bigint not null,
  mime text,
  bytes bigint,
  status text not null default 'pendente',
  pronto_em timestamptz,
  criado_em timestamptz not null default now(),

  constraint quest_anexos_resposta_owner_fk
    foreign key (resposta_id, user_id, semana_key, quest_key)
    references public.quest_respostas(id, user_id, semana_key, quest_key)
    on delete cascade,
  constraint quest_anexos_semana_valida
    check (
      semana_key in (
        'semana-0',
        'semana-1',
        'semana-2',
        'semana-3',
        'semana-4'
      )
    ),
  constraint quest_anexos_quest_key_valida
    check (
      char_length(quest_key) between 2 and 100
      and quest_key ~ '^[a-z0-9][a-z0-9-]*$'
      and quest_key like (semana_key || '-%')
    ),
  constraint quest_anexos_campo_valido
    check (
      char_length(campo) between 1 and 80
      and campo ~ '^[a-z0-9][a-z0-9_]*$'
    ),
  constraint quest_anexos_file_valido
    check (
      char_length(file) between 75 and 1024
      and file like (user_id::text || '/' || resposta_id::text || '/%')
    ),
  constraint quest_anexos_nome_original_valido
    check (char_length(nome_original) between 1 and 255),
  constraint quest_anexos_mime_declarado_valido
    check (
      mime_declarado in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/json'
      )
    ),
  constraint quest_anexos_bytes_declarados_validos
    check (bytes_declarados between 1 and 10485760),
  constraint quest_anexos_mime_real_valido
    check (
      mime is null
      or mime in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/json'
      )
    ),
  constraint quest_anexos_bytes_reais_validos
    check (bytes is null or bytes between 1 and 10485760),
  constraint quest_anexos_status_valido
    check (status in ('pendente', 'pronto')),
  constraint quest_anexos_status_metadados_coerentes
    check (
      (
        status = 'pendente'
        and mime is null
        and bytes is null
        and pronto_em is null
      )
      or
      (
        status = 'pronto'
        and mime is not null
        and bytes is not null
        and pronto_em is not null
        and mime = mime_declarado
        and bytes = bytes_declarados
      )
    )
);

comment on table public.quest_anexos is
  'Metadados server-only dos arquivos enviados ao bucket privado quest-anexos.';
comment on column public.quest_anexos.file is
  'Caminho user_id/resposta_id/uuid.ext assinado pelo servidor.';
comment on column public.quest_anexos.mime_declarado is
  'MIME informado antes do upload; nunca basta para confirmar o arquivo.';
comment on column public.quest_anexos.mime is
  'MIME real obtido do Storage pelo servidor na confirmação.';
comment on column public.quest_anexos.status is
  'pendente antes do upload; pronto após conferir MIME e tamanho reais.';

create table if not exists public.curso_duvidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  semana_key text not null,
  pergunta text not null,
  resposta text,
  status text not null default 'aberta',
  respondida_por uuid references auth.users(id) on delete set null,
  respondida_em timestamptz,
  criada_em timestamptz not null default now(),

  constraint curso_duvidas_email_normalizado
    check (
      email = lower(btrim(email))
      and char_length(email) between 3 and 254
      and email like '%_@_%._%'
    ),
  constraint curso_duvidas_semana_valida
    check (
      semana_key in (
        'semana-0',
        'semana-1',
        'semana-2',
        'semana-3',
        'semana-4'
      )
    ),
  constraint curso_duvidas_pergunta_valida
    check (char_length(pergunta) between 5 and 4000),
  constraint curso_duvidas_resposta_valida
    check (resposta is null or char_length(resposta) between 2 and 5000),
  constraint curso_duvidas_status_valido
    check (status in ('aberta', 'respondida', 'arquivada')),
  constraint curso_duvidas_status_resposta_coerentes
    check (
      (
        status = 'aberta'
        and resposta is null
        and respondida_por is null
        and respondida_em is null
      )
      or
      (
        status = 'respondida'
        and resposta is not null
        and respondida_em is not null
      )
      or status = 'arquivada'
    ),
  constraint curso_duvidas_autor_resposta_coerente
    check (resposta is not null or respondida_por is null)
);

comment on table public.curso_duvidas is
  'Histórico de dúvidas semanais; cada envio cria uma linha independente.';
comment on column public.curso_duvidas.user_id is
  'Dono canônico da dúvida em auth.users; RLS compara com auth.uid().';
comment on column public.curso_duvidas.email is
  'Snapshot normalizado do e-mail verificado para a fila administrativa.';
comment on column public.curso_duvidas.resposta is
  'Resposta administrativa, gravada somente pelo servidor com service_role.';

create index if not exists quest_respostas_user_status_idx
  on public.quest_respostas (user_id, status, atualizado_em desc);
create index if not exists quest_respostas_semana_status_idx
  on public.quest_respostas (semana_key, status, atualizado_em desc);

create index if not exists quest_anexos_user_quest_campo_idx
  on public.quest_anexos (user_id, quest_key, campo, status);
create index if not exists quest_anexos_resposta_criado_idx
  on public.quest_anexos (resposta_id, criado_em);

create index if not exists curso_duvidas_user_semana_criada_idx
  on public.curso_duvidas (user_id, semana_key, criada_em desc);
create index if not exists curso_duvidas_status_criada_idx
  on public.curso_duvidas (status, criada_em desc);

drop trigger if exists quest_respostas_touch_atualizado_em
  on public.quest_respostas;
create trigger quest_respostas_touch_atualizado_em
before update on public.quest_respostas
for each row
execute function private.touch_quest_resposta_atualizado_em();

alter table public.quest_respostas enable row level security;
alter table public.quest_anexos enable row level security;
alter table public.curso_duvidas enable row level security;

-- Nenhuma tabela do currículo é pública. Grants para authenticated são apenas
-- os necessários às queries atuais; service_role recebe privilégios explícitos
-- porque projetos Supabase novos não garantem exposição automática à Data API.
revoke all on table public.quest_respostas from anon, authenticated;
revoke all on table public.quest_anexos from anon, authenticated;
revoke all on table public.curso_duvidas from anon, authenticated;

grant select on table public.quest_respostas to authenticated;
grant insert (
  user_id,
  email,
  semana_key,
  quest_key,
  respostas,
  schema_version,
  status,
  enviada_em
) on table public.quest_respostas to authenticated;
grant update (
  user_id,
  email,
  semana_key,
  quest_key,
  respostas,
  schema_version,
  status,
  enviada_em
) on table public.quest_respostas to authenticated;

-- O aluno só lê os próprios anexos. INSERT/UPDATE/DELETE são realizados por
-- Route Handlers com service_role depois de filtros explícitos de ownership.
grant select on table public.quest_anexos to authenticated;

grant select on table public.curso_duvidas to authenticated;
grant insert (
  user_id,
  email,
  semana_key,
  pergunta,
  status
) on table public.curso_duvidas to authenticated;

grant select, insert, update, delete
  on table public.quest_respostas,
           public.quest_anexos,
           public.curso_duvidas
  to service_role;

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
    and (select private.is_active_member())
  )
);

drop policy if exists quest_respostas_insert_owner_admin
  on public.quest_respostas;
create policy quest_respostas_insert_owner_admin
on public.quest_respostas
for insert
to authenticated
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and (select private.is_active_member())
    and status in ('rascunho', 'enviada')
    and revisada_em is null
  )
);

drop policy if exists quest_respostas_update_owner_admin
  on public.quest_respostas;
create policy quest_respostas_update_owner_admin
on public.quest_respostas
for update
to authenticated
using (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and (select private.is_active_member())
    and status in ('rascunho', 'enviada')
  )
)
with check (
  (select private.is_admin())
  or (
    (select auth.uid()) = user_id
    and email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and (select private.is_active_member())
    and status in ('rascunho', 'enviada')
    and revisada_em is null
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
    and (select private.is_active_member())
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
    and (select private.is_active_member())
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
    and (select private.is_active_member())
    and status = 'aberta'
    and resposta is null
    and respondida_por is null
    and respondida_em is null
  )
);

-- Bucket privado. Upload e confirmação usam URLs assinadas pelo servidor; não
-- são criadas policies em storage.objects para este bucket.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'quest-anexos',
  'quest-anexos',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/json'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
