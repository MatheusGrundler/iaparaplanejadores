import assert from "node:assert/strict";
import test from "node:test";
import {
  chaveFormulario,
  novoAnexoFormulario,
  novoCampoFormulario,
  novoFormulario,
  trocarTipoCampo,
} from "../../lib/formularios/fabricas";
import { REGISTRO_FORMULARIOS } from "../../lib/formularios/seeds";
import type { AnexoFormulario, DefinicaoFormulario } from "../../lib/formularios/schema";
import {
  validarArquivoFormulario,
  validarDefinicaoFormulario,
  validarEnvioFormulario,
} from "../../lib/formularios/validacao";

function codigosDaValidacao(valor: unknown) {
  const resultado = validarDefinicaoFormulario(valor);
  assert.equal(resultado.valido, false);
  return new Set(resultado.problemas.map((problema) => problema.codigo));
}

test("fábricas criam chaves e controles válidos para o construtor", () => {
  assert.equal(chaveFormulario("  Relatório de Alocação 2026!  "), "relatorio-de-alocacao-2026");
  assert.equal(chaveFormulario("???", "fallback-seguro"), "fallback-seguro");

  const texto = novoCampoFormulario(0, "text");
  const selecao = novoCampoFormulario(1, "select");
  const anexo = novoAnexoFormulario(0);
  assert.equal(texto.chave, "campo-1");
  assert.equal(texto.maximoCaracteres, 240);
  assert.equal(selecao.chave, "campo-2");
  assert.equal(selecao.tipo, "select");
  assert.deepEqual(selecao.opcoes, [{ valor: "opcao-1", rotulo: "Opção 1" }]);
  assert.equal(anexo.tamanhoMaximoBytes, 10 * 1024 * 1024);

  const convertido = trocarTipoCampo(texto, "select");
  assert.equal(convertido.tipo, "select");
  assert.equal(convertido.opcoes.length, 1);
  const restaurado = trocarTipoCampo(convertido, "textarea");
  assert.equal(restaurado.tipo, "textarea");
  assert.equal("opcoes" in restaurado, false);

  assert.equal(novoFormulario("quest").workflow.tipo, "quest");
  assert.equal(novoFormulario("duvida").workflow.tipo, "duvida");
});

test("validação da definição rejeita estrutura, workflow e publicação incompatíveis", () => {
  assert.ok(codigosDaValidacao(null).has("objeto_invalido"));
  const base = REGISTRO_FORMULARIOS.obter("quest-etapa-1");
  const codigos = codigosDaValidacao({
    ...base,
    schemaVersion: 99,
    codigo: "Código Inválido",
    versao: 0,
    publicacao: "inexistente",
    titulo: "",
    workflow: {
      ...base.workflow,
      multiplicidade: "multiplo",
      rascunho: { autosave: false, esperaMs: 20 },
      revisao: { habilitada: false, bloqueiaEdicao: false },
    },
  });
  assert.equal(codigos.has("schema_incompativel"), true);
  assert.equal(codigos.has("chave_invalida"), true);
  assert.equal(codigos.has("versao_invalida"), true);
  assert.equal(codigos.has("publicacao_invalida"), true);
  assert.equal(codigos.has("texto_obrigatorio"), true);
  assert.equal(codigos.has("quest_nao_unica"), true);
  assert.equal(codigos.has("autosave_ausente"), true);
  assert.equal(codigos.has("bloqueio_ausente"), true);
});

test("validação da definição protege campos, opções e anexos", () => {
  const base = novoFormulario("duvida");
  const codigos = codigosDaValidacao({
    ...base,
    workflow: {
      ...base.workflow,
      multiplicidade: "unico",
      rascunho: { autosave: true },
      resposta: { habilitada: false, rotuloAutor: "" },
    },
    campos: [
      {
        chave: "escolha",
        rotulo: "Escolha",
        tipo: "select",
        obrigatorio: true,
        minimoCaracteres: 5,
        maximoCaracteres: 2,
        opcoes: [
          { valor: "igual", rotulo: "Primeira" },
          { valor: "igual", rotulo: "Segunda" },
        ],
      },
      null,
    ],
    anexos: [
      {
        chave: "arquivo",
        rotulo: "Arquivo",
        ajuda: "",
        maximoArquivos: 0,
        tamanhoMaximoBytes: 11 * 1024 * 1024,
        tiposAceitos: ["application/pdf"],
      },
      null,
    ],
  });
  for (const codigo of [
    "duvida_nao_repetivel",
    "rascunho_invalido",
    "resposta_ausente",
    "minimo_invalido",
    "opcao_duplicada",
    "campo_invalido",
    "anexo_invalido",
    "maximo_arquivos",
    "tamanho_arquivo",
    "mime_invalido",
  ]) {
    assert.equal(codigos.has(codigo), true, codigo);
  }
});

test("envio valida formatos, opções, limites de texto e arquivos", () => {
  const definicao: DefinicaoFormulario = {
    ...novoFormulario("quest"),
    codigo: "quest-validacao",
    publicacao: "publicado",
    campos: [
      {
        chave: "email",
        rotulo: "E-mail",
        tipo: "email",
        obrigatorio: true,
        minimoCaracteres: 5,
        maximoCaracteres: 100,
      },
      {
        chave: "site",
        rotulo: "Site",
        tipo: "url",
        maximoCaracteres: 200,
      },
      {
        chave: "perfil",
        rotulo: "Perfil",
        tipo: "select",
        maximoCaracteres: 20,
        opcoes: [{ valor: "a", rotulo: "Perfil A" }],
      },
    ],
    anexos: [{ ...novoAnexoFormulario(0), obrigatorio: true }],
  };
  const invalido = validarEnvioFormulario(
    definicao,
    { email: "x", site: "javascript:alert(1)", perfil: "b", ignorado: "fora" },
    [],
    "envio",
  );
  assert.equal(invalido.valido, false);
  assert.match(invalido.errosCampos.email, /ao menos/);
  assert.match(invalido.errosCampos.site, /http/);
  assert.match(invalido.errosCampos.perfil, /opções/);
  assert.match(invalido.errosAnexos["anexo-1"], /Envie/);
  assert.equal("ignorado" in invalido.valores, false);

  const anexo: AnexoFormulario = {
    id: "arquivo-1",
    campo: "anexo-1",
    nome: "arquivo.png",
    mime: "image/png",
    bytes: 100,
    url: null,
  };
  const valido = validarEnvioFormulario(
    definicao,
    { email: "aluno@example.com", site: "https://example.com", perfil: "a" },
    [anexo],
    "envio",
  );
  assert.equal(valido.valido, true);
});

test("validação de arquivo falha fechada e normaliza MIME", () => {
  const campo = novoAnexoFormulario(0);
  assert.match(
    validarArquivoFormulario(campo, { name: "extra.png", type: "image/png", size: 1 }, 1)!,
    /limite/,
  );
  assert.match(
    validarArquivoFormulario(campo, { name: "doc.pdf", type: "application/pdf", size: 1 }, 0)!,
    /formato/,
  );
  assert.match(
    validarArquivoFormulario(campo, { name: "vazio.png", type: "image/png", size: 0 }, 0)!,
    /até 10 MB/,
  );
  assert.equal(
    validarArquivoFormulario(campo, { name: "foto.jpg", type: "IMAGE/JPEG", size: 1 }, 0),
    null,
  );
});
