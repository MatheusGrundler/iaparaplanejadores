import assert from "node:assert/strict";
import test from "node:test";
import { expiracaoEfetiva, normalizeEmail } from "../lib/access";

test("normaliza o e-mail antes das consultas de autorização", () => {
  assert.equal(normalizeEmail("  ALUNA@EXEMPLO.COM "), "aluna@exemplo.com");
});

test("a expiração individual prevalece sobre a da turma", () => {
  const limite = expiracaoEfetiva(
    "2026-08-10T12:00:00.000Z",
    "2026-12-31T23:59:59.000Z"
  );

  assert.equal(limite?.toISOString(), "2026-08-10T12:00:00.000Z");
});

test("usa a expiração da turma quando não há override individual", () => {
  const limite = expiracaoEfetiva(null, "2026-12-31T23:59:59.000Z");
  assert.equal(limite?.toISOString(), "2026-12-31T23:59:59.000Z");
});

test("datas vazias significam acesso sem prazo", () => {
  assert.equal(expiracaoEfetiva(null, null), null);
});

test("uma data inválida falha fechada em vez de liberar acesso silenciosamente", () => {
  assert.throws(() => expiracaoEfetiva("não-é-data", null), RangeError);
});
