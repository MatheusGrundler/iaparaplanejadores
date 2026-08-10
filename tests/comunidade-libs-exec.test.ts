import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, mock, test } from "node:test";
import { registrarHooksComunidade } from "./fixtures/comunidade-hooks";
import { definirRuntimeComunidade, type IdentidadeMock } from "./fixtures/comunidade-runtime.mock";

registrarHooksComunidade({ servidor: true });

const require = createRequire(import.meta.url);
const anexos = require("../lib/comunidade-anexos.ts") as typeof import("../lib/comunidade-anexos");
const conteudo = require("../lib/comunidade.ts") as typeof import("../lib/comunidade");
const feed = require("../lib/comunidade-feed.ts") as typeof import("../lib/comunidade-feed");
const servidor =
  require("../lib/comunidade-server.ts") as typeof import("../lib/comunidade-server");
const storage =
  require("../lib/comunidade-storage.ts") as typeof import("../lib/comunidade-storage");

afterEach(() => mock.restoreAll());

function consultaPost(resultado: { data: unknown; error: unknown }) {
  const consulta = {
    select() {
      return consulta;
    },
    eq() {
      return consulta;
    },
    async maybeSingle() {
      return resultado;
    },
  };
  return {
    from(tabela: string) {
      assert.equal(tabela, "posts");
      return consulta;
    },
  };
}

function identidade(parcial: Partial<IdentidadeMock> = {}): IdentidadeMock {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    email: "aluno@example.com",
    admin: false,
    ...parcial,
  };
}

test("conteúdo rico é sanitizado e distingue vazio, limite e texto longo", () => {
  assert.deepEqual(conteudo.prepararConteudoComunidade(null), {
    erro: "Conteúdo inválido.",
  });
  assert.match(conteudo.prepararConteudoComunidade("x".repeat(50_001)).erro ?? "", /longo/);

  const vazio = conteudo.prepararConteudoComunidade("<p> </p>");
  assert.deepEqual(vazio, { conteudo: { html: null, texto: "" } });

  const seguro = conteudo.prepararConteudoComunidade(
    '<h2>Olá</h2><script>alert(1)</script><a href="javascript:alert(2)">link</a>',
  );
  if (!("conteudo" in seguro) || !seguro.conteudo) assert.fail(seguro.erro);
  assert.equal(seguro.conteudo.texto, "Olálink");
  assert.doesNotMatch(seguro.conteudo.html ?? "", /script|javascript/);

  const longo = conteudo.prepararConteudoComunidade(`<p>${"a".repeat(6_001)}</p>`);
  assert.match(longo.erro ?? "", /6\.000/);
});

