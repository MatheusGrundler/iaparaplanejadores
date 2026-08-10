import assert from "node:assert/strict";
import test from "node:test";
import { assinaturaAnexoValida, jsonAnexoValido } from "../lib/curso-anexos";

test("reconhece assinaturas reais de PNG, JPEG e WebP", () => {
  assert.equal(
    assinaturaAnexoValida(
      "image/png",
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    true,
  );
  assert.equal(
    assinaturaAnexoValida("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    true,
  );
  assert.equal(
    assinaturaAnexoValida(
      "image/webp",
      Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
    ),
    true,
  );
});

test("rejeita arquivo disfarçado apenas pelo Content-Type", () => {
  const texto = new TextEncoder().encode("isto não é uma imagem");
  assert.equal(assinaturaAnexoValida("image/png", texto), false);
  assert.equal(assinaturaAnexoValida("image/jpeg", texto), false);
  assert.equal(assinaturaAnexoValida("image/webp", texto), false);
});

test("aceita somente JSON objeto e bem formado", () => {
  assert.equal(jsonAnexoValido('{"nodes":[]}'), true);
  assert.equal(jsonAnexoValido("[]"), false);
  assert.equal(jsonAnexoValido("não é json"), false);
});
