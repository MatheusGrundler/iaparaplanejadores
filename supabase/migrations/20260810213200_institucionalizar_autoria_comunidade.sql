-- Padroniza publicações administrativas antigas com a autoria institucional.

begin;

update public.posts
set autor = 'Equipe IA para Planejadores'
where lower(btrim(autor)) = 'matheus';

commit;
