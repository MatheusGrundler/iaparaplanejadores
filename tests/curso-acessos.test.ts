import assert from "node:assert/strict";
import test from "node:test";
import { fonteRepositorio as fonte } from "./fixtures/fonte-repositorio";

test("etapa nativa monta o rastreador sem registrar a prévia administrativa", async () => {
  const [pagina, rastreador, rota] = await Promise.all([
    fonte("app/(aluno)/etapa/[slug]/page.tsx"),
    fonte("app/componentes/curso/RastreadorEtapa.tsx"),
    fonte("app/api/curso/acessos/[semana]/route.ts"),
  ]);

  assert.match(pagina, /<RastreadorEtapa semanaKey=\{chave\}/);
  assert.match(rastreador, /document\.visibilityState !== "visible"/);
  assert.match(rastreador, /navigator\.sendBeacon/);
  assert.match(rastreador, /removeEventListener\("pagehide", aoSair\)/);
  assert.match(rota, /obterIdentidadeEditavel\(/);
  assert.match(rota, /podeAcessarSemana\(identity, semana\)/);
  assert.match(rota, /\.rpc\("curso_acesso_registrar"/);
  assert.match(rota, /logEvento\(identity\.email, "etapa_aberta", undefined, semana\)/);
});

test("migração agrega pulsos de forma atômica e mantém a telemetria server-only", async () => {
  const migration = await fonte(
    "supabase/migrations/20260811031100_registrar_acessos_etapas.sql",
  );

  assert.match(migration, /create table public\.curso_acessos/);
  assert.match(migration, /unique \(user_id, semana_key\)/);
  assert.match(migration, /create or replace function public\.curso_acesso_registrar/);
  assert.match(migration, /on conflict \(user_id, semana_key\) do update/);
  assert.match(migration, /public\.curso_acessos\.segundos \+ v_segundos/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.curso_acessos from public, anon, authenticated/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
});

test("admin separa etapas, eventos e materiais e consulta os formulários reais", async () => {
  const [pagina, paginacao] = await Promise.all([
    fonte("app/admin/leituras/page.tsx"),
    fonte("app/admin/leituras/PaginacaoLeituras.tsx"),
  ]);

  assert.match(pagina, /Atividade nas etapas/);
  assert.match(pagina, /Atividade recente/);
  assert.match(pagina, /Leitura de materiais/);
  assert.match(pagina, /\.from\("curso_acessos"\)/);
  assert.match(pagina, /\.from\("quest_respostas"\)/);
  assert.match(pagina, /\.from\("curso_duvidas"\)/);
  assert.match(pagina, /\.from\("eventos"\)/);
  assert.match(pagina, /linhasAlunos\.filter\(\(linha\) => linha\.leitura\)/);
  assert.match(pagina, /Acessos de admin\/teste/);
  assert.match(pagina, /A medição de abertura e tempo começa a partir desta atualização/);
  assert.match(pagina, /calcularPaginacao/);
  assert.match(pagina, /PaginacaoLeituras/);
  assert.match(pagina, /\.range\(inicioEventos, inicioEventos \+ porPaginaEventos - 1\)/);
  assert.match(pagina, /paginaMaterial\$\{material\.id\}/);
  assert.match(paginacao, /Itens por página/);
});

test("novos envios identificam a etapa no evento", async () => {
  const [quest, duvida] = await Promise.all([
    fonte("app/api/curso/atividades/[atividade]/route.ts"),
    fonte("app/api/curso/duvidas/route.ts"),
  ]);

  assert.match(
    quest,
    /logEvento\(identity\.email, "quest_enviada", undefined, atividade\.semanaKey\)/,
  );
  assert.match(duvida, /logEvento\(identity\.email, "duvida_etapa", undefined, semanaKey\)/);
});
