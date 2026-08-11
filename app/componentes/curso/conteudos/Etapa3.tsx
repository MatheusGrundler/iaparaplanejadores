import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

const ETAPA = etapaFonte("semana-3");
const ATIVIDADES = ATIVIDADES_POR_SEMANA["semana-3"];

const boasVindas = secaoFonte(ETAPA, "boas-vindas");
const conceito = secaoFonte(ETAPA, "conceito");
const relatorioDiario = secaoFonte(ETAPA, "relatorio-diario");
const testeEAtivacao = secaoFonte(ETAPA, "teste-e-ativacao");
const aniversarios = secaoFonte(ETAPA, "aniversarios");
const resumoEDuvidas = secaoFonte(ETAPA, "resumo-e-duvidas");

export default function Etapa3(props: ConteudoNativoProps) {
  return (
    <article className={`${styles.pagina} ${styles.paginaOperacao}`} aria-labelledby="etapa-3-titulo">
      <header className={styles.cabecalhoOperacao}>
        <span className={styles.etapaRotulo}>Etapa 3 · Operação assistida</span>
        <h1 id="etapa-3-titulo">{ETAPA.title}</h1>
        <p>{ETAPA.promise}</p>
        <div className={styles.resultadoOperacao}>
          <span>Ao final</span>
          <p>{ETAPA.result}</p>
        </div>
      </header>

      <section className={styles.ritmoOperacao} aria-labelledby="etapa-3-ritmo">
        <h2 id="etapa-3-ritmo">O ritmo desta etapa</h2>
        <div>
          {ETAPA.objectives.map((objetivo, indice) => (
            <p key={objetivo}>
              <span>{String(indice + 1).padStart(2, "0")}</span>
              {objetivo}
            </p>
          ))}
        </div>
      </section>

      <div className={styles.fluxoOperacao}>
        <Conteudo.SecaoConteudo etapa={ETAPA} secao={boasVindas} variante="abertura">
        <Conteudo.Aviso bloco={blocoFonte(boasVindas, "callout")} />
        <Conteudo.Lista bloco={blocoFonte(boasVindas, "bullets")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={conceito} variante="destaque">
        <Conteudo.Comparacao bloco={blocoFonte(conceito, "comparison")} />
        <Conteudo.Paragrafo bloco={blocoFonte(conceito, "paragraph")} />
        <Conteudo.LinksConteudo bloco={blocoFonte(conceito, "links")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={relatorioDiario}>
        <Conteudo.Passos bloco={blocoFonte(relatorioDiario, "steps")} />
        <Conteudo.Prompt bloco={blocoFonte(relatorioDiario, "prompt")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={testeEAtivacao} variante="destaque">
        <Conteudo.Passos bloco={blocoFonte(testeEAtivacao, "steps")} />
        <Conteudo.Aviso bloco={blocoFonte(testeEAtivacao, "callout")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={aniversarios} variante="compacta">
        <Conteudo.Composicao variante="largaComApoio">
          <Conteudo.Passos bloco={blocoFonte(aniversarios, "steps")} />
          <Conteudo.Aviso bloco={blocoFonte(aniversarios, "callout")} />
        </Conteudo.Composicao>
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
