import Link from "next/link";
import { etapaFonte } from "@/app/componentes/curso/conteudos/dados";
import { SEMANA_KEYS } from "@/lib/curso-atividades";
import { slugPublicoEtapa } from "@/lib/curso-nomenclatura";

type Turma = { id: number; nome: string };
type LiberacaoTurma = { turma_id: number; semana_key: string; liberada: boolean };
type Aluno = { email: string; nome: string | null; turma_id: number | null };
type AjusteIndividual = { email: string; etapa_key: string; liberada: boolean };
type AcaoFormulario = (formData: FormData) => void | Promise<void>;

type Props = {
  turmas: ReadonlyArray<Turma>;
  liberacoes: ReadonlyArray<LiberacaoTurma>;
  alunos: ReadonlyArray<Aluno>;
  ajustesIndividuais: ReadonlyArray<AjusteIndividual>;
  definirLiberacaoSemana: AcaoFormulario;
  definirLiberacaoEtapaAluno: AcaoFormulario;
};

export function PainelLiberacaoEtapas({
  turmas,
  liberacoes,
  alunos,
  ajustesIndividuais,
  definirLiberacaoSemana,
  definirLiberacaoEtapaAluno,
}: Props) {
  const liberacoesPorTurma = new Map(
    liberacoes.map((item) => [`${item.turma_id}:${item.semana_key}`, item]),
  );
  const ajustesPorAluno = new Map(
    ajustesIndividuais.map((item) => [`${item.email}:${item.etapa_key}`, item.liberada]),
  );
  const nomesDasTurmas = new Map(turmas.map((turma) => [turma.id, turma.nome]));

  return (
    <main className="admin-etapas">
      <h1>Liberação das etapas</h1>
      <p className="sub">
        O conteúdo é publicado pelo código. Aqui você decide apenas o que cada turma já pode abrir.
      </p>

      {turmas.length === 0 ? (
        <div className="card vazio">Crie uma turma antes de liberar as etapas.</div>
      ) : (
        turmas.map((turma) => (
          <section className="card" id={`turma-${turma.id}`} key={turma.id}>
            <div className="secao-cabecalho-admin">
              <div>
                <span className="pill">Turma</span>
                <h2>{turma.nome}</h2>
              </div>
              <span>
                {
                  SEMANA_KEYS.filter(
                    (key) => liberacoesPorTurma.get(`${turma.id}:${key}`)?.liberada,
                  ).length
                }
                /5 abertas
              </span>
            </div>

            <div className="admin-etapas-lista">
              {SEMANA_KEYS.map((semanaKey) => {
                const etapa = etapaFonte(semanaKey);
                const rotulo = etapa.number === 0 ? "Preparação" : `Etapa ${etapa.number}`;
                const liberacao = liberacoesPorTurma.get(`${turma.id}:${semanaKey}`);
                const liberada = liberacao?.liberada === true;
                return (
                  <article key={semanaKey}>
                    <div>
                      <span>{rotulo}</span>
                      <strong>{etapa.title}</strong>
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

      <section className="card" aria-labelledby="ajustes-individuais-titulo">
        <div className="secao-cabecalho-admin">
          <div>
            <span className="pill">Exceções</span>
            <h2 id="ajustes-individuais-titulo">Ajustes por aluno</h2>
          </div>
          <span>
            {alunos.length} alunos · {ajustesIndividuais.length} ajustes
          </span>
        </div>
        <p className="sub" style={{ marginBottom: 20 }}>
          Use somente quando um aluno precisar de um acesso diferente. “Padrão da turma” acompanha
          automaticamente as liberações acima.
        </p>

        {alunos.length === 0 ? (
          <div className="vazio">Cadastre um aluno para criar ajustes individuais.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {alunos.map((aluno) => {
              const turmaNome = aluno.turma_id ? nomesDasTurmas.get(aluno.turma_id) : undefined;
              const quantidadeAjustes = SEMANA_KEYS.filter((etapaKey) =>
                ajustesPorAluno.has(`${aluno.email}:${etapaKey}`),
              ).length;
              const resumoAjustes =
                quantidadeAjustes === 0
                  ? "nenhum ajuste"
                  : `${quantidadeAjustes} ${quantidadeAjustes === 1 ? "ajuste" : "ajustes"}`;

              return (
                <details
                  key={aluno.email}
                  style={{
                    border: "1px solid var(--grafite2)",
                    borderRadius: 14,
                    padding: "0 16px",
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      minHeight: 52,
                      padding: "14px 0",
                    }}
                  >
                    <strong>{aluno.nome || aluno.email}</strong>
                    <span className="muted" style={{ marginLeft: 8 }}>
                      {aluno.nome ? `${aluno.email} · ` : ""}
                      {turmaNome ?? "sem turma"} · {resumoAjustes}
                    </span>
                  </summary>

                  <div className="admin-etapas-lista" style={{ marginTop: 0 }}>
                    {SEMANA_KEYS.map((etapaKey) => {
                      const etapa = etapaFonte(etapaKey);
                      const rotulo = etapa.number === 0 ? "Preparação" : `Etapa ${etapa.number}`;
                      const chaveAjuste = `${aluno.email}:${etapaKey}`;
                      const temAjuste = ajustesPorAluno.has(chaveAjuste);
                      const ajuste = ajustesPorAluno.get(chaveAjuste);
                      const turmaLiberada = aluno.turma_id
                        ? liberacoesPorTurma.get(`${aluno.turma_id}:${etapaKey}`)?.liberada === true
                        : false;
                      const liberadaAgora = temAjuste ? ajuste === true : turmaLiberada;
                      const estado = temAjuste ? (ajuste ? "liberada" : "bloqueada") : "turma";

                      return (
                        <article key={etapaKey}>
                          <div>
                            <span>{rotulo}</span>
                            <strong>{etapa.title}</strong>
                            <span>{liberadaAgora ? "Aberta agora" : "Bloqueada agora"}</span>
                          </div>
                          <form action={definirLiberacaoEtapaAluno} className="admin-etapas-acoes">
                            <input type="hidden" name="email" value={aluno.email} />
                            <input type="hidden" name="etapa_key" value={etapaKey} />
                            <label>
                              <span className="sr-only">
                                Acesso de {aluno.nome || aluno.email} à {rotulo}
                              </span>
                              <select name="estado" defaultValue={estado}>
                                <option value="turma">
                                  Padrão da turma ({turmaLiberada ? "aberta" : "bloqueada"})
                                </option>
                                <option value="liberada">Liberar só para este aluno</option>
                                <option value="bloqueada">Bloquear só para este aluno</option>
                              </select>
                            </label>
                            <button className="btn btn-fantasma btn-mini" type="submit">
                              Salvar
                            </button>
                          </form>
                        </article>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
