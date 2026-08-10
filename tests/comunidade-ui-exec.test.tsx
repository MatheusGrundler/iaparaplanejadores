import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, mock, test } from "node:test";
import * as React from "react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registrarHooksComunidade } from "./fixtures/comunidade-hooks";
import {
  iniciarRenderDeComponente,
  reiniciarHooksDeComponente,
} from "./fixtures/comunidade-react-hooks.mock";
import {
  definirRuntimeComunidade,
  runtimeComunidade,
  type RuntimeComunidadeMock,
} from "./fixtures/comunidade-runtime.mock";

registrarHooksComunidade({ servidor: true, interface: true });
Object.defineProperty(globalThis, "React", {
  configurable: true,
  value: React,
});

const require = createRequire(import.meta.url);
const composer =
  require("../app/(aluno)/comunidade/Composer.tsx") as typeof import("../app/(aluno)/comunidade/Composer");
const pagina =
  require("../app/(aluno)/comunidade/page.tsx") as typeof import("../app/(aluno)/comunidade/page");
const feed =
  require("../app/(aluno)/comunidade/Feed.tsx") as typeof import("../app/(aluno)/comunidade/Feed");
const anexos = require("../lib/comunidade-anexos.ts") as typeof import("../lib/comunidade-anexos");
const EditorRico = require("../app/componentes/EditorRico.tsx")
  .default as typeof import("../app/componentes/EditorRico").default;

type Elemento = ReactElement<Record<string, unknown>>;

const urlSupabaseAnterior = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  mock.restoreAll();
  reiniciarHooksDeComponente();
  definirRuntimeComunidade({});
  if (urlSupabaseAnterior === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = urlSupabaseAnterior;
  Reflect.deleteProperty(globalThis, "window");
});

function elementos(no: ReactNode): Elemento[] {
  if (Array.isArray(no)) return no.flatMap(elementos);
  if (!isValidElement(no)) return [];
  const elemento = no as Elemento;
  return [elemento, ...elementos(elemento.props.children as ReactNode)];
}

function encontrar(raiz: ReactNode, predicado: (elemento: Elemento) => boolean, descricao: string) {
  const encontrado = elementos(raiz).find(predicado);
  assert.ok(encontrado, `Não encontrei ${descricao}.`);
  return encontrado;
}

function porTipo(raiz: ReactNode, tipo: string) {
  return encontrar(raiz, (elemento) => elemento.type === tipo, `<${tipo}>`);
}

function porRotulo(raiz: ReactNode, rotulo: string) {
  return encontrar(raiz, (elemento) => elemento.props["aria-label"] === rotulo, rotulo);
}

function renderizarComposer() {
  iniciarRenderDeComponente();
  return composer.default();
}

async function submeterComposer(arvore: ReactNode) {
  const formulario = porTipo(arvore, "form");
  const aoEnviar = formulario.props.onSubmit as (evento: {
    preventDefault(): void;
  }) => Promise<void>;
  await aoEnviar({ preventDefault() {} });
}

function listaArquivos(...itens: File[]): FileList {
  return Object.assign([...itens], {
    item(indice: number) {
      return itens[indice] ?? null;
    },
  });
}

function resposta(body: unknown, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });
}

test("helpers do Composer tratam conteúdo, mensagens, bytes, preview e JSON inválido", async () => {
  assert.equal(composer.temTexto("<p>&nbsp;</p>"), false);
  assert.equal(composer.temTexto("<p> contribuição </p>"), true);
  assert.equal(composer.formatarBytes(12), "12 B");
  assert.equal(composer.formatarBytes(2_048), "2 KB");
  assert.equal(composer.formatarBytes(1_572_864), "1.5 MB");
  assert.equal(composer.formatarBytes(12 * 1024 * 1024), "12 MB");
  assert.equal(composer.rotuloTipo("video"), "vídeo");
  assert.equal(composer.rotuloTipo("audio"), "áudio");
  assert.equal(composer.rotuloTipo("imagem"), "imagem");
  assert.equal(composer.mensagemDeErro({ erro: "detalhe" }, "fallback"), "detalhe");
  assert.equal(composer.mensagemDeErro({ error: "alternativo" }, "fallback"), "alternativo");
  assert.equal(composer.mensagemDeErro(null, "fallback"), "fallback");
  assert.deepEqual(await composer.respostaJson(resposta({ ok: true, id: 9 })), {
    ok: true,
    id: 9,
  });
  assert.equal(await composer.respostaJson(new Response("não é json")), null);

  const arquivo = new File(["foto"], "foto.png", { type: "image/png" });
  const criarUrl = mock.method(URL, "createObjectURL", () => "blob:preview");
  assert.equal(composer.criarPreview(arquivo, "imagem"), "blob:preview");
  assert.equal(composer.criarPreview(arquivo, "documento"), undefined);
  assert.equal(criarUrl.mock.callCount(), 1);
});

