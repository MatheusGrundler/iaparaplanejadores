import assert from "node:assert/strict";
import test from "node:test";
import {
  assinaturaComunidadeValida,
  resolverMimeComunidade,
  validarNovoAnexoComunidade,
} from "../lib/comunidade-anexos";

test("normaliza MIME vazio e aliases usando o nome do arquivo", () => {
  assert.equal(resolverMimeComunidade("", "audio.m4a"), "audio/mp4");
  assert.equal(resolverMimeComunidade("audio/x-wav", "audio.wav"), "audio/wav");
  assert.equal(resolverMimeComunidade("application/vnd.ms-excel", "dados.csv"), "text/csv");
  assert.equal(
    resolverMimeComunidade("application/octet-stream", "aula.pptx"),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
  assert.equal(resolverMimeComunidade("text/html", "pagina.txt"), null);
});

test("aplica limite específico de imagem, áudio, vídeo e documento", () => {
  assert.ok("mime" in validarNovoAnexoComunidade("image/png", 10 * 1024 * 1024, "foto.png"));
  assert.ok("erro" in validarNovoAnexoComunidade("image/png", 10 * 1024 * 1024 + 1, "foto.png"));
  assert.ok("mime" in validarNovoAnexoComunidade("audio/mpeg", 50 * 1024 * 1024, "voz.mp3"));
  assert.ok("mime" in validarNovoAnexoComunidade("video/mp4", 100 * 1024 * 1024, "aula.mp4"));
  assert.ok(
    "erro" in validarNovoAnexoComunidade("application/pdf", 25 * 1024 * 1024 + 1, "guia.pdf"),
  );
});

test("confere magic bytes dos formatos renderizados e baixados", () => {
  assert.equal(
    assinaturaComunidadeValida("image/gif", new TextEncoder().encode("GIF89a restante")),
    true,
  );
  assert.equal(
    assinaturaComunidadeValida(
      "video/mp4",
      Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    ),
    true,
  );
  assert.equal(
    assinaturaComunidadeValida("application/pdf", new TextEncoder().encode("%PDF-1.7")),
    true,
  );
  assert.equal(
    assinaturaComunidadeValida("application/pdf", new TextEncoder().encode("<script>")),
    false,
  );
  assert.equal(assinaturaComunidadeValida("text/plain", Uint8Array.from([65, 0, 66])), false);
});