test("helpers de anexo cobrem nomes, caminhos, tamanhos e todas as assinaturas aceitas", () => {
  assert.equal(anexos.normalizarMime(" Image/PNG; charset=x "), "image/png");
  assert.equal(anexos.regraDoMime("image/png")?.tipo, "imagem");
  assert.equal(anexos.regraDoMime("text/html"), null);
  assert.equal(anexos.resolverMimeComunidade("video/x-m4v", "x.m4v"), "video/mp4");
  assert.equal(anexos.resolverMimeComunidade("", "sem-extensao"), null);
  assert.equal(
    anexos.resolverMimeComunidade("application/octet-stream", "foto.jpeg"),
    "image/jpeg",
  );
  assert.deepEqual(anexos.validarNovoAnexoComunidade("image/png", 0, "x.png"), {
    erro: "O arquivo está vazio ou tem tamanho inválido.",
  });
  const formatoInvalido = anexos.validarNovoAnexoComunidade("text/html", 1, "x.html");
  if (!("erro" in formatoInvalido) || !formatoInvalido.erro) {
    assert.fail("O formato deveria ser recusado.");
  }
  assert.match(formatoInvalido.erro, /não é aceito/);
  assert.equal(anexos.nomeOriginalSeguro("  pasta/arquivo\u0000.pdf  "), "pasta_arquivo_.pdf");
  assert.equal(anexos.nomeOriginalSeguro("/".repeat(300)).length, 255);
  assert.equal(anexos.nomeOriginalSeguro("   "), "arquivo");
  assert.equal(
    anexos.caminhoAnexoComunidade("usuario", 42, "anexo", "pdf"),
    "usuario/42/anexo.pdf",
  );

  const bytes = (...valores: number[]) => Uint8Array.from(valores);
  const texto = (valor: string) => new TextEncoder().encode(valor);
  assert.equal(anexos.assinaturaComunidadeValida("image/jpeg", bytes(0xff, 0xd8, 0xff)), true);
  assert.equal(
    anexos.assinaturaComunidadeValida(
      "image/png",
      bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    ),
    true,
  );
  assert.equal(anexos.assinaturaComunidadeValida("image/webp", texto("RIFFxxxxWEBP")), true);
  assert.equal(anexos.assinaturaComunidadeValida("image/gif", texto("GIF87a")), true);
  assert.equal(anexos.assinaturaComunidadeValida("video/quicktime", texto("xxxxftypqt  ")), true);
  assert.equal(
    anexos.assinaturaComunidadeValida("video/webm", bytes(0x1a, 0x45, 0xdf, 0xa3)),
    true,
  );
  assert.equal(anexos.assinaturaComunidadeValida("audio/mpeg", texto("ID3")), true);
  assert.equal(anexos.assinaturaComunidadeValida("audio/ogg", texto("OggS")), true);
  assert.equal(anexos.assinaturaComunidadeValida("audio/wav", texto("RIFFxxxxWAVE")), true);
  assert.equal(
    anexos.assinaturaComunidadeValida(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes(0x50, 0x4b, 0x03, 0x04),
    ),
    true,
  );
  assert.equal(anexos.assinaturaComunidadeValida("text/csv", texto("a,b\n1,2")), true);
  assert.equal(anexos.assinaturaComunidadeValida("text/plain", bytes(0xc3, 0x28)), false);
  assert.equal(anexos.assinaturaComunidadeValida("application/zip", bytes(1, 2, 3)), false);
});

test("contexto de edição valida id, sessão, banco e autoria UUID ou legada", async () => {
  assert.equal(servidor.idPublicacaoValido("9"), 9);
  assert.equal(servidor.idPublicacaoValido("0"), null);
  assert.equal(servidor.idPublicacaoValido("1.2"), null);

  definirRuntimeComunidade({ identity: null });
  assert.deepEqual(await servidor.contextoPublicacaoEditavel("1"), {
    status: 403,
    erro: "Sem acesso.",
  });

  definirRuntimeComunidade({
    identity: identidade(),
    db: consultaPost({ data: null, error: { code: "DB" } }),
  });
  mock.method(console, "error", () => undefined);
  const falhaBanco = await servidor.contextoPublicacaoEditavel("1");
  if (!servidor.contextoFalhou(falhaBanco)) assert.fail("A consulta deveria falhar.");
  assert.equal(falhaBanco.status, 500);

  definirRuntimeComunidade({
    identity: identidade(),
    db: consultaPost({ data: null, error: null }),
  });
  const ausente = await servidor.contextoPublicacaoEditavel("1");
  if (!servidor.contextoFalhou(ausente)) assert.fail("O post deveria estar ausente.");
  assert.equal(ausente.status, 404);

  const post = {
    id: 1,
    user_id: "outro",
    email: "outro@example.com",
    texto: "oi",
    conteudo_html: "<p>oi</p>",
    publicado: false,
  };
  definirRuntimeComunidade({
    identity: identidade(),
    db: consultaPost({ data: post, error: null }),
  });
  const proibido = await servidor.contextoPublicacaoEditavel("1");
  if (!servidor.contextoFalhou(proibido)) assert.fail("O post deveria pertencer a outra pessoa.");
  assert.equal(proibido.status, 403);

  definirRuntimeComunidade({
    identity: identidade({ admin: true }),
    db: consultaPost({ data: post, error: null }),
  });
  const contextoAdmin = await servidor.contextoPublicacaoEditavel("1");
  assert.equal(servidor.contextoFalhou(contextoAdmin), false);

  definirRuntimeComunidade({
    identity: identidade(),
    db: consultaPost({
      data: { ...post, user_id: null, email: "aluno@example.com" },
      error: null,
    }),
  });
  assert.equal(servidor.contextoFalhou(await servidor.contextoPublicacaoEditavel("1")), false);
});