test("endpoint e envio TUS usam host do Storage, progresso, retry e propagam falha", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co/rest/v1?x=1#hash";
  assert.equal(
    composer.endpointTus(),
    "https://projeto.storage.supabase.co/storage/v1/upload/resumable",
  );
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local.supabase.test/base";
  assert.equal(composer.endpointTus(), "https://local.supabase.test/storage/v1/upload/resumable");
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.throws(() => composer.endpointTus(), /não está configurado/);

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
  definirRuntimeComunidade({ tusSimularRetry: true });
  const atualizacoes: Array<[number, number | undefined]> = [];
  await composer.enviarComTus(
    new File(["arquivo"], "grande.pdf", { type: "application/pdf" }),
    "usuario/1/anexo.pdf",
    "token-assinado",
    "application/pdf",
    (progresso, tentativa) => atualizacoes.push([progresso, tentativa]),
  );
  assert.deepEqual(atualizacoes, [
    [43, undefined],
    [0, 2],
    [100, undefined],
  ]);
  assert.equal(runtimeComunidade().tusInicios, 1);
  assert.deepEqual(runtimeComunidade().tusOpcoes?.headers, {
    "x-signature": "token-assinado",
  });
  assert.deepEqual(runtimeComunidade().tusOpcoes?.metadata, {
    bucketName: "comunidade-anexos",
    objectName: "usuario/1/anexo.pdf",
    contentType: "application/pdf",
  });

  definirRuntimeComunidade({ tusFalha: new Error("rede indisponível") });
  await assert.rejects(
    composer.enviarComTus(
      new File(["x"], "x.pdf"),
      "x.pdf",
      "token",
      "application/pdf",
      () => undefined,
    ),
    /rede indisponível/,
  );
});

test("preview local executa as quatro variantes de anexo", () => {
  const base = {
    id: "a",
    arquivo: new File(["x"], "arquivo.bin"),
    mime: "application/octet-stream",
    estado: "aguardando" as const,
    progresso: 0,
    tentativa: 0,
  };
  const imagem = composer.PreviewAnexo({
    anexo: { ...base, tipo: "imagem", previewUrl: "blob:imagem" },
  }) as Elemento;
  assert.equal(imagem.props.src, "blob:imagem");
  assert.match(String(imagem.props.alt), /arquivo\.bin/);

  const video = composer.PreviewAnexo({
    anexo: { ...base, tipo: "video", previewUrl: "blob:video" },
  }) as Elemento;
  assert.equal(video.type, "video");
  assert.equal(video.props.controls, true);

  const audio = composer.PreviewAnexo({
    anexo: { ...base, tipo: "audio", previewUrl: "blob:audio" },
  }) as Elemento;
  assert.equal(audio.type, "audio");

  const documento = composer.PreviewAnexo({
    anexo: { ...base, tipo: "documento" },
  }) as Elemento;
  assert.equal(documento.type, "span");
  assert.equal(documento.props.children, "DOC");
});

test("Composer seleciona, deduplica e remove um arquivo válido", () => {
  definirRuntimeComunidade({});
  mock.method(URL, "createObjectURL", () => "blob:foto");
  const revogar = mock.method(URL, "revokeObjectURL", () => undefined);
  const arquivo = new File(["imagem"], "foto.png", {
    type: "image/png",
    lastModified: 123,
  });

  let arvore = renderizarComposer();
  const input = porTipo(arvore, "input");
  (input.props.onChange as (evento: unknown) => void)({
    currentTarget: { files: listaArquivos(arquivo) },
  });
  arvore = renderizarComposer();
  assert.equal(elementos(arvore).filter((item) => item.type === composer.PreviewAnexo).length, 1);
  assert.match(String(porRotulo(arvore, "Remover foto.png").props["aria-label"]), /foto/);

  const inputAtualizado = porTipo(arvore, "input");
  (inputAtualizado.props.onChange as (evento: unknown) => void)({
    currentTarget: { files: listaArquivos(arquivo) },
  });
  arvore = renderizarComposer();
  assert.equal(elementos(arvore).filter((item) => item.type === composer.PreviewAnexo).length, 1);

  (porRotulo(arvore, "Remover foto.png").props.onClick as () => void)();
  arvore = renderizarComposer();
  assert.equal(elementos(arvore).filter((item) => item.type === composer.PreviewAnexo).length, 0);
  assert.equal(revogar.mock.callCount(), 1);
});

