-- Catálogo versionado do construtor de formulários. O conteúdo das páginas
-- continua no código; somente schemas de formulário e respostas ficam no DB.

begin;

do $preconditions$
begin
  if to_regclass('public.quest_respostas') is null
     or to_regclass('public.quest_anexos') is null
     or to_regclass('public.curso_duvidas') is null then
    raise exception 'Pré-requisitos ausentes: tabelas de respostas do curso';
  end if;
end;
$preconditions$;

create table public.curso_formularios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  tipo text not null,
  etapa_key text not null,
  titulo text not null,
  descricao text not null default '',
  arquivado boolean not null default false,
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint curso_formularios_codigo_valido check (
    char_length(codigo) between 3 and 100
    and codigo ~ '^[a-z0-9][a-z0-9_-]*$'
  ),
  constraint curso_formularios_tipo_valido
    check (tipo in ('quest', 'duvida')),
  constraint curso_formularios_etapa_valida check (
    etapa_key in ('semana-0', 'semana-1', 'semana-2', 'semana-3', 'semana-4')
  ),
  constraint curso_formularios_titulo_valido
    check (char_length(titulo) between 1 and 180),
  constraint curso_formularios_descricao_valida
    check (char_length(descricao) <= 2000)
);

comment on table public.curso_formularios is
  'Identidade estável dos formulários incorporados por código nas páginas.';
comment on column public.curso_formularios.codigo is
  'Código usado no componente <Formulario codigo="..." />.';

create table public.curso_formulario_versoes (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null
    references public.curso_formularios(id) on delete restrict,
  numero integer not null,
  status text not null default 'rascunho',
  definicao jsonb not null,
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  publicado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  publicado_em timestamptz,
  arquivado_em timestamptz,

  constraint curso_formulario_versoes_numero_valido check (numero > 0),
  constraint curso_formulario_versoes_status_valido
    check (status in ('rascunho', 'publicado', 'arquivado')),
  constraint curso_formulario_versoes_definicao_objeto
    check (jsonb_typeof(definicao) = 'object'),
  constraint curso_formulario_versoes_definicao_tamanho
    check (octet_length(definicao::text) <= 524288),
  constraint curso_formulario_versoes_datas_coerentes check (
    (
      status = 'rascunho'
      and publicado_em is null
      and arquivado_em is null
    )
    or (
      status = 'publicado'
      and publicado_em is not null
      and arquivado_em is null
    )
    or (
      status = 'arquivado'
      and publicado_em is not null
      and arquivado_em is not null
    )
  ),
  constraint curso_formulario_versoes_formulario_numero_unique
    unique (formulario_id, numero)
);

comment on table public.curso_formulario_versoes is
  'Schemas imutáveis depois de publicados; respostas podem apontar a versão exata.';

create index curso_formularios_etapa_idx
  on public.curso_formularios (etapa_key, tipo, arquivado, codigo);
create index curso_formulario_versoes_biblioteca_idx
  on public.curso_formulario_versoes (formulario_id, numero desc);
create index curso_formulario_versoes_publicadas_idx
  on public.curso_formulario_versoes (formulario_id, numero desc)
  where status = 'publicado';
create unique index curso_formulario_versoes_uma_publicada_idx
  on public.curso_formulario_versoes (formulario_id)
  where status = 'publicado';

create or replace function private.validar_curso_formulario()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
     and (
       new.codigo is distinct from old.codigo
       or new.tipo is distinct from old.tipo
       or new.etapa_key is distinct from old.etapa_key
     ) then
    raise exception 'Código, tipo e etapa do formulário não podem ser alterados';
  end if;
  new.atualizado_em := now();
  return new;
end;
$function$;

revoke all on function private.validar_curso_formulario()
  from public, anon, authenticated;

create trigger curso_formularios_validar
before update on public.curso_formularios
for each row execute function private.validar_curso_formulario();

