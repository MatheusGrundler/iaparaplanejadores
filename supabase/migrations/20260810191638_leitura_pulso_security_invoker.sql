-- A RPC é chamada exclusivamente com service_role e não precisa herdar os
-- privilégios do proprietário da função.

begin;

create or replace function public.leitura_pulso(
  p_download_id bigint,
  p_email text,
  p_segundos integer
) returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.leituras as l (download_id, email, segundos, ultimo_acesso)
  values (p_download_id, lower(btrim(p_email)), greatest(coalesce(p_segundos, 0), 0), now())
  on conflict (download_id, email) do update
    set segundos = l.segundos + greatest(coalesce(p_segundos, 0), 0),
        ultimo_acesso = now();
$$;

revoke all on function public.leitura_pulso(bigint, text, integer)
  from public, anon, authenticated;
grant execute on function public.leitura_pulso(bigint, text, integer)
  to service_role;

commit;
