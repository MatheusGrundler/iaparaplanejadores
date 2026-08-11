import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";
import styles from "./ConteudoNativo.module.css";

const ETAPA = etapaFonte("semana-0");
const ATIVIDADES = ATIVIDADES_POR_SEMANA["semana-0"];

const boasVindas = secaoFonte(ETAPA, "boas-vindas");
const contasEAcessos = secaoFonte(ETAPA, "contas-e-acessos");
const mapaDoSistema = secaoFonte(ETAPA, "mapa-do-sistema");
const resumoEDuvidas = secaoFonte(ETAPA, "resumo-e-duvidas");

const GLOSSARIO_PREPARACAO = [
  {
    termo: "VPS",
    explicacao:
      "Um computador alugado na internet. Ele fica ligado para o agente funcionar mesmo com seu notebook desligado.",
  },
  {
    termo: "OpenClaw",
    explicacao: "O programa que mantém o agente em funcionamento na VPS e organiza suas tarefas.",
  },
  {
    termo: "n8n",
    explicacao: "A ferramenta visual usada para conectar serviços e montar automações passo a passo.",
  },
  {
    termo: "SMTP",
    explicacao: "O serviço que envia e-mails. Só entra quando você ativar automações de e-mail.",
  },
  {
    termo: "Token ou chave de API",
    explicacao: "Um código secreto que dá acesso a um serviço. Trate como senha e nunca compartilhe.",
  },
  {
    termo: ".env",
    explicacao: "Um arquivo que pode guardar senhas e chaves de acesso. Não envie nem publique esse arquivo.",
  },
] as const;

export default function Preparacao(props: ConteudoNativoProps) {
  return (
    <article className={`${styles.pagina} ${styles.paginaPreparacao}`} aria-labelledby="preparacao-titulo">
      <header className={styles.cabecalhoPreparacao}>
        <div>
          <span className={styles.etapaRotulo}>Preparação</span>
          <h1 id="preparacao-titulo">{ETAPA.title}</h1>
          <p>{ETAPA.promise}</p>
        </div>
        <aside className={styles.resultadoPreparacao} aria-label="Resultado da preparação">
          <span>Você começa com</span>
          <p>{ETAPA.result}</p>
        </aside>
      </header>

      <section className={styles.objetivosPreparacao} aria-labelledby="preparacao-objetivos">
        <h2 id="preparacao-objetivos">Antes de começar</h2>
        <ul>
          {ETAPA.objectives.map((objetivo) => (
            <li key={objetivo}>{objetivo}</li>
          ))}
        </ul>
      </section>

      <section className={styles.glossarioPreparacao} aria-labelledby="glossario-preparacao-titulo">
        <header className={styles.glossarioPreparacaoCabecalho}>
          <div>
            <span>Guia de referência</span>
            <h2 id="glossario-preparacao-titulo">Nomes essenciais da Preparação</h2>
          </div>
          <p>
            Consulte enquanto avança. Os cinco conceitos principais aparecem no mapa mais abaixo,
            com exemplos.
          </p>
        </header>
        <dl className={styles.glossarioPreparacaoLista}>
          {GLOSSARIO_PREPARACAO.map((item) => (
            <div key={item.termo}>
              <dt>{item.termo}</dt>
              <dd>{item.explicacao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={styles.secoesPreparacao}>
        <Conteudo.SecaoConteudo etapa={ETAPA} secao={boasVindas} variante="abertura">
        <Conteudo.Paragrafo bloco={blocoFonte(boasVindas, "paragraph")} />
        <Conteudo.Composicao variante="duasColunas">
          <Conteudo.Passos bloco={blocoFonte(boasVindas, "steps")} />
          <Conteudo.Lista bloco={blocoFonte(boasVindas, "bullets")} checks />
        </Conteudo.Composicao>
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={contasEAcessos} variante="vitrine">
        <Conteudo.ServicosBancada bloco={blocoFonte(contasEAcessos, "services")} />
        <Conteudo.Composicao variante="largaComApoio">
          <Conteudo.Passos bloco={blocoFonte(contasEAcessos, "steps")} />
          <Conteudo.Aviso bloco={blocoFonte(contasEAcessos, "callout")} />
        </Conteudo.Composicao>
        </Conteudo.SecaoConteudo>

        <Conteudo.SecaoConteudo etapa={ETAPA} secao={mapaDoSistema} variante="infografico">
        <Conteudo.MapaConceitos bloco={blocoFonte(mapaDoSistema, "concept-map")} />
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