create or replace function private.validar_curso_formulario_versao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  formulario_codigo text;
  formulario_tipo text;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'Versões publicadas ou arquivadas não podem ser excluídas';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' and new.status = 'arquivado' then
    raise exception 'Uma versão nova não pode nascer arquivada';
  end if;

  if tg_op = 'UPDATE' then
    if old.status <> 'rascunho' and (
      (new.definicao - 'publicacao') is distinct from (old.definicao - 'publicacao')
      or new.formulario_id is distinct from old.formulario_id
      or new.numero is distinct from old.numero
      or new.criado_por is distinct from old.criado_por
      or new.criado_em is distinct from old.criado_em
      or new.publicado_por is distinct from old.publicado_por
      or new.publicado_em is distinct from old.publicado_em
      or (
        old.status = 'arquivado'
        and new.arquivado_em is distinct from old.arquivado_em
      )
    ) then
      raise exception 'Versões publicadas ou arquivadas são imutáveis';
    end if;

    if old.status = 'publicado'
       and new.status not in ('publicado', 'arquivado') then
      raise exception 'Uma versão publicada só pode ser arquivada';
    end if;
    if old.status = 'arquivado' and new.status <> 'arquivado' then
      raise exception 'Uma versão arquivada não pode ser reaberta';
    end if;
    if old.status = 'rascunho' and new.status = 'arquivado' then
      raise exception 'Um rascunho não pode ser arquivado antes de ser publicado';
    end if;
  end if;

  select f.codigo, f.tipo
    into formulario_codigo, formulario_tipo
  from public.curso_formularios as f
  where f.id = new.formulario_id;

  if formulario_codigo is null
     or new.definicao ->> 'codigo' is distinct from formulario_codigo
     or new.definicao ->> 'publicacao' is distinct from new.status
     or new.definicao #>> '{workflow,tipo}' is distinct from formulario_tipo
     or not coalesce(new.definicao ->> 'versao', '') ~ '^[0-9]+$'
     or (new.definicao ->> 'versao')::integer <> new.numero
     or new.definicao ->> 'schemaVersion' is distinct from '1' then
    raise exception 'A definição não corresponde à identidade, versão ou status do formulário'
      using errcode = '23514';
  end if;

  new.atualizado_em := now();
  if new.status = 'rascunho' then
    new.publicado_em := null;
    new.arquivado_em := null;
  elsif new.status = 'publicado' then
    new.publicado_em := coalesce(new.publicado_em, now());
    new.arquivado_em := null;
  else
    new.arquivado_em := coalesce(new.arquivado_em, now());
  end if;

  return new;
end;
$function$;

revoke all on function private.validar_curso_formulario_versao()
  from public, anon, authenticated;

create trigger curso_formulario_versoes_validar
before insert or update or delete on public.curso_formulario_versoes
for each row execute function private.validar_curso_formulario_versao();

-- A RPC pública server-only é criada ao fim da cadeia, depois de todos os
-- guards privados dos formulários.

alter table public.quest_respostas
  add column formulario_versao_id uuid
  references public.curso_formulario_versoes(id) on delete restrict;

alter table public.quest_respostas
  drop constraint quest_respostas_quest_key_valida,
  add constraint quest_respostas_quest_key_valida check (
    char_length(quest_key) between 3 and 100
    and quest_key ~ '^[a-z0-9][a-z0-9_-]*$'
  );

alter table public.quest_anexos
  drop constraint quest_anexos_quest_key_valida,
  add constraint quest_anexos_quest_key_valida check (
    char_length(quest_key) between 3 and 100
    and quest_key ~ '^[a-z0-9][a-z0-9_-]*$'
  );

alter table public.quest_anexos
  drop constraint quest_anexos_campo_valido,
  add constraint quest_anexos_campo_valido check (
    char_length(campo) between 1 and 100
    and campo ~ '^[a-z0-9][a-z0-9_-]*$'
  );

alter table public.quest_respostas
  drop constraint quest_respostas_json_tamanho,
  add constraint quest_respostas_json_tamanho
    check (octet_length(respostas::text) <= 50000);

alter table public.curso_duvidas
  add column formulario_codigo text,
  add column formulario_versao_id uuid
    references public.curso_formulario_versoes(id) on delete restrict,
  add column respostas jsonb not null default '{}'::jsonb,
  add column schema_version integer not null default 1,
  add constraint curso_duvidas_formulario_contexto_par check (
    formulario_versao_id is null or formulario_codigo is not null
  ),
  add constraint curso_duvidas_formulario_codigo_valido check (
    formulario_codigo is null
    or (
      char_length(formulario_codigo) between 3 and 100
      and formulario_codigo ~ '^[a-z0-9][a-z0-9_-]*$'
    )
  ),
  add constraint curso_duvidas_respostas_objeto
    check (jsonb_typeof(respostas) = 'object'),
  add constraint curso_duvidas_respostas_tamanho
    check (octet_length(respostas::text) <= 50000),
  add constraint curso_duvidas_schema_version_valida
    check (schema_version > 0);

create index quest_respostas_formulario_versao_idx
  on public.quest_respostas (formulario_versao_id, status, user_id);