test("Composer rejeita quantidade, soma total e formato inválido com mensagem acessível", () => {
  definirRuntimeComunidade({});
  let arvore = renderizarComposer();
  const input = porTipo(arvore, "input");
  const muitos = Array.from(
    { length: 11 },
    (_, indice) => new File(["x"], `arquivo-${indice}.txt`, { type: "text/plain" }),
  );
  (input.props.onChange as (evento: unknown) => void)({
    currentTarget: { files: listaArquivos(...muitos) },
  });
  arvore = renderizarComposer();
  assert.match(
    String(encontrar(arvore, (item) => item.props.role === "alert", "alerta").props.children),
    /10 arquivos/,
  );

  reiniciarHooksDeComponente();
  arvore = renderizarComposer();
  const grandes = [0, 1, 2].map(
    (indice) =>
      ({
        name: `video-${indice}.mp4`,
        size: 70 * 1024 * 1024,
        type: "video/mp4",
        lastModified: indice,
      }) as File,
  );
  (porTipo(arvore, "input").props.onChange as (evento: unknown) => void)({
    currentTarget: { files: listaArquivos(...grandes) },
  });
  arvore = renderizarComposer();
  assert.match(
    String(encontrar(arvore, (item) => item.props.role === "alert", "alerta").props.children),
    /200 MB/,
  );

  reiniciarHooksDeComponente();
  arvore = renderizarComposer();
  const invalido = new File(["html"], "pagina.html", { type: "text/html" });
  (porTipo(arvore, "input").props.onChange as (evento: unknown) => void)({
    currentTarget: { files: listaArquivos(invalido) },
  });
  arvore = renderizarComposer();
  assert.match(
    String(encontrar(arvore, (item) => item.props.role === "alert", "alerta").props.children),
    /formato de arquivo/,
  );
});

test("Composer publica texto, limpa o estado e atualiza o feed", async () => {
  definirRuntimeComunidade({});
  let arvore = renderizarComposer();
  const editor = encontrar(arvore, (item) => item.type === EditorRico, "EditorRico");
  (editor.props.aoMudar as (html: string) => void)("<p>Minha contribuição</p>");
  arvore = renderizarComposer();
  assert.equal(porTipo(arvore, "button").props.disabled, false);

  const chamadas: Array<{ url: string; method: string }> = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(input), method: init?.method ?? "GET" });
    if (String(input) === "/api/comunidade/publicacoes") return resposta({ ok: true, id: 71 });
    return resposta({ ok: true });
  });
  await submeterComposer(arvore);

  arvore = renderizarComposer();
  assert.deepEqual(chamadas, [
    { url: "/api/comunidade/publicacoes", method: "POST" },
    { url: "/api/comunidade/publicacoes/71", method: "PATCH" },
  ]);
  assert.equal(runtimeComunidade().refreshes, 1);
  assert.match(renderToStaticMarkup(arvore), /Publicado/);
});

test("Composer executa preparo, PUT, confirmação e publicação com anexo", async () => {
  definirRuntimeComunidade({});
  mock.method(URL, "createObjectURL", () => "blob:imagem");
  const revogar = mock.method(URL, "revokeObjectURL", () => undefined);
  const arquivo = new File(["conteúdo"], "foto.png", { type: "image/png" });
  let arvore = renderizarComposer();
  (porTipo(arvore, "input").props.onChange as (evento: unknown) => void)({
    currentTarget: { files: listaArquivos(arquivo) },
  });
  arvore = renderizarComposer();

  const chamadas: Array<{ url: string; method: string; body?: string }> = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    chamadas.push({
      url,
      method: init?.method ?? "GET",
      body: String(init?.body ?? ""),
    });
    if (url === "/api/comunidade/publicacoes") return resposta({ ok: true, id: "9" });
    if (url.endsWith("/anexos") && init?.method === "POST") {
      return resposta({
        ok: true,
        path: "usuario/9/foto.png",
        url: "https://storage.test/upload",
        mime: "image/png",
      });
    }
    if (url === "https://storage.test/upload") return new Response(null, { status: 200 });
    return resposta({ ok: true });
  });

  await submeterComposer(arvore);
  assert.deepEqual(
    chamadas.map(({ url, method }) => ({ url, method })),
    [
      { url: "/api/comunidade/publicacoes", method: "POST" },
      { url: "/api/comunidade/publicacoes/9/anexos", method: "POST" },
      { url: "https://storage.test/upload", method: "PUT" },
      { url: "/api/comunidade/publicacoes/9/anexos", method: "PUT" },
      { url: "/api/comunidade/publicacoes/9", method: "PATCH" },
    ],
  );
  assert.match(chamadas[1]?.body ?? "", /foto\.png/);
  assert.match(chamadas[3]?.body ?? "", /usuario\/9\/foto\.png/);
  assert.equal(revogar.mock.callCount(), 1);
  assert.equal(runtimeComunidade().refreshes, 1);
});

