import "server-only";

import type { MemberIdentity } from "@/lib/auth";
import type { SemanaKey } from "@/lib/curso-atividades";
import {
  carregarMapaLiberacoesAluno,
  mapaLiberacoes,
  semanaEstaLiberada,
} from "@/lib/curso-liberacao-regra";
import { privilegedDatabase } from "@/lib/supabase/admin";

export async function carregarLiberacoesSemanas(identity: MemberIdentity) {
  if (identity.admin) return mapaLiberacoes([], true);

  const db = privilegedDatabase();
  const { data: membro, error: membroError } = await db
    .from("whitelist")
    .select("turma_id")
    .eq("email", identity.email)
    .maybeSingle();

  if (membroError) {
    console.error("Falha ao localizar a turma do aluno:", membroError.code);
    return mapaLiberacoes([]);
  }
  if (!membro) return mapaLiberacoes([]);

  const { liberacoes, erro } = await carregarMapaLiberacoesAluno(membro.turma_id, identity.email, {
    async carregarTurma(turmaId) {
      return db.from("turma_semanas").select("semana_key, liberada").eq("turma_id", turmaId);
    },
    async carregarAluno(email) {
      return db.from("aluno_etapas").select("etapa_key, liberada").eq("email", email);
    },
  });

  if (erro) console.error("Falha ao carregar liberações do aluno:", erro);
  return liberacoes;
}

export async function podeAcessarSemana(identity: MemberIdentity, semanaKey: SemanaKey) {
  const liberacoes = await carregarLiberacoesSemanas(identity);
  return semanaEstaLiberada(liberacoes, semanaKey);
}
