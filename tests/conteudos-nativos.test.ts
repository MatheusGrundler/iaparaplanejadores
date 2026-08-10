import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SEMANA_KEYS } from "../lib/curso-atividades";

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
