import "server-only";

import {
  VERSAO_CONTEUDO_PADRAO,
  versaoConteudoValida,
  type VersaoConteudo,
} from "@/app/componentes/curso/conteudos";
import type { MemberIdentity } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import { privilegedDatabase } from "@/lib/supabase/admin";

type LinhaVersaoTurma = { etapa_key: string; versao: string };

function mapaPadrao() {
  return new Map<SemanaKey, VersaoConteudo>(
    SEMANA_KEYS.map((etapa) => [etapa, VERSAO_CONTEUDO_PADRAO]),
  );
}

/**
 * A turma escolhe a edição da página. Falhas e configurações antigas voltam
 * para v1, preservando a experiência já publicada até uma edição ser criada.
 */
export async function carregarVersoesConteudo(identity: MemberIdentity) {
  const versoes = mapaPadrao();
  if (identity.admin) return versoes;

  const db = privilegedDatabase();
  const { data: aluno, error: alunoError } = await db
    .from("whitelist")
    .select("turma_id")
    .eq("email", identity.email)
    .maybeSingle();
  if (alunoError || !aluno?.turma_id) {
    if (alunoError) console.error("Falha ao localizar turma para edição de conteúdo:", alunoError.code);
    return versoes;
  }

  const { data, error } = await db
    .from("turma_conteudo_versoes")
    .select("etapa_key, versao")
    .eq("turma_id", aluno.turma_id);
  if (error) {
    console.error("Falha ao carregar edição de conteúdo da turma:", error.code);
    return versoes;
  }

  for (const linha of (data ?? []) as LinhaVersaoTurma[]) {
    if ((SEMANA_KEYS as readonly string[]).includes(linha.etapa_key) && versaoConteudoValida(linha.versao)) {
      versoes.set(linha.etapa_key as SemanaKey, linha.versao);
    }
  }
  return versoes;
}
