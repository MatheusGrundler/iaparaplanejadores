# Banco da área de membros

`migrations/20260710024610_schema_v2_area_de_membros.sql` inicia o esquema esperado, com RLS, privilégios mínimos e bucket privado. As migrations seguintes estão com as mesmas versões registradas no projeto remoto.

## Projeto novo

1. Vincule o CLI: `npx supabase link --project-ref SEU_PROJECT_REF`.
2. Revise a migração e rode `npx supabase db push`.
3. Insira o primeiro administrador pelo SQL Editor, com e-mail minúsculo:
   `insert into public.admins (email) values ('voce@dominio.com');`

## Projeto que já existe

Não aplique a baseline por cima. Primeiro rode `npx supabase migration list`, confirme que as versões coincidem e então use `npx supabase db push` somente para migrations novas.

O histórico remoto foi reconciliado em `20260810190210_reconciliar_historico_quests_e_anexos.sql`. No projeto remoto, a versão `20260810190311_remover_cms_conteudo.sql` removeu o antigo CMS preservando acesso, liberações, respostas, anexos, dúvidas, materiais e leituras. Na cadeia local ela é um marcador: a versão anterior do CMS também é um marcador, então bancos novos nunca criam esse estado transitório.

Depois de qualquer alteração, execute o Security Advisor e o Performance Advisor no painel e confira que o bucket `materiais` continua privado.
