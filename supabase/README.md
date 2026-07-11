# Banco da área de membros

`migrations/20260711195822_baseline_expected_schema.sql` descreve o esquema que o app espera, com RLS, privilégios mínimos e bucket privado.

## Projeto novo

1. Vincule o CLI: `npx supabase link --project-ref SEU_PROJECT_REF`.
2. Revise a migração e rode `npx supabase db push`.
3. Insira o primeiro administrador pelo SQL Editor, com e-mail minúsculo:
   `insert into public.admins (email) values ('voce@dominio.com');`

## Projeto que já está em produção

Não aplique a baseline por cima. Primeiro rode `npx supabase db pull`, compare o esquema remoto com a baseline e crie uma migração incremental. O projeto remoto atual não pôde ser auditado nesta revisão porque a conta Supabase conectada não tinha permissão para ele.

Depois de qualquer alteração, execute o Security Advisor e o Performance Advisor no painel e confira que o bucket `materiais` continua privado.
