import "server-only";

import type { MemberIdentity } from "@/lib/auth";
import type { SemanaKey } from "@/lib/curso-atividades";
import { mapaLiberacoes, semanaEstaLiberada } from "@/lib/curso-liberacao-regra";
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
  if (!membro?.turma_id) return mapaLiberacoes([]);

  const { data, error } = await db
    .from("turma_semanas")
    .select("semana_key, liberada")
    .eq("turma_id", membro.turma_id);

  if (error) {
    console.error("Falha ao carregar liberações da turma:", error.code);
    return mapaLiberacoes([]);
  }

  return mapaLiberacoes(data ?? []);
}

export async function podeAcessarSemana(identity: MemberIdentity, semanaKey: SemanaKey) {
  const liberacoes = await carregarLiberacoesSemanas(identity);
  return semanaEstaLiberada(liberacoes, semanaKey);
}