function dbStorage(opcoes: {
  info: { data: unknown; error: unknown };
  signed?: { data: unknown; error: unknown };
}) {
  return {
    storage: {
      from(bucket: string) {
        assert.equal(bucket, anexos.BUCKET_COMUNIDADE);
        return {
          async info() {
            return opcoes.info;
          },
          async createSignedUrl() {
            return (
              opcoes.signed ?? {
                data: { signedUrl: "https://storage.test/anexo" },
                error: null,
              }
            );
          },
        };
      },
    },
  };
}

test("validação do Storage falha fechada e confere metadado mais magic bytes", async () => {
  mock.method(console, "error", () => undefined);
  const validar = (
    db: ReturnType<typeof dbStorage>,
    caminho: string,
    mime: string,
    bytes: number,
  ) => storage.validarObjetoComunidade(db as never, caminho, mime, bytes);

  assert.deepEqual(
    await validar(
      dbStorage({ info: { data: null, error: { message: "fora" } } }),
      "x",
      "image/png",
      8,
    ),
    { valido: false, erroTecnico: true },
  );
  assert.deepEqual(
    await validar(
      dbStorage({
        info: { data: { size: 9, contentType: "image/png" }, error: null },
      }),
      "x",
      "image/png",
      8,
    ),
    { valido: false, erroTecnico: false },
  );
  assert.deepEqual(
    await validar(
      dbStorage({
        info: { data: { size: 8, contentType: "image/png" }, error: null },
        signed: { data: null, error: { message: "sem assinatura" } },
      }),
      "x",
      "image/png",
      8,
    ),
    { valido: false, erroTecnico: true },
  );

  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        status: 206,
      }),
  );
  const valido = await validar(
    dbStorage({
      info: {
        data: { metadata: { size: 8, mimetype: "image/png" } },
        error: null,
      },
    }),
    "x",
    "image/png",
    8,
  );
  assert.deepEqual(valido, { valido: true, erroTecnico: false });
  const primeiraChamada = fetchMock.mock.calls[0];
  assert.ok(primeiraChamada);
  const init = primeiraChamada.arguments[1];
  assert.equal(new Headers(init?.headers).get("Range"), "bytes=0-7");

  fetchMock.mock.mockImplementation(
    async () =>
      new Response(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        status: 206,
      }),
  );
  assert.deepEqual(
    await validar(
      dbStorage({
        info: { data: { size: 5_000, contentType: "image/png" }, error: null },
      }),
      "x",
      "image/png",
      5_000,
    ),
    { valido: true, erroTecnico: false },
  );
  const chamadaGrande = fetchMock.mock.calls.at(-1);
  assert.equal(new Headers(chamadaGrande?.arguments[1]?.headers).get("Range"), "bytes=0-4095");

  fetchMock.mock.mockImplementation(async () => new Response("não é png", { status: 200 }));
  assert.deepEqual(
    await validar(
      dbStorage({
        info: { data: { size: 8, contentType: "image/png" }, error: null },
      }),
      "x",
      "image/png",
      8,
    ),
    { valido: false, erroTecnico: false },
  );
});

test("validação do Storage não espera o cancelamento de uma stream aberta do Next", async () => {
  const cabecalho = new Uint8Array(4_096);
  cabecalho.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let cancelamentos = 0;
  let initCapturado: RequestInit | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(cabecalho);
    },
    cancel() {
      cancelamentos += 1;
      return new Promise<void>(() => undefined);
    },
  });

  mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    initCapturado = init;
    return new Response(stream, { status: 206 });
  });

  const expirou = Symbol("a validação ficou presa no cancelamento");
  const resultado = await Promise.race([
    storage.validarObjetoComunidade(
      dbStorage({
        info: { data: { size: 5_000, contentType: "image/png" }, error: null },
      }) as never,
      "video-com-cabecalho-png",
      "image/png",
      5_000,
    ),
    new Promise<typeof expirou>((resolve) => setImmediate(() => resolve(expirou))),
  ]);

  assert.notEqual(resultado, expirou);
  assert.deepEqual(resultado, { valido: true, erroTecnico: false });
  assert.equal(cancelamentos, 1);
  assert.equal(new Headers(initCapturado?.headers).get("Range"), "bytes=0-4095");
  assert.ok(initCapturado?.signal instanceof AbortSignal);
});

