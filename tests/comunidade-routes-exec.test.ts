import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, mock, test } from "node:test";
import { registrarHooksComunidade } from "./fixtures/comunidade-hooks";
import {
  definirRuntimeComunidade,
  type IdentidadeMock,
  type RuntimeComunidadeMock,
} from "./fixtures/comunidade-runtime.mock";

registrarHooksComunidade({ servidor: true, rotas: true });

const require = createRequire(import.meta.url);
const criar =
  require("../app/api/comunidade/publicacoes/route.ts") as typeof import("../app/api/comunidade/publicacoes/route");
const publicacao =
  require("../app/api/comunidade/publicacoes/[id]/route.ts") as typeof import("../app/api/comunidade/publicacoes/[id]/route");
const anexos =
  require("../app/api/comunidade/publicacoes/[id]/anexos/route.ts") as typeof import("../app/api/comunidade/publicacoes/[id]/anexos/route");

type Resultado = { data: unknown; error: null | { code?: string; message?: string } };

function banco(
  resultados: Resultado[] = [],
  upload: Resultado = {
    data: { signedUrl: "https://storage.test/upload", token: "assinatura" },
    error: null,
  },
) {
  const fila = [...resultados];
  const chamadas: Array<{ tabela: string; operacao: string; valor?: unknown }> = [];
  const proximo = () => {
    const resultado = fila.shift();
    if (!resultado) throw new Error("A rota fez uma consulta terminal não prevista pelo teste.");
    return resultado;
  };

  function consulta(tabela: string) {
    let operacao = "select";
    const api = {
      select() {
        return api;
      },
      eq() {
        return api;
      },
      limit() {
        return api;
      },
      insert(valor: unknown) {
        operacao = "insert";
        chamadas.push({ tabela, operacao, valor });
        return api;
      },
      update(valor: unknown) {
        operacao = "update";
        chamadas.push({ tabela, operacao, valor });
        return api;
      },
      delete() {
        operacao = "delete";
        chamadas.push({ tabela, operacao });
        return api;
      },
      async maybeSingle() {
        chamadas.push({ tabela, operacao: `${operacao}:single` });
        return proximo();
      },
      then(resolve: (valor: Resultado) => unknown, reject: (erro: unknown) => unknown) {
        chamadas.push({ tabela, operacao: `${operacao}:many` });
        return Promise.resolve(proximo()).then(resolve, reject);
      },
    };
    return api;
  }

  return {
    chamadas,
    from(tabela: string) {
      return consulta(tabela);
    },
    storage: {
      from(bucket: string) {
        assert.equal(bucket, "comunidade-anexos");
        return {
          async createSignedUploadUrl() {
            return upload;
          },
        };
      },
    },
  };
}

const identity: IdentidadeMock = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "aluno@example.com",
  admin: false,
};

function contexto(db: ReturnType<typeof banco>, parcial: Record<string, unknown> = {}) {
  return {
    db,
    identity,
    post: {
      id: 42,
      user_id: identity.userId,
      email: identity.email,
      texto: "Olá",
      conteudo_html: "<p>Olá</p>",
      publicado: false,
      ...parcial,
    },
  };
}

