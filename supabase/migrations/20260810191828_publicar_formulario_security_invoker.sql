-- A publicação é server-only e roda com service_role; não precisa herdar os
-- privilégios do proprietário da função.

begin;

create or replace function public.publicar_curso_formulario_versao(
  target_versao uuid,
  actor uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  target_formulario uuid;
  target_status text;
begin
  select v.formulario_id
    into target_formulario
  from public.curso_formulario_versoes as v
  where v.id = target_versao;

  if target_formulario is null then
    raise exception 'Versão de formulário não encontrada';
  end if;

  -- A identidade-pai é o lock canônico. Duas publicações concorrentes do
  -- mesmo formulário sempre esperam na mesma linha, sem deadlock entre drafts.
  perform 1
  from public.curso_formularios as f
  where f.id = target_formulario
  for update;

  select v.status
    into target_status
  from public.curso_formulario_versoes as v
  where v.id = target_versao
    and v.formulario_id = target_formulario
  for update;

  if target_status is distinct from 'rascunho' then
    raise exception 'Somente um rascunho existente pode ser publicado';
  end if;

  perform 1
  from public.curso_formulario_versoes as v
  where v.formulario_id = target_formulario
  for update;

  update public.curso_formulario_versoes
  set
    status = 'arquivado',
    definicao = jsonb_set(definicao, '{publicacao}', '"arquivado"'::jsonb),
    atualizado_por = actor,
    arquivado_em = now()
  where formulario_id = target_formulario
    and status = 'publicado';

  update public.curso_formulario_versoes
  set
    status = 'publicado',
    definicao = jsonb_set(definicao, '{publicacao}', '"publicado"'::jsonb),
    atualizado_por = actor,
    publicado_por = actor,
    publicado_em = now(),
    arquivado_em = null
  where id = target_versao
    and status = 'rascunho';

  if not found then
    raise exception 'A versão mudou durante a publicação';
  end if;
end;
$function$;

revoke all on function public.publicar_curso_formulario_versao(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publicar_curso_formulario_versao(uuid, uuid)
  to service_role;

commit;