test("validação do Storage aborta leitura travada e retorna falha técnica", async () => {
  let dispararTimeout: (() => void) | undefined;
  let signalCapturado: AbortSignal | null | undefined;
  const setTimeoutMock = mock.method(globalThis, "setTimeout", ((
    callback: (...args: unknown[]) => void,
    atraso?: number,
  ) => {
    assert.equal(atraso, 15_000);
    dispararTimeout = () => callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout);
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (_url: string | URL | Request, init?: RequestInit) => {
      signalCapturado = init?.signal;
      assert.ok(signalCapturado);
      queueMicrotask(() => dispararTimeout?.());
      return await new Promise<Response>((_resolve, reject) => {
        signalCapturado?.addEventListener("abort", () => reject(signalCapturado?.reason), {
          once: true,
        });
      });
    },
  );

  const resultado = await storage.validarObjetoComunidade(
    dbStorage({
      info: { data: { size: 5_000, contentType: "image/png" }, error: null },
    }) as never,
    "leitura-travada.png",
    "image/png",
    5_000,
  );

  assert.deepEqual(resultado, { valido: false, erroTecnico: true });
  assert.equal(setTimeoutMock.mock.callCount(), 1);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(signalCapturado?.aborted, true);
  const init = fetchMock.mock.calls[0]?.arguments[1];
  assert.equal(new Headers(init?.headers).get("Range"), "bytes=0-4095");
});

function zipOoxmlMinimo(nomes: string[]) {
  const prefixo = new Uint8Array(30);
  prefixo.set([0x50, 0x4b, 0x03, 0x04]);
  const entradas = nomes.map((nome) => {
    const nomeBytes = new TextEncoder().encode(nome);
    const entrada = new Uint8Array(46 + nomeBytes.length);
    entrada.set([0x50, 0x4b, 0x01, 0x02]);
    new DataView(entrada.buffer).setUint16(28, nomeBytes.length, true);
    entrada.set(nomeBytes, 46);
    return entrada;
  });
  const tamanhoDiretorio = entradas.reduce((total, entrada) => total + entrada.length, 0);
  const fim = new Uint8Array(22);
  fim.set([0x50, 0x4b, 0x05, 0x06]);
  const view = new DataView(fim.buffer);
  view.setUint16(8, entradas.length, true);
  view.setUint16(10, entradas.length, true);
  view.setUint32(12, tamanhoDiretorio, true);
  view.setUint32(16, prefixo.length, true);

  const completo = new Uint8Array(prefixo.length + tamanhoDiretorio + fim.length);
  let cursor = 0;
  for (const parte of [prefixo, ...entradas, fim]) {
    completo.set(parte, cursor);
    cursor += parte.length;
  }
  return completo;
}

test("OOXML exige diretório central coerente, Content Types e raiz do formato", async () => {
  const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const docx = zipOoxmlMinimo(["[Content_Types].xml", "word/document.xml"]);
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (_url: string | URL | Request, init?: RequestInit) => {
      const range = new Headers(init?.headers).get("Range") ?? "";
      const correspondencia = /^bytes=(\d+)-(\d+)$/.exec(range);
      assert.ok(correspondencia);
      const inicio = Number(correspondencia[1]);
      const fim = Number(correspondencia[2]);
      return new Response(docx.slice(inicio, fim + 1), { status: 206 });
    },
  );
  const validar = (bytes: Uint8Array) =>
    storage.validarObjetoComunidade(
      dbStorage({
        info: { data: { size: bytes.length, contentType: mime }, error: null },
      }) as never,
      "arquivo.docx",
      mime,
      bytes.length,
    );

  assert.deepEqual(await validar(docx), { valido: true, erroTecnico: false });
  assert.equal(fetchMock.mock.callCount(), 2);

  const zipErrado = zipOoxmlMinimo(["[Content_Types].xml", "xl/workbook.xml"]);
  fetchMock.mock.mockImplementation(async (_url: string | URL | Request, init?: RequestInit) => {
    const range = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init?.headers).get("Range") ?? "");
    assert.ok(range);
    return new Response(zipErrado.slice(Number(range[1]), Number(range[2]) + 1), { status: 206 });
  });
  assert.deepEqual(await validar(zipErrado), {
    valido: false,
    erroTecnico: false,
  });

  const zipFalso = Uint8Array.from([0x50, 0x4b, 0x03, 0x04]);
  fetchMock.mock.mockImplementation(async () => new Response(zipFalso, { status: 206 }));
  assert.deepEqual(await validar(zipFalso), {
    valido: false,
    erroTecnico: false,
  });
});