test("Composer preserva conteúdo e limpa rascunho quando publicação falha", async () => {
  definirRuntimeComunidade({});
  let arvore = renderizarComposer();
  const editor = encontrar(arvore, (item) => item.type === EditorRico, "EditorRico");
  (editor.props.aoMudar as (html: string) => void)("<p>Conteúdo recuperável</p>");
  arvore = renderizarComposer();

  const chamadas: Array<{ url: string; method: string }> = [];
  mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    chamadas.push({ url, method: init?.method ?? "GET" });
    if (url === "/api/comunidade/publicacoes") return resposta({ ok: true, id: 22 });
    if (init?.method === "PATCH")
      return resposta({ erro: "Banco temporariamente indisponível" }, 500);
    return resposta({ ok: true });
  });
  await submeterComposer(arvore);

  arvore = renderizarComposer();
  assert.deepEqual(chamadas, [
    { url: "/api/comunidade/publicacoes", method: "POST" },
    { url: "/api/comunidade/publicacoes/22", method: "PATCH" },
    { url: "/api/comunidade/publicacoes/22", method: "DELETE" },
  ]);
  assert.match(renderToStaticMarkup(arvore), /Banco temporariamente indisponível/);

  reiniciarHooksDeComponente();
  definirRuntimeComunidade({});
  arvore = renderizarComposer();
  (
    encontrar(arvore, (item) => item.type === EditorRico, "EditorRico").props.aoMudar as (
      html: string,
    ) => void
  )("<p>x</p>");
  arvore = renderizarComposer();
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => new Response("inválido", { status: 500 }));
  await submeterComposer(arvore);
  arvore = renderizarComposer();
  assert.match(renderToStaticMarkup(arvore), /Não foi possível criar a publicação/);
});

function editorFalso() {
  const chamadas: string[] = [];
  let linkAtivo = false;
  const corrente: Record<string, (...args: unknown[]) => unknown> = {};
  for (const nome of [
    "focus",
    "setParagraph",
    "toggleHeading",
    "toggleBold",
    "toggleItalic",
    "toggleBulletList",
    "toggleOrderedList",
    "unsetLink",
    "setLink",
    "toggleBlockquote",
    "undo",
    "redo",
  ]) {
    corrente[nome] = (...args: unknown[]) => {
      chamadas.push(`${nome}:${JSON.stringify(args)}`);
      return corrente;
    };
  }
  corrente.run = () => {
    chamadas.push("run");
    return true;
  };
  const editor = {
    isEmpty: true,
    isActive(nome: string) {
      return nome === "link" ? linkAtivo : nome === "paragraph";
    },
    chain() {
      chamadas.push("chain");
      return corrente;
    },
    can() {
      chamadas.push("can");
      return { chain: () => corrente };
    },
    commands: {
      setContent(valor: string) {
        chamadas.push(`setContent:${valor}`);
      },
    },
    setEditable(valor: boolean) {
      chamadas.push(`setEditable:${valor}`);
    },
    getHTML() {
      return "<p>alterado</p>";
    },
  };
  return {
    editor,
    chamadas,
    ativarLink: (ativo: boolean) => (linkAtivo = ativo),
  };
}

