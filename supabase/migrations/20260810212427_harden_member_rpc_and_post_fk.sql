begin;

-- A comunidade é server-only; as policies legadas deixaram de participar do
-- fluxo e mantinham uma função SECURITY DEFINER exposta como RPC pública.
drop policy if exists "membros leem posts" on public.posts;
drop policy if exists "membros publicam posts" on public.posts;

-- Downloads permanecem disponíveis a membros autenticados, mas apenas para
-- leitura e pela função equivalente no schema privado, que não vira endpoint.
drop policy if exists "membros leem downloads" on public.downloads;
create policy "membros leem downloads"
on public.downloads
for select
to authenticated
using ((select private.is_active_member()));

revoke all on table public.downloads from public, anon, authenticated;
grant select on table public.downloads to authenticated;

drop function if exists public.is_member();

-- Cobre integralmente a FK composta usada ao apagar ou atualizar o pai.
create index if not exists post_anexos_post_user_idx
  on public.post_anexos (post_id, user_id);

commit;