function dbFila(opcoes: {
  respostas: Record<string, ResultadoRpc[]>;
  remocoes?: Array<{ error: null | { message: string } }>;
}) {
  const chamadas: string[] = [];
  const removidos: string[][] = [];
  return {
    chamadas,
    removidos,
    async rpc(nome: string) {
      chamadas.push(nome);
      const resposta = opcoes.respostas[nome]?.shift();
      if (!resposta) throw new Error(`RPC inesperado: ${nome}`);
      return resposta;
    },
    storage: {
      from(bucket: string) {
        assert.equal(bucket, anexos.BUCKET_COMUNIDADE);
        return {
          async remove(paths: string[]) {
            removidos.push(paths);
            return opcoes.remocoes?.shift() ?? { error: null };
          },
        };
      },
    },
  };
}

type ResultadoRpc = {
  data: Array<{ file: string | null }> | null;
  error: null | { code: string };
};

test("fila de Storage deduplica, confirma sucesso e preserva retry em falha", async () => {
  assert.deepEqual(
    servidor.caminhosRetornados([{ file: "a" }, { file: null }, { file: "a" }, { file: "b" }]),
    ["a", "b"],
  );

  let db = dbFila({
    respostas: {
      descartar_rascunho_comunidade: [{ data: [{ file: "a" }, { file: "a" }], error: null }],
      concluir_exclusoes_storage_comunidade: [{ data: null, error: null }],
    },
  });
  assert.equal(await servidor.descartarRascunhoComunidade(db as never, 7), true);
  assert.deepEqual(db.removidos, [["a"]]);
  assert.deepEqual(db.chamadas, [
    "descartar_rascunho_comunidade",
    "concluir_exclusoes_storage_comunidade",
  ]);

  mock.method(console, "error", () => undefined);
  db = dbFila({
    respostas: {
      descartar_anexo_comunidade: [{ data: [{ file: "orfao" }], error: null }],
    },
    remocoes: [{ error: { message: "storage fora" } }],
  });
  assert.equal(await servidor.descartarAnexoComunidade(db as never, 7, "orfao", true), "removido");
  assert.deepEqual(db.chamadas, ["descartar_anexo_comunidade"]);

  db = dbFila({
    respostas: {
      reservar_exclusoes_storage_comunidade: [{ data: [{ file: "orfao" }], error: null }],
      concluir_exclusoes_storage_comunidade: [{ data: null, error: null }],
    },
  });
  await servidor.processarExclusoesPendentesComunidade(db as never);
  assert.deepEqual(db.removidos, [["orfao"]]);
  assert.deepEqual(db.chamadas, [
    "reservar_exclusoes_storage_comunidade",
    "concluir_exclusoes_storage_comunidade",
  ]);
});

test("assinatura do feed usa lotes de 100, seis horas e registra falhas parciais", async () => {
  const itens = Array.from({ length: 205 }, (_, indice) => ({
    file: `p/${indice}.pdf`,
    nome_original: `Documento ${indice}.pdf`,
    tipo: "documento" as const,
    id: indice,
  }));
  const chamadas: number[] = [];
  const resultado = await feed.assinarAnexosComunidade(itens, async (paths, expiresIn) => {
    chamadas.push(paths.length);
    assert.equal(expiresIn, 21_600);
    return {
      data: paths.map((path) => ({
        path,
        signedUrl: `https://storage.test/${path}?token=segredo`,
        error: path.endsWith("/204.pdf") ? "falha" : null,
      })),
      error: null,
    };
  });

  assert.deepEqual(chamadas, [100, 100, 5]);
  assert.equal(resultado.houveErro, true);
  assert.equal(resultado.anexos.length, 204);
  assert.match(resultado.anexos[0].downloadUrl ?? "", /download=Documento\+0\.pdf/);
  assert.deepEqual(
    await feed.assinarAnexosComunidade([], async () => ({
      data: [],
      error: null,
    })),
    {
      anexos: [],
      houveErro: false,
    },
  );
});
