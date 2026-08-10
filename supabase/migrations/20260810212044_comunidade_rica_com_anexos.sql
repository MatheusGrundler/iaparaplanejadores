begin;

-- A comunidade continua sendo lida e escrita pelo servidor, depois dos gates
-- de membro/admin. O identificador do auth.users torna a autoria inequívoca
-- sem quebrar as publicações legadas, que continuam identificadas por e-mail.
alter table public.posts
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists conteudo_html text,
  add column if not exists publicado boolean not null default true;

alter table public.posts
  drop constraint if exists posts_texto_check;
alter table public.posts
  add constraint posts_texto_check
  check (char_length(texto) between 0 and 6000) not valid;
alter table public.posts validate constraint posts_texto_check;

alter table public.posts
  drop constraint if exists posts_conteudo_html_valido;
alter table public.posts
  add constraint posts_conteudo_html_valido
  check (conteudo_html is null or char_length(conteudo_html) between 1 and 50000)
  not valid;
alter table public.posts validate constraint posts_conteudo_html_valido;

alter table public.posts
  drop constraint if exists posts_owner_unique;
alter table public.posts
  add constraint posts_owner_unique unique (id, user_id);

create index if not exists posts_user_criado_idx
  on public.posts (user_id, created_at desc)
  where user_id is not null;
create index if not exists posts_rascunhos_expiracao_idx
  on public.posts (created_at)
  where not publicado;

create table if not exists public.post_anexos (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null,
  user_id uuid not null,
  file text not null unique,
  nome_original text not null,
  tipo text not null,
  mime text not null,
  bytes bigint not null,
  status text not null default 'pendente',
  pronto_em timestamptz,
  criado_em timestamptz not null default now(),

  constraint post_anexos_post_owner_fk
    foreign key (post_id, user_id)
    references public.posts(id, user_id)
    on delete cascade,
  constraint post_anexos_file_valido
    check (
      char_length(file) between 75 and 1024
      and file like (user_id::text || '/' || post_id::text || '/%')
    ),
  constraint post_anexos_nome_original_valido
    check (char_length(nome_original) between 1 and 255),
  constraint post_anexos_tipo_valido
    check (tipo in ('imagem', 'video', 'audio', 'documento')),
  constraint post_anexos_mime_valido
    check (
      mime in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'audio/mpeg',
        'audio/mp4',
        'audio/ogg',
        'audio/wav',
        'audio/webm',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
    ),
  constraint post_anexos_bytes_validos
    check (
      bytes between 1 and
        case tipo
          when 'imagem' then 10485760
          when 'video' then 104857600
          when 'audio' then 52428800
          when 'documento' then 26214400
        end
    ),
  constraint post_anexos_status_valido
    check (status in ('pendente', 'pronto')),
  constraint post_anexos_status_coerente
    check (
      (status = 'pendente' and pronto_em is null)
      or (status = 'pronto' and pronto_em is not null)
    )
);

comment on table public.post_anexos is
  'Metadados server-only dos arquivos enviados ao bucket privado comunidade-anexos.';
comment on column public.post_anexos.file is
  'Caminho imutável user_id/post_id/uuid.ext, criado antes da URL assinada.';
comment on column public.post_anexos.mime is
  'MIME declarado e depois conferido com os metadados e a assinatura do objeto.';
comment on column public.post_anexos.status is
  'pendente antes do upload; pronto somente depois da validação do Storage.';

create index if not exists post_anexos_post_status_criado_idx
  on public.post_anexos (post_id, status, criado_em);
create index if not exists post_anexos_user_criado_idx
  on public.post_anexos (user_id, criado_em desc);

create or replace function private.exigir_rascunho_para_mutar_post_anexo()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  pai record;
begin
  -- Em UPDATE que move o anexo, trava os dois pais em ordem estável. Assim
  -- não é possível retirar uma linha de uma publicação concluída e também
  -- evitamos deadlock entre duas movimentações em sentidos opostos.
  for pai in
    select p.id, p.publicado
    from public.posts as p
    where p.id in (
      case when tg_op = 'INSERT' then new.post_id else old.post_id end,
      case when tg_op = 'DELETE' then old.post_id else new.post_id end
    )
    order by p.id
    for update
  loop
    if pai.publicado then
      raise exception using
        errcode = '55000',
        message = 'Anexos de uma publicação concluída são imutáveis.';
    end if;
  end loop;

  -- No ON DELETE CASCADE o pai já pode estar invisível para o trigger do
  -- anexo. A exclusão deve continuar; INSERT/UPDATE sem pai continuam sendo
  -- recusados pela foreign key.

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.exigir_rascunho_para_mutar_post_anexo()
  from public, anon, authenticated;

