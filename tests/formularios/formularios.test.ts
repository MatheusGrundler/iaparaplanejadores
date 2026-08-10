import assert from "node:assert/strict";
import test from "node:test";
import { ATIVIDADES } from "../../lib/curso-atividades";
import {
  FORMULARIOS_INICIAIS,
  REGISTRO_FORMULARIOS,
  definicaoQuestDeAtividade,
} from "../../lib/formularios/seeds";
import { RegistroFormularios } from "../../lib/formularios/registro";
import { criarAdaptadorFormularioEmMemoria } from "../../lib/formularios/adaptadores";
import { novoFormulario } from "../../lib/formularios/fabricas";
import {
  estadoVazio,
  type AnexoFormulario,
  type DefinicaoFormulario,
} from "../../lib/formularios/schema";
import {
  validarDefinicaoFormulario,
  validarEnvioFormulario,
} from "../../lib/formularios/validacao";

test("registro publica os seeds de Quest e Dúvida por código", () => {
  assert.equal(FORMULARIOS_INICIAIS.length, 11);
  assert.equal(REGISTRO_FORMULARIOS.listar().length, 11);
  assert.equal(REGISTRO_FORMULARIOS.obter("quest-etapa-1").workflow.tipo, "quest");
  assert.equal(REGISTRO_FORMULARIOS.obter("duvida-etapa-1").workflow.tipo, "duvida");
  assert.equal(
    REGISTRO_FORMULARIOS.obter("quest-etapa-1").metadados?.atividadeKey,
    "semana-1-quest",
  );
});

test("conversão preserva campos e o identificador da atividade atual", () => {
  const atual = ATIVIDADES["semana-4-quest"];
  const convertido = definicaoQuestDeAtividade(atual, "quest-automacao");
  assert.equal(convertido.codigo, "quest-automacao");
  assert.equal(convertido.campos.length, atual.campos.length);
  assert.equal(convertido.anexos[0].tiposAceitos.includes("application/json"), true);
  assert.equal(convertido.metadados?.atividadeKey, atual.key);
});

test("rascunho aceita incompletos e envio final exige campo e anexo", () => {
  const definicao = REGISTRO_FORMULARIOS.obter("quest-etapa-1");
  const vazio = estadoVazio(definicao);
  const rascunho = validarEnvioFormulario(
    definicao,
    vazio.atual.valores,
    vazio.atual.anexos,
    "rascunho",
  );
  assert.equal(rascunho.valido, true);

  const envioIncompleto = validarEnvioFormulario(
    definicao,
    vazio.atual.valores,
    vazio.atual.anexos,
    "envio",
  );
  assert.equal(envioIncompleto.valido, false);
  assert.match(envioIncompleto.errosCampos.como_ajuda, /Preencha/);
  assert.match(envioIncompleto.errosAnexos.print_identidade, /Envie/);

  const anexo: AnexoFormulario = {
    id: "anexo-1",
    campo: "print_identidade",
    nome: "conversa.png",
    mime: "image/png",
    bytes: 1_000,
    url: null,
  };
  const completo = validarEnvioFormulario(
    definicao,
    { como_ajuda: "Preparar o rascunho do acompanhamento semanal." },
    [anexo],
    "envio",
  );
  assert.equal(completo.valido, true);
});

test("definição recusa chaves duplicadas entre resposta e anexo", () => {
  const base = definicaoQuestDeAtividade(ATIVIDADES["semana-1-quest"], "quest-duplicada");
  const invalida: DefinicaoFormulario = {
    ...base,
    anexos: [{ ...base.anexos[0], chave: base.campos[0].chave }],
  };
  const resultado = validarDefinicaoFormulario(invalida);
  assert.equal(resultado.valido, false);
  assert.equal(
    resultado.problemas.some((item) => item.codigo === "chave_duplicada"),
    true,
  );
});

test("registro escolhe a maior versão publicada", () => {
  const base = REGISTRO_FORMULARIOS.obter("duvida-etapa-1");
  const registro = new RegistroFormularios([
    base,
    { ...base, versao: 2, publicacao: "rascunho", titulo: "Rascunho dois" },
    { ...base, versao: 3, titulo: "Versão três" },
  ]);
  assert.equal(registro.obter(base.codigo).versao, 3);
  assert.equal(registro.obter(base.codigo, { versao: 2, incluirNaoPublicados: true }).versao, 2);
  assert.equal(registro.buscar(base.codigo, { versao: 2 }), null);
});

test("adapter em memória salva, envia e bloqueia Quest revisada", async () => {
  const definicao: DefinicaoFormulario = {
    ...novoFormulario("quest"),
    codigo: "quest-teste",
    publicacao: "publicado",
  };
  let contador = 0;
  const adapter = criarAdaptadorFormularioEmMemoria({
    gerarId: () => `id-${++contador}`,
    agora: () => new Date("2026-08-10T12:00:00.000Z"),
  });
  const inicial = await adapter.carregar({ definicao });
  const editado = {
    ...inicial,
    atual: { ...inicial.atual, valores: { "campo-1": "Uma resposta" } },
  };
  const salvo = await adapter.salvarRascunho?.({ definicao, estado: editado });
  assert.equal(salvo?.atual.status, "rascunho");
  const enviado = await adapter.enviar({ definicao, estado: salvo! });
  assert.equal(enviado.atual.status, "enviado");
  const revisado = await adapter.revisar?.({
    definicao,
    registroId: enviado.atual.id,
  });
  assert.equal(revisado?.atual.status, "revisado");
  await assert.rejects(
    () => adapter.salvarRascunho!({ definicao, estado: revisado! }),
    /já foi revisada/,
  );
});

test("adapter em memória mantém dúvidas repetíveis e permite resposta", async () => {
  const definicao = REGISTRO_FORMULARIOS.obter("duvida-etapa-2");
  let contador = 0;
  const adapter = criarAdaptadorFormularioEmMemoria({
    gerarId: () => `duvida-${++contador}`,
    agora: () => new Date("2026-08-10T13:00:00.000Z"),
  });
  const inicial = await adapter.carregar({ definicao });
  const primeiro = await adapter.enviar({
    definicao,
    estado: {
      ...inicial,
      atual: {
        ...inicial.atual,
        valores: { pergunta: "Como eu publico a página da Etapa 2?" },
      },
    },
  });
  assert.equal(primeiro.historico.length, 1);
  assert.equal(primeiro.atual.valores.pergunta, "");

  const respondido = await adapter.responder?.({
    definicao,
    registroId: primeiro.historico[0].id,
    texto: "Use o preview e depois faça o deploy.",
    autor: "Resposta do Matheus",
  });
  assert.equal(respondido?.historico[0].status, "respondido");
  assert.equal(respondido?.historico[0].resposta?.texto, "Use o preview e depois faça o deploy.");
});
