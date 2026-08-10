import Link from "next/link";
import { CONTEUDOS_NATIVOS } from "@/app/componentes/curso/conteudos";
import { getMemberIdentity } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import { carregarStatusCurso } from "@/lib/curso-estado";
import { carregarLiberacoesSemanas } from "@/lib/curso-liberacao";
import { chaveEtapaDoSlug, slugPublicoEtapa } from "@/lib/curso-nomenclatura";
import { FORMULARIOS_INICIAIS } from "@/lib/formularios";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusDaSemana(
  atividades: ReadonlyArray<{ key: string }>,
  progresso: Awaited<ReturnType<typeof carregarStatusCurso>>,
) {
  const concluidas = atividades.filter((atividade) => {
    const status = progresso.get(atividade.key)?.status;
    return status === "enviada" || status === "revisada";
  }).length;
  return {
    concluidas,
    total: atividades.length,
    pronto: atividades.length > 0 && concluidas === atividades.length,
    iniciado: atividades.some((atividade) => progresso.has(atividade.key)),
  };
}

function formulariosQuestDaEtapa(semanaKey: SemanaKey) {
  return FORMULARIOS_INICIAIS.filter(
    (formulario) =>
      formulario.workflow.tipo === "quest" && formulario.metadados?.semanaKey === semanaKey,
  ).map((formulario) => ({ key: formulario.codigo }));
}

export default async function ImersaoPage({ searchParams }: Props) {
  const identity = await getMemberIdentity();
  if (!identity) return null;

  const liberacoes = await carregarLiberacoesSemanas(identity);
  const itens = SEMANA_KEYS.map((semanaKey, ordem) => {
    const conteudo = CONTEUDOS_NATIVOS[semanaKey];
    return {
      id: semanaKey,
      ordem,
      liberada: liberacoes.get(semanaKey) === true,
      documento: {
        chave: semanaKey,
        rotulo: conteudo.metadata.rotulo,
        conteudo: {
          slug: semanaKey,
          number: conteudo.metadata.numero,
          title: conteudo.metadata.titulo,
          promise: conteudo.metadata.promessa,
        },
        atividades: formulariosQuestDaEtapa(semanaKey),
      },
    };
  });
  const progresso = await carregarStatusCurso(identity.userId);
  const parametros = searchParams ? await searchParams : {};
  const semanaBloqueada = parametros["etapa-bloqueada"] ?? parametros["semana-bloqueada"];
  const chaveBloqueada =
    typeof semanaBloqueada === "string" ? chaveEtapaDoSlug(semanaBloqueada) : null;
  const exibirAvisoBloqueio =
    chaveBloqueada !== null && itens.some((item) => item.documento.chave === chaveBloqueada);
  const atividadesDaTrilha = itens.flatMap((item) => item.documento.atividades);
  const totalAtividades = atividadesDaTrilha.length;
  const totalConcluidas = atividadesDaTrilha.filter((atividade) => {
    const status = progresso.get(atividade.key)?.status;
    return status === "enviada" || status === "revisada";
  }).length;
  const percentual = totalAtividades
    ? Math.round((Math.min(totalConcluidas, totalAtividades) / totalAtividades) * 100)
    : 0;

  return (
    <main className="curso-home">
      <section className="curso-progresso-hero" aria-labelledby="progresso-titulo">
        <div className="curso-progresso-cabecalho">
          <div>
            <h1 id="progresso-titulo">Seu progresso</h1>
            <p>
              {totalConcluidas} de {totalAtividades} entregas concluídas
            </p>
          </div>
          <strong className="curso-progresso-percentual" aria-hidden="true">
            {percentual}%
          </strong>
        </div>
        <div
          className="progresso-trilha"
          role="progressbar"
          aria-label="Progresso da imersão"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentual}
          aria-valuetext={`${totalConcluidas} de ${totalAtividades} entregas concluídas`}
        >
          <span style={{ width: `${percentual}%` }} />
        </div>
      </section>

      {exibirAvisoBloqueio && (
        <p className="curso-aviso-bloqueio" role="status">
          Esta etapa ainda não foi liberada. Quando ela estiver disponível, o acesso aparecerá aqui.
        </p>
      )}

      <section className="mapa-curso" aria-labelledby="mapa-titulo">
        <div className="secao-cabecalho">
          <div>
            <span className="pill">Imersão</span>
            <h2 id="mapa-titulo">Minha trilha</h2>
          </div>
        </div>

        <div className="semanas-grid">
          {itens.map((item) => {
            const semana = item.documento.conteudo;
            const estado = statusDaSemana(item.documento.atividades, progresso);
            const liberada = identity.admin || item.liberada;
            const rotulo = identity.admin
              ? "Prévia admin"
              : !liberada
                ? "Bloqueada"
                : estado.pronto
                  ? "Concluída"
                  : estado.iniciado
                    ? "Em andamento"
                    : "Liberada";
            const classes = [
              "semana-card",
              !liberada ? "semana-bloqueada" : "semana-liberada",
              estado.pronto ? "semana-concluida" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <article
                className={classes}
                key={item.id ?? `${semana.slug}-${item.ordem}`}
                aria-labelledby={`${semana.slug}-titulo`}
              >
                <div className="semana-card-topo">
                  <span className="semana-numero" aria-hidden="true">
                    {semana.number === 0 ? "P" : String(semana.number).padStart(2, "0")}
                  </span>
                  <span className="semana-status">{rotulo}</span>
                </div>
                <div>
                  <p className="semana-eyebrow">{item.documento.rotulo}</p>
                  <h3 id={`${semana.slug}-titulo`}>{semana.title}</h3>
                  <p>{semana.promise}</p>
                </div>
                <div className="semana-card-rodape">
                  <span>
                    {estado.concluidas}/{estado.total} entregas
                  </span>
                  {liberada ? (
                    <Link className="btn btn-mini" href={`/etapa/${slugPublicoEtapa(semana.slug)}`}>
                      {identity.admin
                        ? "Pré-visualizar"
                        : estado.pronto
                          ? "Revisar etapa"
                          : estado.iniciado
                            ? "Continuar"
                            : "Começar"}
                    </Link>
                  ) : (
                    <span className="semana-bloqueio">Aguardando liberação</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