drop trigger if exists post_anexos_00_exigir_rascunho on public.post_anexos;
create trigger post_anexos_00_exigir_rascunho
before insert or update or delete on public.post_anexos
for each row
execute function private.exigir_rascunho_para_mutar_post_anexo();

create or replace function private.validar_limites_post_anexo()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  quantidade integer;
  total_bytes bigint;
begin
  -- Serializa anexos concorrentes do mesmo post antes de contar.
  perform 1
  from public.posts as p
  where p.id = new.post_id
  for update;

  select count(*), coalesce(sum(a.bytes), 0)
    into quantidade, total_bytes
  from public.post_anexos as a
  where a.post_id = new.post_id
    and (tg_op = 'INSERT' or a.id <> new.id);

  if quantidade >= 10 then
    raise exception using
      errcode = '23514',
      message = 'Cada publicação aceita no máximo 10 anexos.';
  end if;

  if total_bytes + new.bytes > 209715200 then
    raise exception using
      errcode = '23514',
      message = 'Os anexos da publicação excedem 200 MB.';
  end if;

  return new;
end;
$$;

revoke all on function private.validar_limites_post_anexo() from public, anon, authenticated;

drop trigger if exists post_anexos_validar_limites on public.post_anexos;
create trigger post_anexos_validar_limites
before insert or update of post_id, bytes on public.post_anexos
for each row
execute function private.validar_limites_post_anexo();