function requisicao(body: unknown, metodo = "POST") {
  return new Request("http://local.test/api/comunidade", {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function parametros() {
  return { params: Promise.resolve({ id: "42" }) };
}

function publicar(body: unknown = {}) {
  return publicacao.PATCH(requisicao(body, "PATCH") as never, parametros());
}

function excluirPublicacao() {
  return publicacao.DELETE(requisicao({}, "DELETE") as never, parametros());
}

const ANEXO_VALIDO = { nome: "x.png", mime: "image/png", bytes: 8 };

function adicionarAnexo(body: unknown = ANEXO_VALIDO) {
  return anexos.POST(requisicao(body) as never, parametros());
}

function confirmarAnexo(path: string) {
  return anexos.PUT(requisicao({ path }, "PUT") as never, parametros());
}

function excluirAnexo(path: string) {
  return anexos.DELETE(requisicao({ path }, "DELETE") as never, parametros());
}

async function corpo(resposta: Response) {
  return (await resposta.json()) as Record<string, unknown>;
}

function runtime(parcial: RuntimeComunidadeMock = {}) {
  definirRuntimeComunidade({ identity, ...parcial });
}

afterEach(() => mock.restoreAll());

test("POST cria rascunho real, limpa expirados e cobre recusas de entrada e banco", async () => {
  runtime({ identity: null });
  let resposta = await criar.POST(requisicao({ html: "oi" }) as never);
  assert.equal(resposta.status, 403);

  runtime();
  resposta = await criar.POST(requisicao("{") as never);
  assert.equal(resposta.status, 400);

  resposta = await criar.POST(requisicao({ html: null }) as never);
  assert.equal(resposta.status, 400);

  mock.method(console, "error", () => undefined);
  const dbFalhaNome = banco([{ data: null, error: { code: "DB_NOME" } }]);
  runtime({ db: dbFalhaNome });
  resposta = await criar.POST(requisicao({ html: "<p>Olá</p>" }) as never);
  assert.equal(resposta.status, 500);

  const dbFalhaInsert = banco([
    { data: { nome: "Ana" }, error: null },
    { data: null, error: { code: "DB_INSERT" } },
  ]);
  runtime({ db: dbFalhaInsert });
  resposta = await criar.POST(requisicao({ html: "<p>Olá</p>" }) as never);
  assert.equal(resposta.status, 500);

  const dbOk = banco([
    { data: { nome: "Ana" }, error: null },
    { data: { id: 42 }, error: null },
  ]);
  const estado: RuntimeComunidadeMock = { identity, db: dbOk };
  definirRuntimeComunidade(estado);
  resposta = await criar.POST(requisicao({ html: "<h2>Olá</h2>" }) as never);
  assert.equal(resposta.status, 200);
  assert.deepEqual(await corpo(resposta), { ok: true, id: "42" });
  assert.equal(estado.limpezas, 1);
  assert.deepEqual(
    dbOk.chamadas.find((chamada) => chamada.tabela === "posts" && chamada.operacao === "insert")
      ?.valor,
    {
      autor: "Ana",
      email: identity.email,
      user_id: identity.userId,
      texto: "Olá",
      conteudo_html: "<h2>Olá</h2>",
      publicado: false,
    },
  );
});

test("PATCH publica só conteúdo pronto e trata conflitos e erros reais", async () => {
  runtime({ contexto: { status: 404, erro: "Publicação não encontrada." } });
  let resposta = await publicar();
  assert.equal(resposta.status, 404);

  let db = banco();
  runtime({ contexto: contexto(db, { publicado: true }) });
  resposta = await publicar();
  assert.deepEqual(await corpo(resposta), { ok: true });

  db = banco([{ data: null, error: { code: "DB_ANEXO" } }]);
  runtime({ contexto: contexto(db) });
  mock.method(console, "error", () => undefined);
  resposta = await publicar();
  assert.equal(resposta.status, 500);

  db = banco([{ data: null, error: null }]);
  runtime({ contexto: contexto(db, { texto: "", conteudo_html: null }) });
  resposta = await publicar();
  assert.equal(resposta.status, 400);

  db = banco([
    { data: { id: "anexo" }, error: null },
    { data: null, error: { code: "23514" } },
  ]);
  runtime({ contexto: contexto(db) });
  resposta = await publicar();
  assert.equal(resposta.status, 400);

  db = banco([
    { data: { id: "anexo" }, error: null },
    { data: null, error: null },
  ]);
  runtime({ contexto: contexto(db) });
  resposta = await publicar();
  assert.equal(resposta.status, 409);

  db = banco([
    { data: null, error: null },
    { data: { id: 42 }, error: null },
  ]);
  const estado: RuntimeComunidadeMock = { identity, contexto: contexto(db) };
  definirRuntimeComunidade(estado);
  resposta = await publicar();
  assert.equal(resposta.status, 200);
  assert.deepEqual(estado.eventos, [{ email: identity.email, tipo: "post", ref: 42 }]);
  assert.deepEqual(estado.revalidacoes, ["/comunidade"]);
});

test("DELETE de publicação respeita rascunho, ausência e falha atômica", async () => {
  runtime({ contexto: { status: 403, erro: "Sem acesso." } });
  let resposta = await excluirPublicacao();
  assert.equal(resposta.status, 403);

  const db = banco();
  runtime({ contexto: contexto(db, { publicado: true }) });
  resposta = await excluirPublicacao();
  assert.equal(resposta.status, 409);

  runtime({ contexto: contexto(db), descarteRascunho: false });
  resposta = await excluirPublicacao();
  assert.equal(resposta.status, 500);

  runtime({ contexto: contexto(db), descarteRascunho: true });
  resposta = await excluirPublicacao();
  assert.deepEqual(await corpo(resposta), { ok: true });
});

test("POST de anexo valida contrato, limites e prepara URL assinada canônica", async () => {
  runtime({ contexto: { status: 403, erro: "Sem acesso." } });
  let resposta = await adicionarAnexo({});
  assert.equal(resposta.status, 403);

  let db = banco();
  runtime({ contexto: contexto(db, { publicado: true }) });
  resposta = await adicionarAnexo();
  assert.equal(resposta.status, 409);

  runtime({ contexto: contexto(db, { user_id: null }) });
  resposta = await adicionarAnexo();
  assert.equal(resposta.status, 409);

  runtime({ contexto: contexto(db) });
  resposta = await adicionarAnexo({
    nome: "x.exe",
    mime: "application/x-msdownload",
    bytes: 8,
  });
  assert.equal(resposta.status, 415);

  db = banco([{ data: Array.from({ length: 10 }, () => ({ bytes: 1 })), error: null }]);
  runtime({ contexto: contexto(db) });
  resposta = await adicionarAnexo();
  assert.equal(resposta.status, 400);

  db = banco([{ data: [{ bytes: 200 * 1024 * 1024 }], error: null }]);
  runtime({ contexto: contexto(db) });
  resposta = await adicionarAnexo();
  assert.equal(resposta.status, 400);

  mock.method(console, "error", () => undefined);
  db = banco([{ data: null, error: { code: "DB_LISTA" } }]);
  runtime({ contexto: contexto(db) });
  resposta = await adicionarAnexo();
  assert.equal(resposta.status, 500);

  db = banco([
    { data: [], error: null },
    { data: null, error: null },
  ]);
  runtime({ contexto: contexto(db) });
  resposta = await adicionarAnexo({ nome: "foto.jpg", mime: "image/jpg", bytes: 8 });
  assert.equal(resposta.status, 200);
  const payload = await corpo(resposta);
  assert.equal(payload.ok, true);
  assert.equal(payload.mime, "image/jpeg");
  assert.equal(payload.tipo, "imagem");
  assert.equal(payload.token, "assinatura");
  assert.match(String(payload.path), new RegExp(`^${identity.userId}/42/.+\\.jpg$`));
});

test("POST de anexo descarta metadado quando assinatura falha", async () => {
  mock.method(console, "error", () => undefined);
  const db = banco(
    [
      { data: [], error: null },
      { data: null, error: null },
    ],
    { data: null, error: { message: "storage fora" } },
  );
  const estado: RuntimeComunidadeMock = { identity, contexto: contexto(db) };
  definirRuntimeComunidade(estado);
  const resposta = await adicionarAnexo({ nome: "foto.png", mime: "image/png", bytes: 8 });
  assert.equal(resposta.status, 500);
});

test("PUT confirma anexo pronto e diferencia inválido, técnico, ausente e corrida", async () => {
  let db = banco([{ data: null, error: null }]);
  runtime({ contexto: contexto(db) });
  let resposta = await confirmarAnexo("x");
  assert.equal(resposta.status, 404);

  const anexo = { id: "a", file: "u/42/a.png", mime: "image/png", bytes: 8, status: "pendente" };
  db = banco([{ data: anexo, error: null }]);
  runtime({
    contexto: contexto(db),
    validarObjeto: async () => ({ valido: false, erroTecnico: true }),
  });
  resposta = await confirmarAnexo(anexo.file);
  assert.equal(resposta.status, 503);

  db = banco([{ data: anexo, error: null }]);
  runtime({
    contexto: contexto(db),
    validarObjeto: async () => ({ valido: false, erroTecnico: false }),
  });
  resposta = await confirmarAnexo(anexo.file);
  assert.equal(resposta.status, 415);

  db = banco([{ data: { ...anexo, status: "pronto" }, error: null }]);
  runtime({ contexto: contexto(db) });
  resposta = await confirmarAnexo(anexo.file);
  assert.deepEqual(await corpo(resposta), { ok: true });

  mock.method(console, "error", () => undefined);
  db = banco([
    { data: anexo, error: null },
    { data: null, error: { code: "DB_UPDATE" } },
  ]);
  runtime({ contexto: contexto(db), validarObjeto: async () => ({ valido: true }) });
  resposta = await confirmarAnexo(anexo.file);
  assert.equal(resposta.status, 500);

  db = banco([
    { data: anexo, error: null },
    { data: { id: anexo.id }, error: null },
  ]);
  runtime({ contexto: contexto(db), validarObjeto: async () => ({ valido: true }) });
  resposta = await confirmarAnexo(anexo.file);
  assert.deepEqual(await corpo(resposta), { ok: true });
});

test("DELETE de anexo passa pela exclusão atômica e reporta corrida", async () => {
  const anexo = { id: "a", file: "u/42/a.png" };
  let db = banco([{ data: null, error: { code: "DB" } }]);
  runtime({ contexto: contexto(db) });
  mock.method(console, "error", () => undefined);
  let resposta = await excluirAnexo(anexo.file);
  assert.equal(resposta.status, 500);

  db = banco([{ data: null, error: null }]);
  runtime({ contexto: contexto(db) });
  resposta = await excluirAnexo(anexo.file);
  assert.equal(resposta.status, 404);

  db = banco([{ data: anexo, error: null }]);
  runtime({ contexto: contexto(db), descarteAnexo: "erro" });
  resposta = await excluirAnexo(anexo.file);
  assert.equal(resposta.status, 500);

  db = banco([{ data: anexo, error: null }]);
  runtime({ contexto: contexto(db), descarteAnexo: "ausente" });
  resposta = await excluirAnexo(anexo.file);
  assert.equal(resposta.status, 404);

  db = banco([{ data: anexo, error: null }]);
  runtime({ contexto: contexto(db), descarteAnexo: "removido" });
  resposta = await excluirAnexo(anexo.file);
  assert.deepEqual(await corpo(resposta), { ok: true });
});