create index curso_duvidas_formulario_versao_idx
  on public.curso_duvidas (formulario_versao_id, status, criada_em desc);

create or replace function private.guard_quest_formulario_versao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
     and old.formulario_versao_id is not null
     and new.formulario_versao_id is distinct from old.formulario_versao_id then
    raise exception 'A versão do formulário da resposta é imutável.'
      using errcode = '55000';
  end if;

  if new.formulario_versao_id is null then
    if not (
      (new.semana_key = 'semana-0' and new.quest_key in (
        'semana-0-preparacao',
        'semana-0-skill-relatorio',
        'quest-preparacao-agente',
        'quest-preparacao-skill'
      ))
      or (new.semana_key = 'semana-1' and new.quest_key in ('semana-1-quest', 'quest-etapa-1'))
      or (new.semana_key = 'semana-2' and new.quest_key in ('semana-2-quest', 'quest-etapa-2'))
      or (new.semana_key = 'semana-3' and new.quest_key in ('semana-3-quest', 'quest-etapa-3'))
      or (new.semana_key = 'semana-4' and new.quest_key in ('semana-4-quest', 'quest-etapa-4'))
    ) then
      raise exception 'Resposta fora do catálogo em código.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.curso_formulario_versoes as v
    join public.curso_formularios as f on f.id = v.formulario_id
    where v.id = new.formulario_versao_id
      and (
        v.status = 'publicado'
        or (
          tg_op = 'UPDATE'
          and old.formulario_versao_id = new.formulario_versao_id
          and v.status = 'arquivado'
        )
      )
      and f.codigo = new.quest_key
      and f.etapa_key = new.semana_key
      and f.tipo = 'quest'
      and not f.arquivado
  ) then
    raise exception 'Resposta fora da versão publicada do formulário.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_quest_formulario_versao()
  from public, anon, authenticated;

create trigger quest_respostas_guard_formulario
before insert or update of formulario_versao_id, semana_key, quest_key
on public.quest_respostas
for each row execute function private.guard_quest_formulario_versao();

create or replace function private.guard_duvida_formulario_versao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
     and old.formulario_versao_id is not null
     and (
       new.formulario_versao_id is distinct from old.formulario_versao_id
       or new.formulario_codigo is distinct from old.formulario_codigo
     ) then
    raise exception 'A versão do formulário da dúvida é imutável.'
      using errcode = '55000';
  end if;

  if new.formulario_versao_id is null then
    if new.formulario_codigo is not null and not (
      (new.semana_key = 'semana-0' and new.formulario_codigo = 'duvida-preparacao')
      or (new.semana_key = 'semana-1' and new.formulario_codigo = 'duvida-etapa-1')
      or (new.semana_key = 'semana-2' and new.formulario_codigo = 'duvida-etapa-2')
      or (new.semana_key = 'semana-3' and new.formulario_codigo = 'duvida-etapa-3')
      or (new.semana_key = 'semana-4' and new.formulario_codigo = 'duvida-etapa-4')
    ) then
      raise exception 'Dúvida fora do catálogo em código.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.curso_formulario_versoes as v
    join public.curso_formularios as f on f.id = v.formulario_id
    where v.id = new.formulario_versao_id
      and (
        v.status = 'publicado'
        or (
          tg_op = 'UPDATE'
          and old.formulario_versao_id = new.formulario_versao_id
          and v.status = 'arquivado'
        )
      )
      and f.codigo = new.formulario_codigo
      and f.etapa_key = new.semana_key
      and f.tipo = 'duvida'
      and not f.arquivado
  ) then
    raise exception 'Dúvida fora da versão publicada do formulário.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_duvida_formulario_versao()
  from public, anon, authenticated;

create trigger curso_duvidas_guard_formulario
before insert or update of formulario_codigo, formulario_versao_id, semana_key
on public.curso_duvidas
for each row execute function private.guard_duvida_formulario_versao();

-- O mesmo guard atende formulários ainda definidos no código e versões já
-- publicadas pelo construtor. Limites ausentes ou malformados falham fechados.
create or replace function private.guard_quest_anexo_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  alvo public.quest_anexos%rowtype;
  status_resposta text;
  formulario_versao uuid;
  limite integer;
  prontos integer;
