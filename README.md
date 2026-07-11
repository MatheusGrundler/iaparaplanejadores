# Área de membros · IA para Planejadores

App Next.js (App Router + TypeScript) com área do aluno em `/` e administração em `/admin`. O backend é Supabase: login por link mágico, Postgres com RLS e Storage privado.

## Rodar local

1. Rode `npm ci`.
2. Copie `.env.example` para `.env.local` e preencha os quatro valores.
3. Rode `npm run dev` e abra <http://localhost:3000>.

Use preferencialmente as chaves atuais do Supabase (`sb_publishable_...` e `sb_secret_...`). Os nomes legados `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` continuam aceitos apenas para facilitar a migração. A secret key nunca pode receber o prefixo `NEXT_PUBLIC_`.

O login só envia link para um e-mail presente em `whitelist` ou `admins`, sem revelar na resposta pública se ele está cadastrado.

Antes de abrir um PR ou fazer deploy, rode:

```bash
npm run check
```

O comando valida tipos, testes e build de produção. O lockfile deve acompanhar o código.

## Banco

O esquema esperado está versionado em `supabase/migrations/`. Para um projeto novo, siga `supabase/README.md`. Se o projeto já existe, faça `supabase db pull` e gere uma migração incremental; não aplique a baseline por cima sem comparar o estado remoto.

## Deploy na Vercel

1. Mantenha esta pasta em um repositório privado e importe-o na Vercel.
2. Use Node.js LTS e `npm ci` no build.
3. Configure as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` — somente no servidor
   - `NEXT_PUBLIC_SITE_URL` — domínio final em HTTPS, sem caminho
4. No Supabase, configure o domínio final como Site URL e permita exatamente `https://SEU-DOMINIO/auth/confirm` nas Redirect URLs.
5. Rode os Security e Performance Advisors do Supabase, teste um aluno ativo, um expirado, um e-mail ausente e um admin antes de liberar produção.

## Como funciona o acesso

- **Whitelist**: quem está na lista entra; removeu, o acesso fecha na próxima verificação.
- **Expiração granular**: o prazo individual (`whitelist.expira_em`) prevalece sobre o prazo da turma (`turmas.acesso_ate`). Os dois vazios significam que não há prazo.
- **Downloads**: passam por `/api/download/[id]`, que verifica sessão e acesso, registra o evento e cria uma URL assinada de 60 segundos para o bucket privado `materiais`.
- **Admin**: e-mails na tabela `admins`. O `/admin` devolve 404 para quem não é administrador.
- A secret key só existe no servidor (Server Actions e Route Handlers), nunca no browser.
- Respostas de autenticação e páginas de sessão recebem headers `private, no-store`; cookies renovados são preservados até em redirects.
- O middleware usa claims verificadas, não confia em dados de sessão não validados.

## Limites conhecidos antes de produção

- A migração local representa o contrato esperado, mas o esquema remoto ainda precisa ser comparado e auditado com uma conta que tenha acesso ao projeto correto.
- O app ainda não tem suíte end-to-end nem monitoramento externo. O teste manual de login, expiração, upload e download continua obrigatório no ambiente de staging.
- A comunidade é simples e não substitui moderação, exportação ou política formal de retenção de dados.

## Estrutura

```text
app/
  login/               e-mail + link mágico
  auth/confirm         troca o token do link por sessão e registra o login
  auth/signout         encerra a sessão
  (aluno)/             conteúdos e comunidade, com gate de membro
  api/download/[id]    download com evento e URL assinada
  admin/               alunos, turmas e materiais, com gate de admin
lib/supabase/          clientes, chaves e variáveis de ambiente
lib/access.ts          regras puras e testáveis de e-mail/expiração
lib/auth.ts            memberStatus, isAdmin e eventos
middleware.ts          valida/renova sessão e protege o cache
supabase/              migração e instruções do banco
tests/                 testes automatizados das regras de acesso
```