test("EditorRico renderiza loading, configura conteúdo e executa toda a toolbar", () => {
  definirRuntimeComunidade({ editor: null });
  iniciarRenderDeComponente();
  const loading = EditorRico({ aoMudar: () => undefined }) as Elemento;
  assert.equal(loading.type, "div");
  assert.match(String(loading.props.children), /Carregando editor/);

  const falso = editorFalso();
  const mudancas: string[] = [];
  definirRuntimeComunidade({ editor: falso.editor });
  iniciarRenderDeComponente();
  let arvore = EditorRico({
    inicial: "<p>salvo</p>",
    placeholder: "Digite",
    desabilitado: false,
    rotuloAria: "Editor em teste",
    descritoPor: "ajuda",
    aoMudar: (html) => mudancas.push(html),
  });
  assert.ok(falso.chamadas.includes("setContent:<p>salvo</p>"));
  assert.ok(falso.chamadas.includes("setEditable:true"));

  const opcoes = runtimeComunidade().editorOptions as {
    onUpdate(args: { editor: typeof falso.editor }): void;
    editorProps: { attributes: Record<string, string> };
  };
  opcoes.onUpdate({ editor: falso.editor });
  assert.deepEqual(mudancas, ["<p>alterado</p>"]);
  assert.equal(opcoes.editorProps.attributes["aria-describedby"], "ajuda");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { prompt: () => "https://exemplo.test" },
  });
  for (const rotulo of [
    "Texto normal",
    "Título",
    "Negrito",
    "Itálico",
    "Lista com marcadores",
    "Lista numerada",
    "Adicionar link",
    "Citação",
    "Desfazer",
    "Refazer",
  ]) {
    (porRotulo(arvore, rotulo).props.onClick as () => void)();
  }
  assert.ok(falso.chamadas.some((chamada) => chamada.startsWith("setLink:")));

  falso.ativarLink(true);
  iniciarRenderDeComponente();
  arvore = EditorRico({ aoMudar: () => undefined });
  (porRotulo(arvore, "Remover link").props.onClick as () => void)();
  assert.ok(falso.chamadas.some((chamada) => chamada.startsWith("unsetLink:")));

  falso.ativarLink(false);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { prompt: () => "" },
  });
  iniciarRenderDeComponente();
  arvore = EditorRico({ desabilitado: true, aoMudar: () => undefined });
  (porRotulo(arvore, "Adicionar link").props.onClick as () => void)();
  assert.equal(porRotulo(arvore, "Negrito").props.disabled, true);
  assert.ok(falso.chamadas.includes("setEditable:false"));
});

type ConfiguracaoPagina = {
  posts?: unknown[];
  postsError?: unknown;
  anexos?: unknown[];
  anexosError?: unknown;
  falharAssinatura?: (path: string) => boolean;
};

