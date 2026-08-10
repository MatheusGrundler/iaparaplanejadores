import Link from "next/link";
import { CONTEUDOS_NATIVOS } from "@/app/componentes/curso/conteudos";
import { canAccessAdminArea } from "@/lib/auth";
import { SEMANA_KEYS } from "@/lib/curso-atividades";
import { slugPublicoEtapa } from "@/lib/curso-nomenclatura";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { definirLiberacaoSemana } from "../actions";

export const dynamic = "force-dynamic";

export default async function EtapasAdminPage() {
  if (!(await canAccessAdminArea())) return null;

  const db = privilegedDatabase();
  const [{ data: turmas }, { data: liberacoes }] = await Promise.all([
    db.from("turmas").select("id, nome").order("id"),
    db.from("turma_semanas").select("turma_id, semana_key, liberada, liberada_em"),
  ]);
  const mapa = new Map(
    (liberacoes ?? []).map((item) => [`${item.turma_id}:${item.semana_key}`, item]),
  );

  return (
    <main className="admin-etapas">
      <h1>Liberação das etapas</h1>
      <p className="sub">
        O conteúdo é publicado pelo código. Aqui você decide apenas o que cada turma já pode abrir.
      </p>

      {(turmas ?? []).length === 0 ? (
        <div className="card vazio">Crie uma turma antes de liberar as etapas.</div>
      ) : (
        (turmas ?? []).map((turma) => (
          <section className="card" id={`turma-${turma.id}`} key={turma.id}>
            <div className="secao-cabecalho-admin">
              <div>
                <span className="pill">Turma</span>
                <h2>{turma.nome}</h2>
              </div>
              <span>
                {SEMANA_KEYS.filter((key) => mapa.get(`${turma.id}:${key}`)?.liberada).length}
                /5 abertas
              </span>
            </div>

            <div className="admin-etapas-lista">
              {SEMANA_KEYS.map((semanaKey) => {
                const conteudo = CONTEUDOS_NATIVOS[semanaKey].metadata;
                const liberacao = mapa.get(`${turma.id}:${semanaKey}`);
                const liberada = liberacao?.liberada === true;
                return (
                  <article key={semanaKey}>
                    <div>
                      <span>{conteudo.rotulo}</span>
                      <strong>{conteudo.titulo}</strong>
                    </div>
                    <div className="admin-etapas-acoes">
                      <Link href={`/etapa/${slugPublicoEtapa(semanaKey)}`}>Pré-visualizar</Link>
                      <form action={definirLiberacaoSemana}>
                        <input type="hidden" name="turma_id" value={turma.id} />
                        <input type="hidden" name="semana_key" value={semanaKey} />
                        <input type="hidden" name="liberada" value={String(!liberada)} />
                        <button
                          className={`btn btn-mini ${liberada ? "btn-fantasma" : ""}`}
                          type="submit"
                        >
                          {liberada ? "Bloquear" : "Liberar"}
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
