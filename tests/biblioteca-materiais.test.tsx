import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BibliotecaMateriais } from "../app/(aluno)/arquivo/BibliotecaMateriais";
import {
  extensaoDoArquivo,
  removerMaterialComSeguranca,
  validarArquivoParaLeitura,
} from "../lib/materiais-admin";
import {
  destinoDoMaterial,
  mensagemVeioDoMaterial,
  OPCOES_DOWNLOAD_ASSINADO,
} from "../lib/materiais";

(globalThis as { React?: typeof React }).React = React;

test("biblioteca oferece a ação compatível com cada material publicado", () => {
  const html = renderToStaticMarkup(
    createElement(BibliotecaMateriais, {
      materiais: [
        {
          id: 1,
          tag: "Guia",
          titulo: "Leitura HTML",
          desc: "Abra dentro da plataforma",
          ordem: 1,
          modo: "leitura",
        },
        {
          id: 2,
          tag: null,
          titulo: "Kit de planilhas",
          desc: null,
          ordem: 2,
          modo: "download",
        },
        {
          id: 3,
          tag: null,
          titulo: "Ainda sem versão",
          desc: null,
          ordem: 3,
          modo: "leitura",
        },
      ],
      idsComArquivo: [1, 2],
    }),
  );

  assert.match(html, /href="\/material\/1"/);
  assert.match(html, /Ler Leitura HTML na plataforma/);
  assert.match(html, /href="\/api\/download\/2"/);
  assert.match(html, /Baixar Kit de planilhas/);
  assert.match(html, /Arquivo para baixar/);
  assert.match(html, /Leitura dentro da plataforma/);
  assert.match(html, /Sem arquivo ativo/);
});

test("biblioteca comunica quando ainda não há materiais", () => {
  const html = renderToStaticMarkup(
    createElement(BibliotecaMateriais, { materiais: [], idsComArquivo: [] }),
  );
  assert.match(html, /Nenhum material foi publicado na biblioteca ainda/);
});

test("leitura no app aceita somente HTML ou PDF, independentemente da caixa", () => {
  assert.equal(extensaoDoArquivo("7/v2-GUIA.PDF"), "pdf");
  assert.doesNotThrow(() => validarArquivoParaLeitura("material.HTML"));
  assert.doesNotThrow(() => validarArquivoParaLeitura("material.pdf"));
  assert.throws(() => validarArquivoParaLeitura("kit.docx"), /apenas HTML ou PDF/);
  assert.throws(() => validarArquivoParaLeitura("sem-extensao"), /modo Download/);
});

test("remoção falha fechada e nunca deixa card visível apontando para objeto apagado", async () => {
  const ordem: string[] = [];
  const sucesso = await removerMaterialComSeguranca(12, {
    async listarObjetos(id) {
      ordem.push(`listar:${id}`);
      return ["12/v1-guia.pdf"];
    },
    async excluirMetadados(id) {
      ordem.push(`excluir:${id}`);
    },
    async removerObjetos(caminhos) {
      ordem.push(`storage:${caminhos.join(",")}`);
    },
  });
  assert.deepEqual(ordem, ["listar:12", "excluir:12", "storage:12/v1-guia.pdf"]);
  assert.equal(sucesso.limpezaStorageFalhou, false);

  const semObjeto = await removerMaterialComSeguranca(13, {
    async listarObjetos() {
      return [];
    },
    async excluirMetadados() {
      ordem.push("excluir-sem-objeto");
    },
    async removerObjetos() {
      assert.fail("Storage não deve ser chamado sem objetos");
    },
  });
  assert.equal(semObjeto.limpezaStorageFalhou, false);
});

test("falha do Storage deixa apenas órfão privado e falha de listagem não exclui metadados", async () => {
  let excluiu = false;
  const limpezaPendente = await removerMaterialComSeguranca(14, {
    async listarObjetos() {
      return ["14/v1-kit.zip"];
    },
    async excluirMetadados() {
      excluiu = true;
    },
    async removerObjetos() {
      throw new Error("storage indisponível");
    },
  });
  assert.equal(excluiu, true);
  assert.equal(limpezaPendente.limpezaStorageFalhou, true);

  excluiu = false;
  await assert.rejects(
    removerMaterialComSeguranca(15, {
      async listarObjetos() {
        throw new Error("consulta indisponível");
      },
      async excluirMetadados() {
        excluiu = true;
      },
      async removerObjetos() {},
    }),
    /consulta indisponível/,
  );
  assert.equal(excluiu, false);
});

test("decide leitura, download e modo inválido sem confundir os destinos", () => {
  assert.deepEqual(destinoDoMaterial(9, "download"), {
    tipo: "download",
    caminho: "/api/download/9",
  });
  assert.deepEqual(destinoDoMaterial(9, "leitura"), { tipo: "leitura" });
  assert.deepEqual(destinoDoMaterial(9, "desconhecido"), { tipo: "invalido" });
  assert.deepEqual(OPCOES_DOWNLOAD_ASSINADO, { download: true });
});

test("aceita postMessage somente da janela isolada do iframe do material", () => {
  const janela = {} as Window;
  assert.equal(mensagemVeioDoMaterial({ source: janela, origin: "null" }, janela), true);
  assert.equal(mensagemVeioDoMaterial({ source: {} as Window, origin: "null" }, janela), false);
  assert.equal(
    mensagemVeioDoMaterial({ source: janela, origin: "https://app.test" }, janela),
    false,
  );
  assert.equal(mensagemVeioDoMaterial({ source: null, origin: "null" }, undefined), false);
});