function bancoPagina(configuracao: ConfiguracaoPagina = {}) {
  const tabelas: string[] = [];
  const lotes: string[][] = [];
  const banco = {
    async rpc() {
      return { data: [], error: null };
    },
    from(tabela: string) {
      tabelas.push(tabela);
      const resultado =
        tabela === "posts"
          ? {
              data: configuracao.posts ?? [],
              error: configuracao.postsError ?? null,
            }
          : {
              data: configuracao.anexos ?? [],
              error: configuracao.anexosError ?? null,
            };
      const consulta = {
        select() {
          return consulta;
        },
        eq() {
          return consulta;
        },
        in() {
          return consulta;
        },
        order() {
          return consulta;
        },
        limit() {
          return consulta;
        },
        then<TResult1 = typeof resultado, TResult2 = never>(
          resolver?: ((valor: typeof resultado) => TResult1 | PromiseLike<TResult1>) | null,
          rejeitar?: ((motivo: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(resultado).then(resolver, rejeitar);
        },
      };
      return consulta;
    },
    storage: {
      from(bucket: string) {
        assert.equal(bucket, "comunidade-anexos");
        return {
          async remove() {
            return { error: null };
          },
          async createSignedUrls(paths: string[], expiresIn: number) {
            assert.equal(expiresIn, 21_600);
            lotes.push(paths);
            return {
              data: paths.map((path) => ({
                path,
                signedUrl: `https://storage.test/${path}?token=segredo`,
                error: configuracao.falharAssinatura?.(path) ? "indisponível" : null,
              })),
              error: null,
            };
          },
        };
      },
    },
  };
  return { banco, tabelas, lotes };
}

async function htmlPagina(runtime: RuntimeComunidadeMock) {
  reiniciarHooksDeComponente();
  definirRuntimeComunidade(runtime);
  const elemento = await pagina.default();
  if (!elemento) return "";
  iniciarRenderDeComponente();
  return renderToStaticMarkup(elemento);
}

test("página nega acesso e renderiza estados vazio e erro do feed", async () => {
  assert.equal(await htmlPagina({ acesso: false }), "");

  const vazio = bancoPagina();
  const htmlVazio = await htmlPagina({ acesso: true, db: vazio.banco });
  assert.match(htmlVazio, /A conversa começa aqui/);
  assert.match(htmlVazio, /0 publicações/);
  assert.deepEqual(vazio.tabelas, ["posts"]);

  const falha = bancoPagina({ postsError: { code: "DB" } });
  const htmlErro = await htmlPagina({ acesso: true, db: falha.banco });
  assert.match(htmlErro, /Não foi possível carregar as conversas agora/);
  assert.doesNotMatch(htmlErro, /0 publicações/);
});

test("página renderiza HTML seguro, texto legado, fixação e os quatro anexos", async () => {
  const posts = [
    {
      id: 1,
      autor: "Ana",
      texto: "",
      conteudo_html:
        '<h2>Descoberta</h2><script>alert(1)</script><a href="javascript:alert(2)">link</a>',
      fixado: true,
      created_at: "2026-08-10T12:00:00.000Z",
    },
    {
      id: 2,
      autor: "Bruno",
      texto: "Publicação antiga",
      conteudo_html: null,
      fixado: false,
      created_at: "2026-08-10T13:00:00.000Z",
    },
  ];
  const tipos = ["imagem", "video", "audio", "documento"] as const;
  const anexos = tipos.map((tipo, indice) => ({
    id: `a-${indice}`,
    post_id: 1,
    file: `usuario/1/${tipo}`,
    nome_original: tipo === "documento" ? "guia final.pdf" : `${tipo}.bin`,
    tipo,
    mime: "application/octet-stream",
    bytes: indice === 3 ? 1_572_864 : 100,
    status: "pronto" as const,
  }));
  const dados = bancoPagina({ posts, anexos });
  const html = await htmlPagina({ acesso: true, db: dados.banco });

  assert.match(html, /2 publicações/);
  assert.match(html, /Fixada/);
  assert.match(html, /Descoberta/);
  assert.match(html, /Publicação antiga/);
  assert.doesNotMatch(html, /<script|javascript:/);
  assert.match(html, /<img/);
  assert.match(html, /<video/);
  assert.match(html, /<audio/);
  assert.match(html, /Documento · 1\.5 MB/);
  assert.match(html, />Abrir</);
  assert.match(html, />Baixar</);
  assert.match(html, /download=guia\+final\.pdf/);
  assert.deepEqual(dados.tabelas, ["posts", "post_anexos"]);
  assert.deepEqual(dados.lotes, [
    ["usuario/1/imagem", "usuario/1/video", "usuario/1/audio", "usuario/1/documento"],
  ]);
});

test("página avisa assinatura parcial e omite somente o anexo indisponível", async () => {
  const dados = bancoPagina({
    posts: [
      {
        id: 1,
        autor: "Ana",
        texto: "Post",
        conteudo_html: null,
        fixado: false,
        created_at: "2026-08-10T12:00:00.000Z",
      },
    ],
    anexos: [
      {
        id: "ok",
        post_id: 1,
        file: "ok.png",
        nome_original: "ok.png",
        tipo: "imagem",
        mime: "image/png",
        bytes: 20,
        status: "pronto",
      },
      {
        id: "falha",
        post_id: 1,
        file: "falha.png",
        nome_original: "falha.png",
        tipo: "imagem",
        mime: "image/png",
        bytes: 20,
        status: "pronto",
      },
    ],
    falharAssinatura: (path) => path === "falha.png",
  });
  const html = await htmlPagina({ acesso: true, db: dados.banco });
  assert.match(html, /Alguns anexos não puderam ser carregados/);
  assert.match(html, /alt="ok\.png"/);
  assert.doesNotMatch(html, /alt="falha\.png"/);
});

test("helpers visuais do feed cobrem data, sanitização e tamanhos", () => {
  assert.match(feed.quando("2026-08-10T12:30:00.000Z"), /10\/08/);
  assert.equal(anexos.formatarBytesComunidade(100), "100 B");
  assert.equal(anexos.formatarBytesComunidade(2_048), "2 KB");
  assert.equal(anexos.formatarBytesComunidade(12 * 1024 * 1024), "12 MB");
  const seguro = feed.htmlSeguro(
    '<p>Olá</p><a href="https://exemplo.test">site</a><iframe src="x"></iframe>',
  );
  assert.match(seguro, /target="_blank"/);
  assert.match(seguro, /noopener noreferrer/);
  assert.doesNotMatch(seguro, /iframe/);
});
