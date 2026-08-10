begin;

-- O Supabase pode aplicar privilégios padrão amplos a tabelas recém-criadas.
-- A aplicação precisa apenas de CRUD pelo cliente server-only: TRUNCATE,
-- REFERENCES e TRIGGER não fazem parte do contrato da chave interna.
revoke all on table public.posts from service_role;
revoke all on table public.post_anexos from service_role;
revoke all on table public.comunidade_storage_exclusoes from service_role;

grant select, insert, update, delete on table public.posts to service_role;
grant select, insert, update, delete on table public.post_anexos to service_role;
grant select, insert, update, delete on table public.comunidade_storage_exclusoes to service_role;

revoke all on sequence public.posts_id_seq from service_role;
grant usage, select on sequence public.posts_id_seq to service_role;

commit;
