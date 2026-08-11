import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

const ETAPA = etapaFonte("semana-1");
const ATIVIDADES = ATIVIDADES_POR_SEMANA["semana-1"];

const boasVindas = secaoFonte(ETAPA, "boas-vindas");
const instalacao = secaoFonte(ETAPA, "instalacao");
const seguranca = secaoFonte(ETAPA, "seguranca");
const starterKit = secaoFonte(ETAPA, "starter-kit");
const quebrarERecuperar = secaoFonte(ETAPA, "quebrar-e-recuperar");
const resumoEDuvidas = secaoFonte(ETAPA, "resumo-e-duvidas");

export default function Etapa1(props: ConteudoNativoProps) {
  return (
    <article className={`${styles.pagina} ${styles.paginaInstalacao}`} aria-labelledby="etapa-1-titulo">
      <header className={styles.cabecalhoInstalacao}>
        <div>
          <span className={styles.etapaRotulo}>Etapa 1 · Base técnica</span>
          <h1 id="etapa-1-titulo">{ETAPA.title}</h1>
          <p>{ETAPA.promise}</p>
        </div>
        <div className={styles.marcoInstalacao}>
          <span>Ao final</span>
          <p>{ETAPA.result}</p>
        </div>
      </header>

      <section className={styles.planoInstalacao} aria-labelledby="etapa-1-plano">
        <div>
          <span>Plano de montagem</span>
          <h2 id="etapa-1-plano">O que você vai colocar no ar</h2>
        </div>
        <ol>
          {ETAPA.objectives.map((objetivo, indice) => (
            <li key={objetivo}>
              <span>{String(indice + 1).padStart(2, "0")}</span>
              <p>{objetivo}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.trilhaInstalacao}>
        <Conteudo.AberturaComChecklist etapa={ETAPA} secao={boasVindas} />

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={instalacao} variante="destaque">
        <Conteudo.Composicao variante="largaComApoio">
          <Conteudo.Passos bloco={blocoFonte(instalacao, "steps")} />
          <Conteudo.LinksConteudo bloco={blocoFonte(instalacao, "links")} />
        </Conteudo.Composicao>
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={seguranca}>
        <Conteudo.Passos bloco={blocoFonte(seguranca, "steps")} />
        <Conteudo.Aviso bloco={blocoFonte(seguranca, "callout")} />
        <Conteudo.LinksConteudo bloco={blocoFonte(seguranca, "links")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={starterKit} variante="destaque">
        <Conteudo.Comparacao bloco={blocoFonte(starterKit, "comparison")} />
        <Conteudo.Prompt bloco={blocoFonte(starterKit, "prompt")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={quebrarERecuperar} variante="compacta">
        <Conteudo.Passos bloco={blocoFonte(quebrarERecuperar, "steps")} />
        <Conteudo.Aviso bloco={blocoFonte(quebrarERecuperar, "callout")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.EncerramentoConteudo etapa={ETAPA} secao={resumoEDuvidas} />
      </div>

      <Conteudo.AplicacoesEtapa
        etapa={ETAPA}
        atividades={ATIVIDADES}
        renderAtividade={props.renderAtividade}
      />
      {props.duvidas}
    </article>
  );
}
