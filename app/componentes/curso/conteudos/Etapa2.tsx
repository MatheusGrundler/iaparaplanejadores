import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, blocosFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

const ETAPA = etapaFonte("semana-2");
const ATIVIDADES = ATIVIDADES_POR_SEMANA["semana-2"];

const boasVindas = secaoFonte(ETAPA, "boas-vindas");
const marcaENegocio = secaoFonte(ETAPA, "marca-e-negocio");
const conhecimentoFinanceiro = secaoFonte(ETAPA, "conhecimento-financeiro");
const anonimizador = secaoFonte(ETAPA, "anonimizador");
const modelosEVetores = secaoFonte(ETAPA, "modelos-e-vetores");
const backup = secaoFonte(ETAPA, "backup");
const landingEImagem = secaoFonte(ETAPA, "landing-e-imagem");
const resumoEDuvidas = secaoFonte(ETAPA, "resumo-e-duvidas");
const promptsVisuais = blocosFonte(landingEImagem, "prompt");

export default function Etapa2(props: ConteudoNativoProps) {
  return (
    <article className={`${styles.pagina} ${styles.paginaOficina}`} aria-labelledby="etapa-2-titulo">
      <header className={styles.cabecalhoOficina}>
        <div className={styles.cabecalhoOficinaTexto}>
          <span className={styles.etapaRotulo}>Etapa 2 · Oficina de conhecimento</span>
          <h1 id="etapa-2-titulo">{ETAPA.title}</h1>
          <p>{ETAPA.promise}</p>
        </div>
        <div className={styles.painelOficina}>
          <span>Resultado da oficina</span>
          <p>{ETAPA.result}</p>
        </div>
      </header>

      <section className={styles.pautaOficina} aria-labelledby="etapa-2-pauta">
        <div>
          <span>Pauta da etapa</span>
          <h2 id="etapa-2-pauta">O conhecimento que entra no seu agente</h2>
        </div>
        <ul>
          {ETAPA.objectives.map((objetivo) => (
            <li key={objetivo}>{objetivo}</li>
          ))}
        </ul>
      </section>

      <div className={styles.bancadaOficina}>
        <Conteudo.SecaoConteudo etapa={ETAPA} secao={boasVindas} variante="abertura">
        <Conteudo.Lista bloco={blocoFonte(boasVindas, "bullets")} checks />
        <Conteudo.Aviso bloco={blocoFonte(boasVindas, "callout")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={marcaENegocio} variante="destaque">
        <Conteudo.Passos bloco={blocoFonte(marcaENegocio, "steps")} />
        <Conteudo.Prompt bloco={blocoFonte(marcaENegocio, "prompt")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={conhecimentoFinanceiro}>
        <Conteudo.Passos bloco={blocoFonte(conhecimentoFinanceiro, "steps")} />
        <Conteudo.Aviso bloco={blocoFonte(conhecimentoFinanceiro, "callout")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={anonimizador} variante="destaque">
        <Conteudo.Passos bloco={blocoFonte(anonimizador, "steps")} />
        <Conteudo.Prompt bloco={blocoFonte(anonimizador, "prompt")} />
        <Conteudo.Aviso bloco={blocoFonte(anonimizador, "callout")} />
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={modelosEVetores}>
        <Conteudo.Comparacao bloco={blocoFonte(modelosEVetores, "comparison")} />
        <Conteudo.Composicao variante="duasColunas">
          <Conteudo.Aviso bloco={blocoFonte(modelosEVetores, "callout")} />
          <Conteudo.LinksConteudo bloco={blocoFonte(modelosEVetores, "links")} />
        </Conteudo.Composicao>
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={backup} variante="compacta">
        <Conteudo.Comparacao bloco={blocoFonte(backup, "comparison")} />
        <Conteudo.Composicao variante="largaComApoio">
          <Conteudo.Passos bloco={blocoFonte(backup, "steps")} />
          <Conteudo.LinksConteudo bloco={blocoFonte(backup, "links")} />
        </Conteudo.Composicao>
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={landingEImagem} variante="destaque">
        <Conteudo.Composicao variante="duasColunas">
          {promptsVisuais.map((prompt) => (
            <Conteudo.Prompt bloco={prompt} key={prompt.title} />
          ))}
        </Conteudo.Composicao>
        <Conteudo.LinksConteudo bloco={blocoFonte(landingEImagem, "links")} />
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
