import assert from "node:assert/strict";
import test from "node:test";
import { mapaLiberacoes, semanaEstaLiberada } from "../lib/curso-liberacao-regra";

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
