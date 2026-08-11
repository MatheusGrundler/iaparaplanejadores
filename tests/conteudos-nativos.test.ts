import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SEMANA_KEYS } from "../lib/curso-atividades";
import { SEMANAS, type BlocoSemana } from "../lib/curso-conteudo";

const require = createRequire(import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
require.extensions[".css"] = (module) => {
  module.exports = {
    __esModule: true,
    default: new Proxy({}, { get: (_target, propriedade) => String(propriedade) }),
  };
};

const conteudosNativos = import("../app/componentes/curso/conteudos");

test("todas as etapas em código renderizam conteúdo, atividades e dúvidas", async (t) => {
  const { CONTEUDOS_NATIVOS } = await conteudosNativos;
  assert.deepEqual(Object.keys(CONTEUDOS_NATIVOS), [...SEMANA_KEYS]);

  for (const chave of SEMANA_KEYS) {
    await t.test(chave, () => {
      const registro = CONTEUDOS_NATIVOS[chave];
      const atividadesRenderizadas: string[] = [];
      const html = renderToStaticMarkup(
        React.createElement(registro.componente, {
          renderAtividade: (atividade) => {
            atividadesRenderizadas.push(atividade.key);
            return React.createElement(
              "div",
              { "data-atividade": atividade.key },
              atividade.titulo,
            );
          },
          duvidas: React.createElement("div", { "data-duvidas": chave }, "Dúvidas da etapa"),
        }),
      );

      assert.match(html, /^<article/);
      assert.ok(html.includes(registro.metadata.titulo));
      assert.ok(html.includes(registro.metadata.promessa));
      assert.ok(html.includes(`data-duvidas="${chave}"`));
      assert.deepEqual(
        atividadesRenderizadas,
        registro.atividades.map((atividade) => atividade.key),
      );
      for (const atividade of registro.atividades) {
        assert.ok(html.includes(`data-atividade="${atividade.key}"`));
        assert.ok(html.includes(atividade.titulo));
      }
    });
  }
});

test("metadados das páginas nativas permanecem próprios e ordenados", async () => {
  const { CONTEUDOS_NATIVOS } = await conteudosNativos;
  const registros = SEMANA_KEYS.map((chave) => CONTEUDOS_NATIVOS[chave]);
  assert.deepEqual(
    registros.map((registro) => registro.metadata.numero),
    [0, 1, 2, 3, 4],
  );
  assert.equal(new Set(registros.map((registro) => registro.metadata.slug)).size, registros.length);
  assert.equal(
    new Set(registros.map((registro) => registro.metadata.titulo)).size,
    registros.length,
  );
});

test("cada etapa monta a própria página sem um template obrigatório", async () => {
  const arquivos = ["Preparacao", "Etapa1", "Etapa2", "Etapa3", "Etapa4"];

  await Promise.all(
    arquivos.map(async (arquivo) => {
      const fonte = await readFile(
        resolve(process.cwd(), "app/componentes/curso/conteudos", `${arquivo}.tsx`),
        "utf8",
      );

      assert.doesNotMatch(fonte, /PaginaConteudoNativo/);
      assert.match(fonte, /<article[\s\S]*?<Conteudo\.AplicacoesEtapa/);
    }),
  );
});

test("Preparação explica skill sem antecipar sua criação", async () => {
  const { CONTEUDOS_NATIVOS } = await conteudosNativos;
  const preparacao = CONTEUDOS_NATIVOS["semana-0"];
  const html = renderToStaticMarkup(
    React.createElement(preparacao.componente, {
      renderAtividade: (atividade) =>
        React.createElement("div", { "data-atividade": atividade.key }, atividade.titulo),
      duvidas: React.createElement("div", null, "Dúvidas da preparação"),
    }),
  );

  assert.deepEqual(
    preparacao.atividades.map((atividade) => atividade.key),
    ["semana-0-preparacao"],
  );
  assert.match(html, /Procedimento pronto/);
  assert.match(html, /Termo técnico: Skill/);
  assert.match(html, /a criação vem depois/);
  assert.doesNotMatch(
    html,
    /Desenhar a primeira skill|Do trabalho repetido à primeira skill|transformar.{0,120}em uma skill|quest-preparacao-skill/i,
  );
  assert.match(html, /live exclusivamente para tirar dúvidas/);
  assert.doesNotMatch(html, /live para executar|live é laboratório/i);
});

test("Preparação apresenta os termos técnicos antes do conteúdo", async () => {
  const { CONTEUDOS_NATIVOS } = await conteudosNativos;
  const html = renderToStaticMarkup(
    React.createElement(CONTEUDOS_NATIVOS["semana-0"].componente, {}),
  );

  assert.match(html, /Nomes essenciais da Preparação/);
  assert.match(html, /Um computador alugado na internet/);
  assert.match(html, /O programa que mantém o agente em funcionamento na VPS/);
  assert.match(html, /A ferramenta visual usada para conectar serviços/);
  assert.match(html, /O serviço que envia e-mails/);
  assert.match(html, /Token ou chave de API/);
  assert.match(html, /Não envie nem publique esse arquivo/);
  assert.doesNotMatch(html, /aria-label="Entenda o que é/);
});

test("Preparação separa custos, programas da VPS e contas gratuitas", async () => {
  const { CONTEUDOS_NATIVOS } = await conteudosNativos;
  const preparacao = CONTEUDOS_NATIVOS["semana-0"];
  const fonte = SEMANAS.find((etapa) => etapa.slug === "semana-0");
  const secao = fonte?.sections.find((item) => item.id === "contas-e-acessos");
  const bloco = secao?.blocks.find(
    (item): item is Extract<BlocoSemana, { type: "services" }> => item.type === "services",
  );
  assert.ok(bloco);

  const grupos = new Map(bloco.groups.map((grupo) => [grupo.tipo, grupo]));
  assert.deepEqual(
    grupos.get("custo-mensal")?.items.map((item) => item.nome),
    ["Codex + acesso OpenAI", "VPS", "Número dedicado / Salvy", "Z-API"],
  );
  assert.equal(
    grupos.get("custo-mensal")?.items[0]?.nota,
    "Recomendação: comece pelo plano de R$ 120/mês. Acompanhe o gasto e suba para R$ 550/mês apenas se precisar.",
  );
  assert.deepEqual(
    grupos.get("custo-por-uso")?.items.map((item) => item.nome),
    ["OpenRouter"],
  );
  assert.deepEqual(
    grupos.get("instalado-na-vps")?.items.map((item) => item.nome),
    ["OpenClaw", "n8n"],
  );
  assert.deepEqual(
    grupos.get("conta-gratuita")?.items.map((item) => item.nome),
    ["GitHub", "Gmail do agente", "Telegram"],
  );
  assert.equal(
    grupos.get("instalado-na-vps")?.items.find((item) => item.nome === "n8n")?.cobranca,
    "Sem assinatura separada",
  );
  assert.equal(
    grupos.get("custo-mensal")?.items.find((item) => item.nome === "VPS")?.cobranca,
    "R$ 53–71/mês",
  );
  assert.equal(bloco.costNotice.title, "Assinaturas necessárias: R$ 352 a R$ 800 por mês");
  assert.match(JSON.stringify(bloco), /https:\/\/salvy\.com\.br\/planos/);
  assert.match(JSON.stringify(bloco), /https:\/\/openrouter\.ai/);

  const html = renderToStaticMarkup(
    React.createElement(preparacao.componente, {
      duvidas: React.createElement("div", null, "Dúvidas da preparação"),
    }),
  );
  const texto = html.replace(/<[^>]+>/g, "");

  assert.match(html, /Codex \+ acesso OpenAI/);
  assert.doesNotMatch(html, /aria-label="Nesta página"/);
  assert.match(html, />VPS</);
  assert.match(html, />OpenClaw</);
  assert.match(html, />n8n</);
  assert.match(html, /Assinaturas necessárias: R\$ 352 a R\$ 800 por mês/);
  assert.match(html, /Mensalidades extras/);
  assert.match(html, /Créditos para modelos de IA/);
  assert.match(html, /R\$ 120–550\/mês/);
  assert.match(html, /R\$ 50\/mês em créditos/);
  assert.match(html, /Contratar VPS com 20% no 1º mês/);
  assert.match(texto, /Programas instalados na sua VPS/);
  assert.match(html, /Contas gratuitas para a Imersão/);
  assert.match(texto, /Você paga pela VPS[\s\S]{0,500}são instalados nela/);
  assert.match(html, /data-link-status="pendente"/);
  assert.doesNotMatch(html, /servicoCardDestaque/);
  assert.match(html, /Dê uma identidade separada ao agente/);
  assert.match(html, /Segredo não é conteúdo de aula/);
  assert.doesNotMatch(html, /Fontes oficiais para abrir conta|Codex: primeiros passos/);
  assert.doesNotMatch(html, /learn\.chatgpt\.com|docs\.openclaw\.ai\/install/);
});

test("Preparação explica cinco conceitos em um mapa interativo", async () => {
  const { CONTEUDOS_NATIVOS } = await conteudosNativos;
  const preparacao = CONTEUDOS_NATIVOS["semana-0"];
  const html = renderToStaticMarkup(
    React.createElement(preparacao.componente, {
      duvidas: React.createElement("div", null, "Dúvidas da preparação"),
    }),
  );

  assert.match(html, /Explore uma peça de cada vez/);
  assert.match(html, /Assistente que executa/);
  assert.match(html, /Agente de IA/);
  assert.match(html, /IA que lê e escreve/);
  assert.match(html, /LLM \/ modelo de IA/);
  assert.match(html, /Ambiente de trabalho/);
  assert.match(html, /Harness/);
  assert.match(html, /Procedimento pronto/);
  assert.match(html, /Skill/);
  assert.match(html, /Ponte com outros sistemas/);
  assert.match(html, /MCP/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-controls="conceito-agente-painel"/);
  assert.match(html, /Como tudo se conecta/);
  assert.match(html, /fluxo-agente\.png/);
  assert.doesNotMatch(html, /As peças principais|Também chamado de harness|LLM é a família/);
  assert.doesNotMatch(html, /produz(?:em)? linguagem/i);
  assert.doesNotMatch(html, /\bruntime\b/i);
  assert.doesNotMatch(html, /modelcontextprotocol\.io/);
});

test("conteúdo para o aluno não depende do termo técnico runtime", async () => {
  const { SEMANAS } = await import("../lib/curso-conteudo");
  assert.doesNotMatch(JSON.stringify(SEMANAS), /\bruntime\b/i);
});
