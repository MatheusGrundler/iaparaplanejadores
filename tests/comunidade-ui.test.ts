import assert from "node:assert/strict";
import test from "node:test";
import { fonteRepositorio as fonte } from "./fixtures/fonte-repositorio";

test("compositor rico aceita texto ou vários tipos de anexo com feedback acessível", async () => {
  const [composer, editor, estilos] = await Promise.all([
    fonte("app/(aluno)/comunidade/Composer.tsx"),
    fonte("app/componentes/EditorRico.tsx"),
    fonte("app/(aluno)/comunidade/comunidade.module.css"),
  ]);

  assert.match(composer, /<EditorRico/);
  assert.match(composer, /type="file"[\s\S]*multiple/);
  assert.match(composer, /image\/jpeg[\s\S]*video\/mp4[\s\S]*audio\/mpeg[\s\S]*application\/pdf/);
  assert.match(composer, /MAX_ANEXOS_COMUNIDADE/);
  assert.match(composer, /MAX_BYTES_COMUNIDADE/);
  assert.match(composer, /validarNovoAnexoComunidade/);
  assert.match(composer, /role="progressbar"/);
  assert.match(composer, /aria-live="polite"/);
  assert.match(composer, /Tentar novamente/);
  assert.doesNotMatch(composer, /para a turma|com a turma|da turma/i);

  assert.match(editor, /toggleHeading\(\{ level: 2 \}\)/);
  assert.match(editor, /toggleBlockquote/);
  assert.match(editor, /\.undo\(\)\.run\(\)/);
  assert.match(editor, /\.redo\(\)\.run\(\)/);
  assert.match(editor, /code: false/);
  assert.match(editor, /horizontalRule: false/);

  assert.doesNotMatch(estilos, /linear-gradient|radial-gradient|conic-gradient/);
  assert.match(estilos, /min-height: 44px/);
  assert.match(estilos, /\.conteudo blockquote[\s\S]*border-left: 3px solid var\(--lime\)/);
  assert.match(estilos, /@media \(max-width: 720px\)/);
  assert.match(estilos, /prefers-reduced-motion/);
});

test("upload usa PUT assinado até 6 MB e TUS direto e resumível acima disso", async () => {
  const composer = await fonte("app/(aluno)/comunidade/Composer.tsx");

  assert.match(composer, /const LIMITE_PUT = 6 \* 1024 \* 1024/);
  assert.match(composer, /anexo\.arquivo\.size > LIMITE_PUT/);
  assert.match(composer, /\.storage\.supabase\.co/);
  assert.match(composer, /\/storage\/v1\/upload\/resumable/);
  assert.match(composer, /chunkSize: LIMITE_PUT/);
  assert.match(composer, /uploadDataDuringCreation: true/);
  assert.match(composer, /headers: \{ "x-signature": token \}/);
  assert.match(composer, /bucketName: BUCKET_COMUNIDADE/);
  assert.match(composer, /contentType: mime/);
  assert.match(composer, /onShouldRetry/);
  assert.match(composer, /method: "PUT"[\s\S]*"Content-Type": mime/);
  assert.match(composer, /const mime = body\.mime \|\| mimeInformado/);
});

test("publicação segue rascunho, anexos, confirmação, publicação e limpeza em falha", async () => {
  const composer = await fonte("app/(aluno)/comunidade/Composer.tsx");

  assert.match(composer, /fetch\("\/api\/comunidade\/publicacoes", \{/);
  assert.match(composer, /body: JSON\.stringify\(\{ html:/);
  assert.match(composer, /`\/api\/comunidade\/publicacoes\/\$\{publicacaoId\}\/anexos`/);
  assert.match(composer, /nome: anexo\.arquivo\.name/);
  assert.match(composer, /body: JSON\.stringify\(\{ path: body\.path, mime, bytes:/);
  assert.match(composer, /method: "PATCH"/);
  assert.match(composer, /method: "DELETE"/);
  assert.match(composer, /Promise\.allSettled/);
  assert.match(composer, /router\.refresh\(\)/);
});

test("feed assina em lote somente anexos prontos e renderiza cada tipo", async () => {
  const [pagina, feed, config] = await Promise.all([
    fonte("app/(aluno)/comunidade/page.tsx"),
    fonte("app/(aluno)/comunidade/Feed.tsx"),
    fonte("next.config.ts"),
  ]);

  assert.match(pagina, /\.eq\("publicado", true\)/);
  assert.match(pagina, /\.from\("post_anexos"\)/);
  assert.match(pagina, /\.in\("post_id", ids\)/);
  assert.match(pagina, /\.eq\("status", "pronto"\)/);
  assert.match(pagina, /assinarAnexosComunidade/);
  assert.match(pagina, /createSignedUrls\(paths, expiresIn\)/);
  assert.match(pagina, /dangerouslySetInnerHTML/);
  assert.match(feed, /<img[\s\S]*<video[\s\S]*<audio/);
  assert.match(feed, />\s*Abrir\s*</);
  assert.match(feed, />\s*Baixar\s*</);
  assert.match(feed, /download=\{anexo\.nome_original\}/);
  assert.match(config, /media-src 'self' blob: https:\/\/\*\.supabase\.co/);
});
