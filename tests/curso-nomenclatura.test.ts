import assert from "node:assert/strict";
import test from "node:test";
import { chaveEtapaDoSlug, rotuloEtapa, slugPublicoEtapa } from "../lib/curso-nomenclatura";

test("gera rótulos sem sugerir uma sequência semanal", () => {
  assert.equal(rotuloEtapa(0), "Preparação");
  assert.equal(rotuloEtapa(1), "Etapa 1");
  assert.equal(rotuloEtapa(4), "Etapa 4");
});

test("mantém chaves legadas fora da URL canônica", () => {
  assert.equal(slugPublicoEtapa("semana-0"), "preparacao");
  assert.equal(slugPublicoEtapa("semana-3"), "3");
  assert.equal(chaveEtapaDoSlug("preparacao"), "semana-0");
  assert.equal(chaveEtapaDoSlug("4"), "semana-4");
  assert.equal(chaveEtapaDoSlug("semana-2"), "semana-2");
  assert.equal(chaveEtapaDoSlug("nao-existe"), null);
});
