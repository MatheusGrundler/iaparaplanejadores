import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

const ETAPA = etapaFonte("semana-4");
const ATIVIDADES = ATIVIDADES_POR_SEMANA["semana-4"];

const boasVindas = secaoFonte(ETAPA, "boas-vindas");
const oQueEN8n = secaoFonte(ETAPA, "o-que-e-n8n");
const comparacao = secaoFonte(ETAPA, "comparacao");
const whatsappTrigger = secaoFonte(ETAPA, "whatsapp-trigger");
const planfi = secaoFonte(ETAPA, "planfi");
const publicacaoSegura = secaoFonte(ETAPA, "publicacao-segura");
const resumoEDuvidas = secaoFonte(ETAPA, "resumo-e-duvidas");

export default function Etapa4(props: ConteudoNativoProps) {
  return (
    <article className={`${styles.pagina} ${styles.paginaLaboratorio}`} aria-labelledby="etapa-4-titulo">
      <header className={styles.cabecalhoLaboratorio}>
        <div>
          <span className={styles.etapaRotulo}>Etapa 4 · Laboratório de automações</span>
          <h1 id="etapa-4-titulo">{ETAPA.title}</h1>
          <p>{ETAPA.promise}</p>
        </div>
        <aside className={styles.resultadoLaboratorio} aria-label="Resultado do laboratório">
          <span>Você sai com</span>
          <p>{ETAPA.result}</p>
        </aside>
      </header>

      <section className={styles.experimentosLaboratorio} aria-labelledby="etapa-4-experimentos">
        <div>
          <span>Experimentos da etapa</span>
          <h2 id="etapa-4-experimentos">O que vamos construir</h2>
        </div>
        <ul>
          {ETAPA.objectives.map((objetivo) => (
            <li key={objetivo}>{objetivo}</li>
          ))}
        </ul>
      </section>

      <div className={styles.bancadaLaboratorio}>
        <Conteudo.AberturaComChecklist etapa={ETAPA} secao={boasVindas} />

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={oQueEN8n} variante="destaque">
        <Conteudo.Composicao variante="largaComApoio">
          <Conteudo.Passos bloco={blocoFonte(oQueEN8n, "steps")} />
          <Conteudo.LinksConteudo bloco={blocoFonte(oQueEN8n, "links")} />
        </Conteudo.Composicao>
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={comparacao}>
        <Conteudo.Comparacao bloco={blocoFonte(comparacao, "comparison")} />
        <Conteudo.Resumo bloco={blocoFonte(comparacao, "summary")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={whatsappTrigger} variante="destaque">
        <Conteudo.Passos bloco={blocoFonte(whatsappTrigger, "steps")} />
        <Conteudo.Aviso bloco={blocoFonte(whatsappTrigger, "callout")} />
        <Conteudo.LinksConteudo bloco={blocoFonte(whatsappTrigger, "links")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={planfi}>
        <Conteudo.Passos bloco={blocoFonte(planfi, "steps")} />
        <Conteudo.Prompt bloco={blocoFonte(planfi, "prompt")} />
        <Conteudo.Aviso bloco={blocoFonte(planfi, "callout")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={publicacaoSegura} variante="compacta">
        <Conteudo.Passos bloco={blocoFonte(publicacaoSegura, "steps")} />
        <Conteudo.Aviso bloco={blocoFonte(publicacaoSegura, "callout")} />
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
