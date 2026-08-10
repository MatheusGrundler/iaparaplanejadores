import assert from "node:assert/strict";
import test from "node:test";
import { fonteRepositorio as fonte } from "./fixtures/fonte-repositorio";

function ocorrencias(texto: string, trecho: string) {
  return texto.split(trecho).length - 1;
}

test("dashboard usa o registro em código e as liberações simples da turma", async () => {
  const [dashboard, layout] = await Promise.all([
    fonte("app/(aluno)/page.tsx"),
    fonte("app/(aluno)/layout.tsx"),
  ]);

  assert.match(dashboard, /CONTEUDOS_NATIVOS/);
  assert.match(dashboard, /carregarLiberacoesSemanas/);
  assert.doesNotMatch(dashboard, /carregarTrilhaDoMembro|turma_etapas/);
  assert.doesNotMatch(dashboard, /href=["']\/arquivo["']/);
  assert.match(layout, /href=["']\/arquivo["']/);
  assert.match(layout, /Biblioteca de materiais/);
});

test("endereço direto e todas as mutações conferem a liberação pelo formulário", async () => {
  const [pagina, paginaLegada, atividade, anexos, duvidas, servidor] = await Promise.all([
    fonte("app/(aluno)/etapa/[slug]/page.tsx"),
    fonte("app/(aluno)/semana/[slug]/page.tsx"),
    fonte("app/api/curso/atividades/[atividade]/route.ts"),
    fonte("app/api/curso/atividades/[atividade]/anexos/route.ts"),
    fonte("app/api/curso/duvidas/route.ts"),
    fonte("lib/formularios/server.ts"),
  ]);

  assert.match(pagina, /carregarLiberacoesSemanas\(identity\)/);
  assert.match(pagina, /semanaEstaLiberada\(liberacoes, chave\)/);
  assert.match(pagina, /etapa-bloqueada=\$\{slugCanonico\}/);
  assert.match(paginaLegada, /redirect\(`\/etapa\//);
  assert.ok(ocorrencias(atividade, "await resolverQuestDoUsuario(") >= 1);
  assert.ok(ocorrencias(anexos, "await resolverQuestDoUsuario(") >= 3);
  assert.ok(ocorrencias(duvidas, "await resolverFormularioDoUsuario(") >= 2);
  assert.match(servidor, /podeAcessarSemana\(identity, formulario\.semanaKey\)/);
  assert.doesNotMatch(atividade, /turma_etapa_id|conteudo_versao_id/);
  assert.doesNotMatch(anexos, /turma_etapa_id|conteudo_versao_id/);
  assert.doesNotMatch(duvidas, /turma_etapa_id|conteudo_versao_id/);
  assert.match(atividade, /formulario_versao_id/);
  assert.match(duvidas, /formulario_codigo/);
});

test("prévia administrativa permanece somente leitura", async () => {
  const [embed, ponte, atividade, anexos, duvidas] = await Promise.all([
    fonte("app/componentes/curso/Formulario.tsx"),
    fonte("app/componentes/curso/FormularioCurso.tsx"),
    fonte("app/api/curso/atividades/[atividade]/route.ts"),
    fonte("app/api/curso/atividades/[atividade]/anexos/route.ts"),
    fonte("app/api/curso/duvidas/route.ts"),
  ]);

  assert.match(embed, /somenteLeitura=\{identity\.admin\}/);
  assert.match(ponte, /somenteLeitura=\{somenteLeitura\}/);
  assert.ok(ocorrencias(atividade, "A prévia administrativa é somente leitura.") >= 1);
  assert.ok(ocorrencias(anexos, "A prévia administrativa é somente leitura.") >= 3);
  assert.ok(ocorrencias(duvidas, "A prévia administrativa é somente leitura.") >= 1);
});

test("URLs antigas convergem para a rota canônica sem expor a chave interna", async () => {
  const [dashboard, etapa, legada, nomenclatura] = await Promise.all([
    fonte("app/(aluno)/page.tsx"),
    fonte("app/(aluno)/etapa/[slug]/page.tsx"),
    fonte("app/(aluno)/semana/[slug]/page.tsx"),
    fonte("lib/curso-nomenclatura.ts"),
  ]);

  assert.match(dashboard, /`\/etapa\/\$\{slugPublicoEtapa\(semana\.slug\)\}`/);
  assert.match(etapa, /slug !== slugCanonico/);
  assert.match(legada, /redirect\(`\/etapa\/\$\{slugPublicoEtapa\(chave\)\}`\)/);
  assert.match(nomenclatura, /"semana-0": "preparacao"/);
  assert.match(nomenclatura, /"semana-4": "4"/);
});

test("admin controla turma_semanas e a cadeia nova não recria o CMS", async () => {
  const [pagina, acoes, controle, individual, cms, remocao] = await Promise.all([
    fonte("app/admin/semanas/page.tsx"),
    fonte("app/admin/actions.ts"),
    fonte("supabase/migrations/20260810173132_controle_liberacao_etapas_por_turma.sql"),
    fonte("supabase/migrations/20260810212036_liberacao_etapas_por_aluno.sql"),
    fonte("supabase/migrations/20260810173153_cms_conteudo_versionado_por_turma.sql"),
    fonte("supabase/migrations/20260810190311_remover_cms_conteudo.sql"),
  ]);

  assert.match(pagina, /Liberação das etapas/);
  assert.match(pagina, /definirLiberacaoSemana/);
  assert.match(pagina, /definirLiberacaoEtapaAluno/);
  assert.match(acoes, /\.from\("turma_semanas"\)/);
  assert.match(acoes, /\.from\("aluno_etapas"\)/);
  assert.match(controle, /create table public\.turma_semanas/);
  assert.match(individual, /create table public\.aluno_etapas/);
  assert.match(individual, /references public\.whitelist\(email\)/);
  assert.match(individual, /add column if not exists alvo text/);
  assert.match(acoes, /etapa_aluno_\$\{estado\}:[\s\S]*undefined, email/);
  assert.match(individual, /aluno_etapas[\s\S]*turma_semanas[\s\S]*false/);
  assert.doesNotMatch(
    cms,
    /create table public\.(curso_conteudos|curso_conteudo_versoes|turma_etapas)/,
  );
  assert.doesNotMatch(remocao, /drop table/);
});
