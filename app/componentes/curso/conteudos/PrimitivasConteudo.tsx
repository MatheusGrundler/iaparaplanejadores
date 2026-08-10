import type { ReactNode } from "react";
import CopiarPrompt from "@/app/componentes/curso/CopiarPrompt";
import type { Atividade } from "@/lib/curso-atividades";
import type { BlocoSemana, QuestSemana, SecaoSemana, SemanaCurso } from "@/lib/curso-conteudo";
import { blocoFonte } from "./dados";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

type Bloco<Tipo extends BlocoSemana["type"]> = Extract<BlocoSemana, { type: Tipo }>;

type PaginaProps = ConteudoNativoProps & {
  etapa: SemanaCurso;
  atividades: readonly Atividade[];
  children: ReactNode;
};

const ICONE_AVISO = {
  info: "i",
  warning: "!",
  success: "✓",
} as const;

function rotuloDaEtapa(etapa: SemanaCurso) {
  return etapa.number === 0 ? "Preparação" : `Etapa ${etapa.number}`;
}

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

function AplicacoesDaEtapa({
  etapa,
  atividades,
  renderAtividade,
}: Pick<PaginaProps, "etapa" | "atividades" | "renderAtividade">) {
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

export function PaginaConteudoNativo({
  etapa,
  atividades,
  renderAtividade,
  duvidas,
  children,
}: PaginaProps) {
  const tituloId = `${etapa.slug}-titulo`;
  const objetivosId = `${etapa.slug}-objetivos-titulo`;

  return (
    <article className={styles.pagina} aria-labelledby={tituloId}>
      <header className={styles.hero}>
        <div className={styles.heroTexto}>
          <span className={styles.etapaRotulo}>{rotuloDaEtapa(etapa)}</span>
          <h1 id={tituloId}>{etapa.title}</h1>
          <p>{etapa.promise}</p>
        </div>

        <aside className={styles.resultado} aria-label="Resultado esperado">
          <span>Você sai desta etapa com</span>
          <p>{etapa.result}</p>
        </aside>
      </header>

      <nav className={styles.indice} aria-label="Nesta página">
        <span>Nesta página</span>
        <ol>
          {etapa.sections.map((secao) => (
            <li key={secao.id}>
              <a href={`#${etapa.slug}-${secao.id}`}>{secao.title}</a>
            </li>
          ))}
          <li>
            <a href={`#${etapa.slug}-aplicacoes`}>{etapa.quest ? "Quest" : "Aplicações"}</a>
          </li>
        </ol>
      </nav>

      <section className={styles.objetivos} aria-labelledby={objetivosId}>
        <div>
          <span className={styles.pill}>O que vamos fazer</span>
          <h2 id={objetivosId}>Objetivos desta etapa</h2>
        </div>
        <ul>
          {etapa.objectives.map((objetivo) => (
            <li key={objetivo}>{objetivo}</li>
          ))}
        </ul>
      </section>

      <div className={styles.secoes}>{children}</div>

      <AplicacoesDaEtapa etapa={etapa} atividades={atividades} renderAtividade={renderAtividade} />

      {duvidas}
    </article>
  );
}

type VarianteSecao = "abertura" | "padrao" | "destaque" | "compacta" | "encerramento";

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
