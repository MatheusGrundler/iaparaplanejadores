import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";

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
    <Conteudo.PaginaConteudoNativo etapa={ETAPA} atividades={ATIVIDADES} {...props}>
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
    </Conteudo.PaginaConteudoNativo>
  );
}
