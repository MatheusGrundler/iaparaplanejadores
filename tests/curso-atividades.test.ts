import assert from "node:assert/strict";
import test from "node:test";
import {
  ATIVIDADES,
  atividadePorKey,
  extensaoDoAnexo,
  validaRespostas,
} from "../lib/curso-atividades";

test("o catálogo contém atividades para todas as etapas", () => {
  assert.deepEqual(
    new Set(Object.values(ATIVIDADES).map((atividade) => atividade.semanaKey)),
    new Set(["semana-0", "semana-1", "semana-2", "semana-3", "semana-4"]),
  );
});

test("rascunho aceita campo obrigatório incompleto e remove chaves desconhecidas", () => {
  const atividade = atividadePorKey("semana-1-quest");
  assert.ok(atividade);
  const resultado = validaRespostas(
    atividade,
    { como_ajuda: "", segredo: "não deve ser persistido" },
    false,
  );
  assert.equal(resultado.erro, null);
  assert.deepEqual(resultado.respostas, { como_ajuda: "" });
});

test("envio final exige os campos definidos pela Quest", () => {
  const atividade = atividadePorKey("semana-1-quest");
  assert.ok(atividade);
  const resultado = validaRespostas(atividade, { como_ajuda: "" }, true);
  assert.match(resultado.erro ?? "", /Preencha/);
});

test("links aceitam somente http e https", () => {
  const atividade = atividadePorKey("semana-2-quest");
  assert.ok(atividade);
  const base = {
    decisao_visual: "Usei uma hierarquia simples para tornar o próximo passo mais claro.",
  };
  assert.match(
    validaRespostas(atividade, { ...base, landing_url: "javascript:alert(1)" }, true).erro ?? "",
    /Revise o link/,
  );
  assert.equal(
    validaRespostas(atividade, { ...base, landing_url: "https://exemplo.com" }, true).erro,
    null,
  );
});

test("extensões de anexos são derivadas de uma lista fechada", () => {
  assert.equal(extensaoDoAnexo("image/png"), "png");
  assert.equal(extensaoDoAnexo("application/json"), "json");
  assert.equal(extensaoDoAnexo("image/svg+xml"), null);
  assert.equal(extensaoDoAnexo("text/html"), null);
});
