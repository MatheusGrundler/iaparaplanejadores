import assert from "node:assert/strict";
import test from "node:test";
import { fonteRepositorio as fonte } from "./fixtures/fonte-repositorio";

test("migration mantém a comunidade server-only e impede publicação vazia", async () => {
  const [sql, grants, sequencia, rpc] = await Promise.all([
    fonte("supabase/migrations/20260810212044_comunidade_rica_com_anexos.sql"),
    fonte("supabase/migrations/20260810212159_harden_comunidade_grants.sql"),
    fonte("supabase/migrations/20260810212234_harden_comunidade_sequence_grants.sql"),
    fonte("supabase/migrations/20260810212427_harden_member_rpc_and_post_fk.sql"),
  ]);
  assert.match(sql, /create table if not exists public\.post_anexos/);
  assert.match(sql, /posts_impedir_publicacao_vazia/);
  assert.match(sql, /Cada publicação aceita no máximo 10 anexos/);
  assert.match(sql, /revoke all on table public\.posts from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.post_anexos from public, anon, authenticated/);
  assert.match(sql, /'comunidade-anexos'[\s\S]*false,[\s\S]*104857600/);
  assert.doesNotMatch(sql, /create policy[\s\S]+comunidade-anexos/i);
  assert.match(grants, /revoke all on table public\.posts from service_role/);
  assert.match(sequencia, /from public, anon, authenticated, service_role/);
  assert.match(rpc, /drop function if exists public\.is_member\(\)/);
  assert.match(rpc, /post_anexos_post_user_idx/);
});

test("API cria rascunho, assina caminho imutável e só então publica", async () => {
  const [criar, anexos, publicar] = await Promise.all([
    fonte("app/api/comunidade/publicacoes/route.ts"),
    fonte("app/api/comunidade/publicacoes/[id]/anexos/route.ts"),
    fonte("app/api/comunidade/publicacoes/[id]/route.ts"),
  ]);
  assert.match(criar, /publicado: false/);
  assert.match(criar, /user_id: identity\.userId/);
  assert.match(anexos, /createSignedUploadUrl\(path, \{ upsert: false \}\)/);
  assert.match(anexos, /token: upload\.token/);
  assert.match(anexos, /validarObjetoComunidade/);
  assert.match(publicar, /status", "pronto"/);
  assert.match(publicar, /update\(\{ publicado: true \}\)/);
});

test("sanitizador preserva o limite antigo e a comunidade pede 50 mil", async () => {
  const [sanitiza, comunidade] = await Promise.all([
    fonte("lib/sanitiza.ts"),
    fonte("lib/comunidade.ts"),
  ]);
  assert.match(sanitiza, /sanitizaRico\(html: string, limite = 20000\)/);
  assert.match(sanitiza, /slice\(0, limite\)/);
  assert.match(comunidade, /sanitizaRico\(valor, LIMITE_HTML_COMUNIDADE\)/);
  assert.match(comunidade, /LIMITE_HTML_COMUNIDADE = 50_000/);
});
