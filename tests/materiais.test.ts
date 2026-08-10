import assert from "node:assert/strict";
import test from "node:test";
import { fonteRepositorio as fonte } from "./fixtures/fonte-repositorio";

test("biblioteca diferencia leitura na plataforma de arquivo para baixar", async () => {
  const pagina = await fonte("app/(aluno)/arquivo/BibliotecaMateriais.tsx");

  assert.match(pagina, /Biblioteca de materiais/);
  assert.match(pagina, /modo/);
  assert.match(pagina, /`\/material\/\$\{material\.id\}`/);
  assert.match(pagina, /`\/api\/download\/\$\{material\.id\}`/);
});

test("endpoints privados separam download de leitura dentro da plataforma", async () => {
  const [download, leitura] = await Promise.all([
    fonte("app/api/download/[id]/route.ts"),
    fonte("app/api/material/[id]/route.ts"),
  ]);

  assert.match(download, /card\.modo !== "download"/);
  assert.match(download, /createSignedUrl\(arquivo\.file, 60, OPCOES_DOWNLOAD_ASSINADO\)/);
  assert.match(download, /logEvento\(email, "download", downloadId\)/);
  assert.match(leitura, /card\.modo !== "leitura"/);
  assert.match(leitura, /"Content-Disposition": "inline"/);
  assert.match(leitura, /X-Content-Type-Options/);
});

test("material HTML roda isolado da sessão e mantém postMessage pelo iframe conhecido", async () => {
  const [leitor, config] = await Promise.all([
    fonte("app/(aluno)/material/[id]/Leitor.tsx"),
    fonte("next.config.ts"),
  ]);

  assert.match(leitor, /sandbox="allow-scripts allow-popups"/);
  assert.doesNotMatch(leitor, /allow-same-origin/);
  assert.match(leitor, /mensagemVeioDoMaterial\(e, iframeRef\.current\?\.contentWindow\)/);
  assert.match(config, /"sandbox allow-scripts allow-popups"/);
});

test("alias estável de material também despacha cards de download", async () => {
  const pagina = await fonte("app/(aluno)/material/[id]/page.tsx");
  const alias = await fonte("app/conteudos/[id]/route.ts");

  assert.match(alias, /`\/material\/\$\{downloadId\}`/);
  assert.match(pagina, /destino\.tipo === "download"/);
  assert.match(pagina, /redirect\(destino\.caminho\)/);
});