begin
  if tg_op = 'DELETE' then
    alvo := old;
  else
    alvo := new;
  end if;

  if tg_op = 'UPDATE' then
    if row(
      new.resposta_id,
      new.user_id,
      new.semana_key,
      new.quest_key,
      new.campo,
      new.file,
      new.nome_original,
      new.mime_declarado,
      new.bytes_declarados,
      new.criado_em
    ) is distinct from row(
      old.resposta_id,
      old.user_id,
      old.semana_key,
      old.quest_key,
      old.campo,
      old.file,
      old.nome_original,
      old.mime_declarado,
      old.bytes_declarados,
      old.criado_em
    ) then
      raise exception 'O contexto do anexo é imutável.' using errcode = '55000';
    end if;

    if not (
      (old.status = 'pendente' and new.status in ('pendente', 'pronto', 'removido'))
      or (old.status = 'pronto' and new.status in ('pronto', 'removido'))
      or (old.status = 'removido' and new.status = 'removido')
    ) then
      raise exception 'Transição de anexo inválida.' using errcode = '55000';
    end if;
  end if;

  select qr.status, qr.formulario_versao_id
    into status_resposta, formulario_versao
    from public.quest_respostas as qr
   where qr.id = alvo.resposta_id
     and qr.user_id = alvo.user_id
     and qr.semana_key = alvo.semana_key
     and qr.quest_key = alvo.quest_key
   for update;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;
    raise exception 'Resposta da Quest não encontrada.' using errcode = '23503';
  end if;

  if status_resposta = 'revisada' then
    if not (
      tg_op = 'DELETE'
      and old.status in ('pendente', 'removido')
      and old.criado_em < now() - interval '3 hours'
    ) then
      raise exception 'Quest revisada não aceita alteração de anexos.'
        using errcode = '55000';
    end if;
  end if;

  limite := null;
  if formulario_versao is not null then
    select case
      when anexo.item ->> 'maximoArquivos' ~ '^[0-9]{1,2}$'
        then (anexo.item ->> 'maximoArquivos')::integer
      else null
    end
      into limite
      from public.curso_formulario_versoes as v
      cross join lateral jsonb_array_elements(
        coalesce(v.definicao -> 'anexos', '[]'::jsonb)
      ) as anexo(item)
     where v.id = formulario_versao
       and anexo.item ->> 'chave' = alvo.campo
     limit 1;
  else
    limite := case alvo.quest_key || ':' || alvo.campo
      when 'semana-1-quest:print_identidade' then 1
      when 'quest-etapa-1:print_identidade' then 1
      when 'semana-2-quest:landing' then 3
      when 'quest-etapa-2:landing' then 3
      when 'semana-2-quest:imagem_institucional' then 1
      when 'quest-etapa-2:imagem_institucional' then 1
      when 'semana-3-quest:evidencia_cron' then 2
      when 'quest-etapa-3:evidencia_cron' then 2
      when 'semana-4-quest:fluxo_n8n' then 3
      when 'quest-etapa-4:fluxo_n8n' then 3
      else 0
    end;
  end if;
  if limite is null or limite < 1 or limite > 20 then
    raise exception 'Campo de anexo fora do catálogo.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.status <> 'pronto' and new.status = 'pronto' then
    select count(*)::integer
      into prontos
      from public.quest_anexos as qa
     where qa.resposta_id = new.resposta_id
       and qa.campo = new.campo
       and qa.status = 'pronto'
       and qa.id <> new.id;
    if prontos >= limite then
      raise exception 'Limite de anexos atingido.' using errcode = '23514';
    end if;

    if status_resposta = 'enviada' then
      update public.quest_respostas
         set status = 'rascunho',
             enviada_em = null,
             revisada_em = null
       where id = new.resposta_id
         and status = 'enviada';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'pronto'
     and new.status = 'removido'
     and status_resposta = 'enviada' then
    update public.quest_respostas
       set status = 'rascunho',
           enviada_em = null,
           revisada_em = null
     where id = new.resposta_id
       and status = 'enviada';
  end if;

  if tg_op = 'DELETE' then
    if old.status not in ('pendente', 'removido')
       or old.criado_em >= now() - interval '3 hours' then
      raise exception 'Anexo ainda protegido pelo token de upload.'
        using errcode = '55000';
    end if;
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_quest_anexo_mutation()
  from public, anon, authenticated;

alter table public.curso_formularios enable row level security;
alter table public.curso_formulario_versoes enable row level security;

revoke all on table public.curso_formularios,
                    public.curso_formulario_versoes
  from public, anon, authenticated, service_role;
grant select, insert, update, delete
  on table public.curso_formularios,
           public.curso_formulario_versoes
  to service_role;

notify pgrst, 'reload schema';

commit;
