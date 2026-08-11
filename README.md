# IA para Planejadores · site + área de membros (um projeto só)

App Next.js (App Router + TypeScript) que reúne TUDO num único deploy da Vercel:

- **Landing de vendas pública** na raiz `/` (anônimo vê `public/landing.html` via rewrite do middleware; o formulário registra o interesse, incluindo a opção de mentoria, e envia por SMTP/Mailtrap).
- **Área do aluno** na mesma raiz `/` depois do login, com trilha, Biblioteca de materiais e Comunidade rica com anexos.
- **Administração** em `/admin` (formulários, liberação das Etapas, alunos, materiais e entregas).

Pra editar a landing: mexe em `05 - Vendas e landing/landing.html` no projeto de conteúdo e copia pra `public/landing.html` aqui. A pasta `site/` do projeto de conteúdo (deploy estático antigo) ficou obsoleta com a fusão.

O backend é Supabase: login por link mágico, Postgres com RLS e Storage privado.

## Rodar local

1. Rode `npm ci`.
2. Copie `.env.example` para `.env.local` e preencha os valores do Supabase. Se também for testar o formulário público, configure as variáveis SMTP com uma conta própria de teste.
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

## Conteúdo no código e formulários incorporados

- As páginas de conteúdo são componentes TSX em `app/componentes/curso/conteudos/`. O registro `CONTEUDOS_NATIVOS` reúne metadados, componente e atividades de Preparação + Etapas 1–4.
- O conteúdo pode usar qualquer composição React/HTML. Não existe mais editor ou snapshot de conteúdo no banco.
- Quests e Dúvidas compartilham o mesmo renderer e são incorporadas em qualquer ponto da página com `<Formulario codigo="quest-etapa-1" />`.
- `/admin/formularios` cria rascunhos, campos, anexos e versões publicadas. A prévia usa o mesmo componente do aluno sem gravar dados.
- `/admin/semanas` define o padrão de cada turma e também exceções por aluno. Uma exceção individual pode liberar ou bloquear uma Etapa e sempre prevalece sobre a turma.
- As respostas, os anexos, as dúvidas e a versão exata do formulário enviado continuam no Supabase. Somente o conteúdo editorial voltou para o código.

## Materiais, anexos e comunidade

- Materiais publicados em `/admin/materiais` aparecem para o aluno em `/arquivo`, identificado na interface como **Biblioteca de materiais**. O menu principal mantém essa área sempre visível.
- Cards no modo **Leitura na plataforma** abrem HTML/PDF no leitor isolado; cards no modo **Download** passam pela rota privada que registra o evento e assina o arquivo por 60 segundos.
- Anexos configurados no construtor de formulários têm outro objetivo: recebem arquivos do aluno e aparecem para o administrador em **Entregas**. Eles não viram material público.
- A Comunidade aceita texto formatado, imagens, vídeos, áudios e documentos. Arquivos pequenos usam upload assinado; acima de 6 MB o envio é retomável e mostra progresso.
- O bucket `comunidade-anexos` é privado. O feed recebe somente URLs temporárias e só exibe anexos confirmados pelo servidor.

## Deploy na Vercel

1. Mantenha esta pasta em um repositório privado e importe-o na Vercel.
2. Use Node.js `>= 22` (LTS recomendado) e `npm ci` no build.
3. Configure as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` — somente no servidor
   - `NEXT_PUBLIC_SITE_URL` — domínio final em HTTPS, sem caminho
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` e `DESTINO_EMAIL` — necessários para o formulário público; consulte `.env.example` para o Mailtrap Sandbox
4. No Supabase, configure o domínio final como Site URL e permita exatamente `https://SEU-DOMINIO/auth/confirm` nas Redirect URLs.
5. Rode os Security e Performance Advisors do Supabase, teste um aluno ativo, um expirado, um e-mail ausente e um admin antes de liberar produção.

## Leitura no app (sem download)

- Cada card de material tem um `modo`: **leitura** (padrão) abre dentro do app; **download** continua sendo arquivo baixável (kits, zips).
- Material de leitura é servido inline por `/api/material/[id]` (HTML ou PDF do bucket privado, depois do gate de membro) e exibido no iframe de `/material/[id]`.
- O leitor registra em `leituras`: primeiro/último acesso, **tempo de tela** (pulsos de até 30 s enviados só com a aba visível, somados de forma atômica por `leitura_pulso`) e o **status marcado pelo aluno** — lido, entendido ou com dúvidas (com texto opcional da dúvida).
- O admin acompanha tudo em `/admin/leituras`: quem abriu, tempo, status e dúvidas por material.
- `/api/download/[id]` recusa materiais no modo leitura. Limite honesto: o HTML chega ao navegador do aluno, então "não baixável" significa sem botão e sem URL direta de arquivo, não impossibilidade técnica.
- Migração correspondente: `supabase/migrations/20260718192517_leitura_in_app.sql`.
- Os HTMLs de material devem ser single-file (scripts/estilos inline; Google Fonts permitido — ver CSP específica em `next.config.ts`).

## Como funciona o acesso

- **Whitelist**: quem está na lista entra; removeu, o acesso fecha na próxima verificação.
- **Expiração granular**: o prazo individual (`whitelist.expira_em`) prevalece sobre o prazo da turma (`turmas.acesso_ate`). Os dois vazios significam que não há prazo.
- **Downloads**: passam por `/api/download/[id]`, que verifica sessão e acesso, registra o evento e cria uma URL assinada de 60 segundos para o bucket privado `materiais`.
- **Admin**: e-mails na tabela `admins`. O `/admin` devolve 404 para quem não é administrador.
- A secret key só existe no servidor (Server Actions e Route Handlers), nunca no browser.
- Respostas de autenticação e páginas de sessão recebem headers `private, no-store`; cookies renovados são preservados até em redirects.
- O middleware usa claims verificadas, não confia em dados de sessão não validados.

## Limites conhecidos antes de produção

- O app ainda não tem suíte end-to-end nem monitoramento externo. O teste manual de login, expiração, upload e download continua obrigatório no ambiente de staging.
- A comunidade ainda não tem comentários, moderação em lote, exportação ou política formal de retenção de dados.

## Estrutura

```text
app/
  login/               e-mail + link mágico
  auth/confirm         troca o token do link por sessão e registra o login
  auth/signout         encerra a sessão
  (aluno)/             trilha, conteúdos, Biblioteca e comunidade, com gate de membro
  api/comunidade/      rascunhos, publicação e uploads privados da comunidade
  api/download/[id]    download com evento e URL assinada
  admin/               formulários, liberações e operação, com gate de admin
  componentes/curso/   páginas de conteúdo nativas + componente de incorporação
lib/formularios/       schema, validação, catálogo e adapters de persistência
lib/supabase/          clientes, chaves e variáveis de ambiente
lib/access.ts          regras puras e testáveis de e-mail/expiração
lib/auth.ts            memberStatus, isAdmin e eventos
middleware.ts          valida/renova sessão e protege o cache
supabase/              migração e instruções do banco
tests/                 testes automatizados das regras de acesso
```
