import type { ReactNode } from "react";
import CopiarPrompt from "@/app/componentes/curso/CopiarPrompt";
import type { Atividade } from "@/lib/curso-atividades";
import type { BlocoSemana, QuestSemana, SecaoSemana, SemanaCurso } from "@/lib/curso-conteudo";
import { blocoFonte } from "./dados";
import MapaConceitosInterativo from "./MapaConceitos";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

type Bloco<Tipo extends BlocoSemana["type"]> = Extract<BlocoSemana, { type: Tipo }>;

const ICONE_AVISO = {
  info: "i",
  warning: "!",
  success: "✓",
} as const;

function QuestDaEtapa({ quest }: { quest: QuestSemana }) {
  return (
    <div className={styles.questBrief}>
      <div className={styles.questIntro}>
        <span className={styles.pill}>Quest da etapa</span>
        <h2 id={`${quest.id}-titulo`}>{quest.title}</h2>
        <p>{quest.description}</p>
      </div>

      <div className={styles.questGrid}>
        <section aria-labelledby={`${quest.id}-entrega`}>
          <h3 id={`${quest.id}-entrega`}>O que entregar</h3>
          <ul>
            {quest.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`${quest.id}-criterios`}>
          <h3 id={`${quest.id}-criterios`}>Como saber se ficou bom</h3>
          <ul>
            {quest.acceptance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <Aviso
        bloco={{
          type: "callout",
          tone: "warning",
          title: "Proteção do laboratório",
          text: quest.safety,
        }}
      />
    </div>
  );
}

export function AplicacoesEtapa({
  etapa,
  atividades,
  renderAtividade,
}: {
  etapa: SemanaCurso;
  atividades: readonly Atividade[];
  renderAtividade?: ConteudoNativoProps["renderAtividade"];
}) {
  const tituloId = `${etapa.slug}-aplicacoes-titulo`;

  return (
    <section
      className={styles.aplicacoes}
      id={`${etapa.slug}-aplicacoes`}
      aria-labelledby={etapa.quest ? `${etapa.quest.id}-titulo` : tituloId}
    >
      {etapa.quest ? (
        <QuestDaEtapa quest={etapa.quest} />
      ) : (
        <div className={styles.questIntro}>
          <span className={styles.pill}>Aplicações</span>
          <h2 id={tituloId}>Prepare a base do seu agente</h2>
          <p>Salve conforme avança. Você pode sair da página e continuar depois.</p>
        </div>
      )}

      {renderAtividade && (
        <div className={styles.formularios}>
          {atividades.map((atividade) => (
            <div data-formulario={atividade.key} key={atividade.key}>
              {renderAtividade(atividade)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type VarianteSecao =
  | "abertura"
  | "padrao"
  | "destaque"
  | "vitrine"
  | "infografico"
  | "compacta"
  | "encerramento";

export function SecaoConteudo({
  etapa,
  secao,
  variante = "padrao",
  children,
}: {
  etapa: SemanaCurso;
  secao: SecaoSemana;
  variante?: VarianteSecao;
  children: ReactNode;
}) {
  const id = `${etapa.slug}-${secao.id}`;

  return (
    <section
      className={`${styles.secao} ${styles[variante]}`}
      id={id}
      aria-labelledby={`${id}-titulo`}
    >
      <header className={styles.secaoCabecalho}>
        <h2 id={`${id}-titulo`}>{secao.title}</h2>
        {secao.lede && <p>{secao.lede}</p>}
      </header>
      <div className={styles.secaoCorpo}>{children}</div>
    </section>
  );
}

export function AberturaComChecklist({ etapa, secao }: { etapa: SemanaCurso; secao: SecaoSemana }) {
  return (
    <SecaoConteudo etapa={etapa} secao={secao} variante="abertura">
      <Aviso bloco={blocoFonte(secao, "callout")} />
      <Lista bloco={blocoFonte(secao, "bullets")} checks />
    </SecaoConteudo>
  );
}

export function EncerramentoConteudo({ etapa, secao }: { etapa: SemanaCurso; secao: SecaoSemana }) {
  return (
    <SecaoConteudo etapa={etapa} secao={secao} variante="encerramento">
      <Resumo bloco={blocoFonte(secao, "summary")} />
      <Aviso bloco={blocoFonte(secao, "callout")} />
    </SecaoConteudo>
  );
}

type VarianteComposicao = "fluxo" | "duasColunas" | "largaComApoio" | "compacta";

export function Composicao({
  variante = "fluxo",
  children,
}: {
  variante?: VarianteComposicao;
  children: ReactNode;
}) {
  return <div className={styles[variante]}>{children}</div>;
}

export function Paragrafo({ bloco }: { bloco: Bloco<"paragraph"> }) {
  return <p className={styles.paragrafo}>{bloco.text}</p>;
}

export function Lista({ bloco, checks = false }: { bloco: Bloco<"bullets">; checks?: boolean }) {
  return (
    <div className={`${styles.lista} ${checks ? styles.listaChecks : ""}`}>
      {bloco.title && <h3>{bloco.title}</h3>}
      <ul>
        {bloco.items.map((item) => (
          <li key={item}>
            {checks && <span aria-hidden="true">✓</span>}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Passos({ bloco }: { bloco: Bloco<"steps"> }) {
  return (
    <div className={styles.passos}>
      {bloco.title && <h3>{bloco.title}</h3>}
      <ol>
        {bloco.items.map((item, indice) => (
          <li key={item.title}>
            <span className={styles.passoNumero} aria-hidden="true">
              {indice + 1}
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Aviso({ bloco }: { bloco: Bloco<"callout"> }) {
  return (
    <aside className={`${styles.aviso} ${styles[`aviso_${bloco.tone}`]}`}>
      <span className={styles.avisoIcone} aria-hidden="true">
        {ICONE_AVISO[bloco.tone]}
      </span>
      <div>
        <strong>{bloco.title}</strong>
        <p>{bloco.text}</p>
      </div>
    </aside>
  );
}

export function Comparacao({ bloco }: { bloco: Bloco<"comparison"> }) {
  return (
    <div className={styles.comparacao}>
      {bloco.title && <h3>{bloco.title}</h3>}
      <div className={styles.comparacaoGrid}>
        {bloco.columns.map((coluna) => (
          <section key={coluna.title} aria-label={coluna.title}>
            <h4>{coluna.title}</h4>
            {coluna.description && <p>{coluna.description}</p>}
            <ul>
              {coluna.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ServicosBancada({ bloco }: { bloco: Bloco<"services"> }) {
  const rotulosGrupo = {
    "custo-mensal": "Custo recorrente",
    "custo-por-uso": "Custo variável",
    "instalado-na-vps": "Dentro da VPS",
    "conta-gratuita": "Sem mensalidade",
  } as const;

  function AcaoServico({
    acao,
  }: {
    acao: Bloco<"services">["groups"][number]["items"][number]["acao"];
  }) {
    if (!acao) return null;
    if (acao.status === "disponivel") {
      return (
        <a className={styles.servicoAcao} href={acao.url} target="_blank" rel="noreferrer">
          <span>{acao.label}</span>
          <span aria-hidden="true">↗</span>
        </a>
      );
    }
    return (
      <span className={styles.servicoAcaoPendente} data-link-status="pendente">
        <span aria-hidden="true">•</span>
        <span>{acao.label}</span>
      </span>
    );
  }

  return (
    <div className={styles.servicos}>
      <aside className={styles.servicosCustos} aria-labelledby="custos-bancada-titulo">
        <header className={styles.servicosCustosCabecalho}>
          <span className={styles.servicosCustosIcone} aria-hidden="true">
            $
          </span>
          <div>
            <p>{bloco.costNotice.eyebrow}</p>
            <h3 id="custos-bancada-titulo">{bloco.costNotice.title}</h3>
            <p>{bloco.costNotice.text}</p>
          </div>
        </header>
        <ol className={styles.servicosCustosEtapas}>
          {bloco.costNotice.etapas.map((etapa, indice) => (
            <li key={etapa.quando}>
              <span aria-hidden="true">{indice + 1}</span>
              <div>
                <small>{etapa.quando}</small>
                <strong>{etapa.tipo}</strong>
                <p>{etapa.servicos}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.servicosCustosNota}>{bloco.costNotice.note}</p>
      </aside>

      {bloco.groups.map((grupo, indiceGrupo) => {
        const custos = grupo.tipo === "custo-mensal" || grupo.tipo === "custo-por-uso";
        const naVps = grupo.tipo === "instalado-na-vps";
        return (
          <section
            className={styles.servicoGrupo}
            data-tipo={grupo.tipo}
            key={grupo.title}
          >
            <header className={styles.servicoGrupoCabecalho}>
              <div>
                <span className={styles.servicoGrupoNumero} aria-hidden="true">
                  {String(indiceGrupo + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className={styles.servicoGrupoTipo}>{rotulosGrupo[grupo.tipo]}</p>
                  <h3>{grupo.title}</h3>
                </div>
              </div>
              <p>{grupo.description}</p>
            </header>

            {custos && (
              <div className={styles.servicosLista} role="list">
                {grupo.items.map((servico) => (
                  <article className={styles.servicoLinha} key={servico.nome} role="listitem">
                    <span className={styles.servicoMarca} aria-hidden="true">
                      {servico.sigla}
                    </span>
                    <div className={styles.servicoLinhaPrincipal}>
                      <p className={styles.servicoPapel}>{servico.papel}</p>
                      <h4>{servico.nome}</h4>
                      <p>{servico.resumo}</p>
                      {servico.nota && <small>{servico.nota}</small>}
                    </div>
                    <div className={styles.servicoLinhaCusto}>
                      <strong>{servico.cobranca}</strong>
                      <span>{servico.momento}</span>
                    </div>
                    <AcaoServico acao={servico.acao} />
                  </article>
                ))}
              </div>
            )}

            {naVps && grupo.contexto && (
              <figure className={styles.servicoVpsMapa}>
                <div className={styles.servicoVpsExterior}>
                  <span className={styles.servicoMarca} aria-hidden="true">
                    {grupo.contexto.sigla}
                  </span>
                  <div>
                    <small>{grupo.contexto.rotulo}</small>
                    <strong>{grupo.contexto.nome}</strong>
                    <p>{grupo.contexto.descricao}</p>
                  </div>
                  <span>Mensalidade extra</span>
                </div>
                <div className={styles.servicoVpsInterior}>
                  <p>Instalados dentro da mesma VPS</p>
                  <div>
                    {grupo.items.map((servico) => (
                      <article key={servico.nome}>
                        <header>
                          <span className={styles.servicoMarca} aria-hidden="true">
                            {servico.sigla}
                          </span>
                          <span>{servico.cobranca}</span>
                        </header>
                        <p className={styles.servicoPapel}>{servico.papel}</p>
                        <h4>{servico.nome}</h4>
                        <p>{servico.resumo}</p>
                        <small>{servico.momento}</small>
                      </article>
                    ))}
                  </div>
                </div>
                <figcaption>{grupo.contexto.conclusao}</figcaption>
              </figure>
            )}

            {grupo.tipo === "conta-gratuita" && (
              <div className={styles.servicosContas}>
                {grupo.items.map((servico) => (
                  <article key={servico.nome}>
                    <header>
                      <span className={styles.servicoMarca} aria-hidden="true">
                        {servico.sigla}
                      </span>
                      <span>{servico.cobranca}</span>
                    </header>
                    <p className={styles.servicoPapel}>{servico.papel}</p>
                    <h4>{servico.nome}</h4>
                    <p>{servico.resumo}</p>
                    <small>{servico.momento}</small>
                    {servico.nota && <small>{servico.nota}</small>}
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function MapaConceitos({ bloco }: { bloco: Bloco<"concept-map"> }) {
  return <MapaConceitosInterativo bloco={bloco} />;
}

export function Prompt({ bloco }: { bloco: Bloco<"prompt"> }) {
  return (
    <section className={styles.prompt} aria-label={bloco.title}>
      <header>
        <h3>{bloco.title}</h3>
        <CopiarPrompt texto={bloco.text} />
      </header>
      <pre tabIndex={0}>
        <code>{bloco.text}</code>
      </pre>
      {bloco.note && <p className={styles.promptNota}>{bloco.note}</p>}
    </section>
  );
}

export function LinksConteudo({ bloco }: { bloco: Bloco<"links"> }) {
  return (
    <nav className={styles.links} aria-label={bloco.title ?? "Links de apoio"}>
      {bloco.title && <h3>{bloco.title}</h3>}
      <ul>
        {bloco.items.map((item) => (
          <li key={item.url}>
            <a href={item.url} target="_blank" rel="noreferrer">
              <span>{item.label}</span>
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            {item.description && <p>{item.description}</p>}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Resumo({ bloco }: { bloco: Bloco<"summary"> }) {
  return (
    <div className={styles.resumo}>
      <span className={styles.resumoMarca} aria-hidden="true">
        ✦
      </span>
      <div>
        <h3>{bloco.title}</h3>
        <ul>
          {bloco.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
