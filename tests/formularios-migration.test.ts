import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);

async function migration(nome: string) {
  return readFile(new URL(`supabase/migrations/${nome}`, raiz), "utf8");
}

test("catálogo de formulários é versionado, imutável e server-only", async () => {
  const sql = await migration("20260810190238_formularios_versionados_independentes.sql");

  assert.match(sql, /create table public\.curso_formularios/);
  assert.match(sql, /create table public\.curso_formulario_versoes/);
  assert.match(sql, /Versões publicadas ou arquivadas são imutáveis/);
  assert.match(sql, /Código, tipo e etapa do formulário não podem ser alterados/);
  assert.match(sql, /alter table public\.curso_formularios enable row level security/);
  assert.match(sql, /from public, anon, authenticated, service_role/);
  assert.match(sql, /to service_role/);
});

test("respostas preservam a versão do formulário e o fallback tem catálogo fechado", async () => {
  const sql = await migration("20260810190238_formularios_versionados_independentes.sql");

  assert.match(sql, /add column formulario_versao_id uuid/);
  assert.match(sql, /quest_respostas_guard_formulario/);
  assert.match(sql, /curso_duvidas_guard_formulario/);
  assert.match(sql, /Resposta fora do catálogo em código/);
  assert.match(sql, /Dúvida fora do catálogo em código/);
  assert.match(sql, /formulario_versao_id is null or formulario_codigo is not null/);
});

test("guard de anexos usa limite versionado e falha fechado", async () => {
  const sql = await migration("20260810190238_formularios_versionados_independentes.sql");

  assert.match(sql, /curso_formulario_versoes/);
  assert.match(sql, /maximoArquivos/);
  assert.match(sql, /limite is null or limite < 1 or limite > 20/);
  assert.match(sql, /Campo de anexo fora do catálogo/);
});
