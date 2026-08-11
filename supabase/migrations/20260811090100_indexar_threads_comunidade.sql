begin;

-- Cobrem as duas FKs que não participam da leitura principal do feed e evitam
-- varreduras em cascata quando uma resposta ou usuário é removido.
create index if not exists post_respostas_parent_post_idx
  on public.post_respostas (parent_id, post_id)
  where parent_id is not null;
create index if not exists post_respostas_user_idx
  on public.post_respostas (user_id);

commit;
