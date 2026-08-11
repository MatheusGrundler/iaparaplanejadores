import { canAccessAdminArea } from "@/lib/auth";
import { listarVersoesConteudo } from "@/app/componentes/curso/conteudos";
import { privilegedDatabase } from "@/lib/supabase/admin";
import {
  definirLiberacaoEtapaAluno,
  definirLiberacaoSemana,
  definirVersaoConteudoTurma,
} from "../actions";
import { PainelLiberacaoEtapas } from "./PainelLiberacaoEtapas";

export const dynamic = "force-dynamic";

export default async function EtapasAdminPage() {
  if (!(await canAccessAdminArea())) return null;

  const db = privilegedDatabase();
  const [turmasResult, liberacoesResult, alunosResult, ajustesResult, versoesResult] = await Promise.all([
    db.from("turmas").select("id, nome").order("id"),
    db.from("turma_semanas").select("turma_id, semana_key, liberada, liberada_em"),
    db
      .from("whitelist")
      .select("email, nome, turma_id")
      .order("nome", { ascending: true, nullsFirst: false }),
    db.from("aluno_etapas").select("email, etapa_key, liberada"),
    db.from("turma_conteudo_versoes").select("turma_id, etapa_key, versao"),
  ]);
  const falha =
    turmasResult.error ??
    liberacoesResult.error ??
    alunosResult.error ??
    ajustesResult.error ??
    versoesResult.error;
  if (falha) {
    console.error("Falha ao carregar as liberações de etapas:", falha.code);
    return (
      <main className="admin-etapas">
        <h1>Liberação das etapas</h1>
        <div className="card vazio" role="alert">
          Não foi possível carregar as liberações agora. Nenhuma configuração foi alterada.
        </div>
      </main>
    );
  }

  return (
    <PainelLiberacaoEtapas
      turmas={turmasResult.data ?? []}
      liberacoes={liberacoesResult.data ?? []}
      alunos={alunosResult.data ?? []}
      ajustesIndividuais={ajustesResult.data ?? []}
      versoesConteudo={versoesResult.data ?? []}
      versoesDisponiveis={listarVersoesConteudo()}
      definirLiberacaoSemana={definirLiberacaoSemana}
      definirLiberacaoEtapaAluno={definirLiberacaoEtapaAluno}
      definirVersaoConteudoTurma={definirVersaoConteudoTurma}
    />
  );
}