create or replace function private.impedir_publicacao_vazia()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  texto_html text;
begin
  if not new.publicado then
    return new;
  end if;

  if exists (
    select 1
    from public.post_anexos as a
    where a.post_id = new.id
      and a.status <> 'pronto'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Todos os anexos precisam estar prontos antes da publicação.';
  end if;

  texto_html := btrim(
    regexp_replace(
      replace(replace(coalesce(new.conteudo_html, ''), '&nbsp;', ' '), '&#160;', ' '),
      '<[^>]*>',
      '',
      'g'
    )
  );

  if btrim(new.texto) = ''
     and texto_html = ''
     and not exists (
       select 1
       from public.post_anexos as a
       where a.post_id = new.id
         and a.status = 'pronto'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Uma publicação precisa de texto ou anexo pronto.';
  end if;

  return new;
end;
$$;

revoke all on function private.impedir_publicacao_vazia() from public, anon, authenticated;

drop trigger if exists posts_impedir_publicacao_vazia on public.posts;
create trigger posts_impedir_publicacao_vazia
before insert or update of publicado, texto, conteudo_html on public.posts
for each row
execute function private.impedir_publicacao_vazia();

create table if not exists public.comunidade_storage_exclusoes (
  file text primary key,
  tentativas integer not null default 0,
  criado_em timestamptz not null default now(),
  ultima_tentativa_em timestamptz,
  constraint comunidade_storage_exclusoes_file_valido
    check (char_length(file) between 1 and 1024),
  constraint comunidade_storage_exclusoes_tentativas_validas
    check (tentativas >= 0)
);

comment on table public.comunidade_storage_exclusoes is
  'Fila server-only para repetir exclusões do bucket privado após falhas transitórias.';

alter table public.comunidade_storage_exclusoes enable row level security;
revoke all on table public.comunidade_storage_exclusoes from public, anon, authenticated;
grant select, insert, update, delete on table public.comunidade_storage_exclusoes to service_role;
create index if not exists comunidade_storage_exclusoes_retry_idx
  on public.comunidade_storage_exclusoes (ultima_tentativa_em nulls first, criado_em);

create or replace function public.descartar_anexo_comunidade(
  p_post_id bigint,
  p_file text,
  p_apenas_pendente boolean default false
)
returns table(file text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  arquivo text;
begin
  -- Mantém a mesma ordem de lock da publicação: pai antes do anexo.
  perform 1
  from public.posts as p
  where p.id = p_post_id
    and not p.publicado
  for update;
  if not found then return; end if;

  select a.file
    into arquivo
  from public.post_anexos as a
  where a.post_id = p_post_id
    and a.file = p_file
    and (not p_apenas_pendente or a.status = 'pendente')
  for update;
  if not found then return; end if;

  insert into public.comunidade_storage_exclusoes (file)
  values (arquivo)
  on conflict on constraint comunidade_storage_exclusoes_pkey do nothing;

  delete from public.post_anexos as a
  where a.post_id = p_post_id
    and a.file = arquivo;

  return query select arquivo;
end;
$$;

revoke all on function public.descartar_anexo_comunidade(bigint, text, boolean)
  from public, anon, authenticated;
grant execute on function public.descartar_anexo_comunidade(bigint, text, boolean)
  to service_role;

create or replace function public.descartar_rascunho_comunidade(p_post_id bigint)
returns table(file text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  arquivos text[];
begin
  perform 1
  from public.posts as p
  where p.id = p_post_id
    and not p.publicado
  for update;

  if not found then return; end if;

  select coalesce(array_agg(a.file), array[]::text[])
    into arquivos
  from public.post_anexos as a
  where a.post_id = p_post_id;

  insert into public.comunidade_storage_exclusoes (file)
  select unnest(arquivos)
  on conflict on constraint comunidade_storage_exclusoes_pkey do nothing;

  delete from public.posts as p
  where p.id = p_post_id
    and not p.publicado;

  return query select unnest(arquivos);
end;
$$;

revoke all on function public.descartar_rascunho_comunidade(bigint)
  from public, anon, authenticated;
grant execute on function public.descartar_rascunho_comunidade(bigint) to service_role;

create or replace function public.limpar_rascunhos_comunidade_expirados(p_limite integer default 20)
returns table(file text)
language sql
security invoker
set search_path = ''
as $$
  with candidatos as materialized (
    select p.id
    from public.posts as p
    where not p.publicado
      and p.created_at < now() - interval '26 hours'
    order by p.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limite, 20), 100))
  ),
  arquivos as materialized (
    select a.post_id, a.file
    from public.post_anexos as a
    join candidatos as c on c.id = a.post_id
  ), deletados as (
    delete from public.posts as p
    using candidatos as c
    where p.id = c.id
      and not p.publicado
    returning p.id
  ), enfileirados as (
    insert into public.comunidade_storage_exclusoes (file)
    select a.file
    from arquivos as a
    join deletados as d on d.id = a.post_id
    on conflict on constraint comunidade_storage_exclusoes_pkey do nothing
    returning file
  )
  select e.file
  from enfileirados as e;
$$;

revoke all on function public.limpar_rascunhos_comunidade_expirados(integer)
  from public, anon, authenticated;
grant execute on function public.limpar_rascunhos_comunidade_expirados(integer) to service_role;

create or replace function public.reservar_exclusoes_storage_comunidade(p_limite integer default 100)
returns table(file text)
language sql
security invoker
set search_path = ''
as $$
  with candidatos as materialized (
    select e.file
    from public.comunidade_storage_exclusoes as e
    where e.ultima_tentativa_em is null
      or e.ultima_tentativa_em < now() - interval '5 minutes'
    order by e.criado_em
    for update skip locked
    limit greatest(1, least(coalesce(p_limite, 100), 500))
  ), reservados as (
    update public.comunidade_storage_exclusoes as e
    set tentativas = e.tentativas + 1,
        ultima_tentativa_em = now()
    from candidatos as c
    where e.file = c.file
    returning e.file
  )
  select r.file from reservados as r;
$$;

revoke all on function public.reservar_exclusoes_storage_comunidade(integer)
  from public, anon, authenticated;
grant execute on function public.reservar_exclusoes_storage_comunidade(integer)
  to service_role;

create or replace function public.concluir_exclusoes_storage_comunidade(p_files text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.comunidade_storage_exclusoes as e
  where e.file = any(coalesce(p_files, array[]::text[]));
$$;

revoke all on function public.concluir_exclusoes_storage_comunidade(text[])
  from public, anon, authenticated;
grant execute on function public.concluir_exclusoes_storage_comunidade(text[])
  to service_role;

alter table public.post_anexos enable row level security;
alter table public.posts enable row level security;

-- Tabelas da comunidade são deliberadamente server-only. A secret key passa
-- pelos gates da aplicação; anon/authenticated não recebem acesso direto.
revoke all on table public.posts from public, anon, authenticated;
revoke all on table public.post_anexos from public, anon, authenticated;
grant select, insert, update, delete on table public.posts to service_role;
grant select, insert, update, delete on table public.post_anexos to service_role;
grant usage, select on sequence public.posts_id_seq to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'comunidade-anexos',
  'comunidade-anexos',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
