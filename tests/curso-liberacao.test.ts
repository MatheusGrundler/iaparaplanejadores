import assert from "node:assert/strict";
import test from "node:test";
import {
  carregarMapaLiberacoesAluno,
  mapaLiberacoes,
  semanaEstaLiberada,
} from "../lib/curso-liberacao-regra";

test("etapas ausentes permanecem bloqueadas", () => {
  const liberacoes = mapaLiberacoes([]);

  for (const semana of ["semana-0", "semana-1", "semana-2", "semana-3", "semana-4"] as const) {
    assert.equal(semanaEstaLiberada(liberacoes, semana), false);
  }
});

test("somente uma liberação explícita abre a etapa", () => {
  const liberacoes = mapaLiberacoes([
    { semana_key: "semana-0", liberada: false },
    { semana_key: "semana-2", liberada: true },
    { semana_key: "semana-inexistente", liberada: true },
  ]);

  assert.equal(semanaEstaLiberada(liberacoes, "semana-0"), false);
  assert.equal(semanaEstaLiberada(liberacoes, "semana-1"), false);
  assert.equal(semanaEstaLiberada(liberacoes, "semana-2"), true);
  assert.equal(semanaEstaLiberada(liberacoes, "semana-3"), false);
  assert.equal(semanaEstaLiberada(liberacoes, "semana-4"), false);
});

test("admin pode pré-visualizar todas as etapas", () => {
  const liberacoes = mapaLiberacoes([], true);

  for (const semana of ["semana-0", "semana-1", "semana-2", "semana-3", "semana-4"] as const) {
    assert.equal(semanaEstaLiberada(liberacoes, semana), true);
  }
});

test("ajuste individual prevalece sobre a liberação da turma", () => {
  const liberacoes = mapaLiberacoes(
    [
      { semana_key: "semana-1", liberada: true },
      { semana_key: "semana-2", liberada: false },
    ],
    false,
    [
      { etapa_key: "semana-1", liberada: false },
      { etapa_key: "semana-2", liberada: true },
    ],
  );

  assert.equal(semanaEstaLiberada(liberacoes, "semana-1"), false);
  assert.equal(semanaEstaLiberada(liberacoes, "semana-2"), true);
});

test("aluno sem turma também pode receber uma liberação individual", () => {
  const liberacoes = mapaLiberacoes([], false, [{ etapa_key: "semana-3", liberada: true }]);

  assert.equal(semanaEstaLiberada(liberacoes, "semana-3"), true);
  assert.equal(semanaEstaLiberada(liberacoes, "semana-4"), false);
});

test("carrega turma e aluno em paralelo e aplica a precedência individual", async () => {
  const chamadas: string[] = [];
  const resultado = await carregarMapaLiberacoesAluno(8, "aluna@exemplo.com", {
    async carregarTurma(turmaId) {
      chamadas.push(`turma:${turmaId}`);
      return { data: [{ semana_key: "semana-1", liberada: true }], error: null };
    },
    async carregarAluno(email) {
      chamadas.push(`aluno:${email}`);
      return { data: [{ etapa_key: "semana-1", liberada: false }], error: null };
    },
  });

  assert.deepEqual(chamadas, ["turma:8", "aluno:aluna@exemplo.com"]);
  assert.equal(resultado.erro, undefined);
  assert.equal(semanaEstaLiberada(resultado.liberacoes, "semana-1"), false);
});

test("consulta ajuste individual sem exigir turma e falha fechada em erro", async () => {
  let consultouTurma = false;
  const semTurma = await carregarMapaLiberacoesAluno(null, "aluna@exemplo.com", {
    async carregarTurma() {
      consultouTurma = true;
      return { data: [], error: null };
    },
    async carregarAluno() {
      return { data: [{ etapa_key: "semana-4", liberada: true }], error: null };
    },
  });
  assert.equal(consultouTurma, false);
  assert.equal(semanaEstaLiberada(semTurma.liberacoes, "semana-4"), true);

  const comErro = await carregarMapaLiberacoesAluno(9, "aluna@exemplo.com", {
    async carregarTurma() {
      return { data: null, error: { code: "falha_turma" } };
    },
    async carregarAluno() {
      return { data: [{ etapa_key: "semana-4", liberada: true }], error: null };
    },
  });
  assert.equal(comErro.erro, "falha_turma");
  assert.equal(semanaEstaLiberada(comErro.liberacoes, "semana-4"), false);
});
