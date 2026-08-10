-- Índices de apoio para as FKs de autoria do catálogo de formulários.
-- Evitam varreduras completas ao remover ou reconciliar usuários do Auth.

begin;

create index curso_formularios_criado_por_idx
  on public.curso_formularios (criado_por);
create index curso_formularios_atualizado_por_idx
  on public.curso_formularios (atualizado_por);

create index curso_formulario_versoes_criado_por_idx
  on public.curso_formulario_versoes (criado_por);
create index curso_formulario_versoes_atualizado_por_idx
  on public.curso_formulario_versoes (atualizado_por);
create index curso_formulario_versoes_publicado_por_idx
  on public.curso_formulario_versoes (publicado_por);

commit;
