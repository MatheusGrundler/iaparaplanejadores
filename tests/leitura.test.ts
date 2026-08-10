import assert from "node:assert/strict";
import test from "node:test";
import { clampSegundos, formataTempo, rotuloStatus, validaStatus } from "../lib/leitura";

test("aceita apenas os três status conhecidos", () => {
  assert.equal(validaStatus("lido"), "lido");
  assert.equal(validaStatus("entendido"), "entendido");
  assert.equal(validaStatus("duvida"), "duvida");
  assert.equal(validaStatus("outro"), null);
  assert.equal(validaStatus(42), null);
  assert.equal(validaStatus(null), null);
});

test("pulsos de tempo são limitados a 1..120 segundos", () => {
  assert.equal(clampSegundos(15), 15);
  assert.equal(clampSegundos(120), 120);
  assert.equal(clampSegundos(9999), 120);
  assert.equal(clampSegundos(0), 0);
  assert.equal(clampSegundos(-30), 0);
  assert.equal(clampSegundos("não-é-número"), 0);
});

test("formata o tempo de leitura de forma legível", () => {
  assert.equal(formataTempo(0), "—");
  assert.equal(formataTempo(45), "45 s");
  assert.equal(formataTempo(60), "1 min");
  assert.equal(formataTempo(59 * 60), "59 min");
  assert.equal(formataTempo(3600), "1 h");
  assert.equal(formataTempo(3900), "1 h 05 min");
});

test("rótulos de status em português, com traço para o vazio", () => {
  assert.equal(rotuloStatus("lido"), "Lido");
  assert.equal(rotuloStatus("entendido"), "Entendido");
  assert.equal(rotuloStatus("duvida"), "Com dúvidas");
  assert.equal(rotuloStatus(null), "—");
});
