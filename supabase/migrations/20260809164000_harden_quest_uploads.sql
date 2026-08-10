begin;

-- URLs de upload assinadas não podem ser revogadas. O tombstone mantém o
-- caminho rastreável até a expiração e só então permite apagar a linha.
alter table public.quest_anexos
  add column if not exists removido_em timestamptz;

alter table public.quest_anexos
  drop constraint if exists quest_anexos_status_valido;
alter table public.quest_anexos
  add constraint quest_anexos_status_valido
  check (status in ('pendente', 'pronto', 'removido'));

alter table public.quest_anexos
  drop constraint if exists quest_anexos_status_metadados_coerentes;
alter table public.quest_anexos
  add constraint quest_anexos_status_metadados_coerentes
  check (
    (
      status = 'pendente'
      and mime is null
      and bytes is null
      and pronto_em is null
      and removido_em is null
    )
    or
    (
      status = 'pronto'
      and mime is not null
      and bytes is not null
      and pronto_em is not null
      and removido_em is null
      and mime = mime_declarado
      and bytes = bytes_declarados
    )
    or
    (
      status = 'removido'
      and removido_em is not null
      and (
        (
          mime is null
          and bytes is null
          and pronto_em is null
        )
        or
        (
          mime is not null
          and bytes is not null
          and pronto_em is not null
          and mime = mime_declarado
          and bytes = bytes_declarados
        )
      )
    )
  );

comment on column public.quest_anexos.removido_em is
  'Tombstone: mantém o caminho rastreável até o token de upload expirar.';

create index if not exists quest_anexos_limpeza_idx
  on public.quest_anexos (user_id, quest_key, criado_em)
  where status in ('pendente', 'removido');

-- Respostas agora são gravadas exclusivamente pelas Route Handlers, que
-- validam o catálogo e os anexos obrigatórios antes de usar service_role.
revoke insert, update, delete on table public.quest_respostas from authenticated;
drop policy if exists quest_respostas_insert_owner_admin
  on public.quest_respostas;
drop policy if exists quest_respostas_update_owner_admin
  on public.quest_respostas;

create or replace function private.guard_quest_anexo_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  alvo public.quest_anexos%rowtype;
  status_resposta text;
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

  select qr.status
    into status_resposta
    from public.quest_respostas as qr
   where qr.id = alvo.resposta_id
     and qr.user_id = alvo.user_id
     and qr.semana_key = alvo.semana_key
     and qr.quest_key = alvo.quest_key
   for update;

  if not found then
    -- Permite o cascade quando a resposta-pai já está sendo removida.
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

  limite := case alvo.quest_key || ':' || alvo.campo
    when 'semana-1-quest:print_identidade' then 1
    when 'semana-2-quest:landing' then 3
    when 'semana-2-quest:imagem_institucional' then 1
    when 'semana-3-quest:evidencia_cron' then 2
    when 'semana-4-quest:fluxo_n8n' then 3
    else 0
  end;
  if limite = 0 then
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
$$;

revoke all on function private.guard_quest_anexo_mutation() from public;

drop trigger if exists guard_quest_anexo_mutation
  on public.quest_anexos;
create trigger guard_quest_anexo_mutation
before insert or update or delete
on public.quest_anexos
for each row execute function private.guard_quest_anexo_mutation();

commit;
