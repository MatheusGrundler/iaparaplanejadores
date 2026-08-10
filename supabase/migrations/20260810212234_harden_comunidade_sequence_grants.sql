begin;

-- Sequências também recebem grants padrão no projeto hospedado. Usuários do
-- navegador não precisam consultar nem avançar o contador interno de posts.
revoke all on sequence public.posts_id_seq
  from public, anon, authenticated, service_role;
grant usage, select on sequence public.posts_id_seq to service_role;

commit;
