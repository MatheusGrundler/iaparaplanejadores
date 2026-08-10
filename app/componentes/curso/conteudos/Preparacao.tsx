import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";

const ETAPA = etapaFonte("semana-0");
const ATIVIDADES = ATIVIDADES_POR_SEMANA["semana-0"];

const boasVindas = secaoFonte(ETAPA, "boas-vindas");
const contasEAcessos = secaoFonte(ETAPA, "contas-e-acessos");
const mapaDoSistema = secaoFonte(ETAPA, "mapa-do-sistema");
const skills = secaoFonte(ETAPA, "skills");
const mcp = secaoFonte(ETAPA, "mcp");
const resumoEDuvidas = secaoFonte(ETAPA, "resumo-e-duvidas");

export default function Preparacao(props: ConteudoNativoProps) {
  return (
    <Conteudo.PaginaConteudoNativo etapa={ETAPA} atividades={ATIVIDADES} {...props}>
      <Conteudo.SecaoConteudo etapa={ETAPA} secao={boasVindas} variante="abertura">
        <Conteudo.Paragrafo bloco={blocoFonte(boasVindas, "paragraph")} />
        <Conteudo.Aviso bloco={blocoFonte(boasVindas, "callout")} />
        <Conteudo.Composicao variante="duasColunas">
          <Conteudo.Passos bloco={blocoFonte(boasVindas, "steps")} />
          <Conteudo.Lista bloco={blocoFonte(boasVindas, "bullets")} checks />
        </Conteudo.Composicao>
      </Conteudo.SecaoConteudo>

      <Conteudo.SecaoConteudo etapa={ETAPA} secao={contasEAcessos} variante="destaque">
        <Conteudo.Comparacao bloco={blocoFonte(contasEAcessos, "comparison")} />
        <Conteudo.Composicao variante="largaComApoio">
          <Conteudo.Passos bloco={blocoFonte(contasEAcessos, "steps")} />
          <Conteudo.LinksConteudo bloco={blocoFonte(contasEAcessos, "links")} />
        </Conteudo.Composicao>
        <Conteudo.Aviso bloco={blocoFonte(contasEAcessos, "callout")} />
      </Conteudo.SecaoConteudo>

      <Conteudo.SecaoConteudo etapa={ETAPA} secao={mapaDoSistema}>
        <Conteudo.Comparacao bloco={blocoFonte(mapaDoSistema, "comparison")} />
        <Conteudo.Paragrafo bloco={blocoFonte(mapaDoSistema, "paragraph")} />
        <Conteudo.Aviso bloco={blocoFonte(mapaDoSistema, "callout")} />
      </Conteudo.SecaoConteudo>

      <Conteudo.SecaoConteudo etapa={ETAPA} secao={skills} variante="destaque">
        <Conteudo.Composicao variante="duasColunas">
          <Conteudo.Lista bloco={blocoFonte(skills, "bullets")} />
          <Conteudo.Passos bloco={blocoFonte(skills, "steps")} />
        </Conteudo.Composicao>
        <Conteudo.Prompt bloco={blocoFonte(skills, "prompt")} />
        <Conteudo.LinksConteudo bloco={blocoFonte(skills, "links")} />
      </Conteudo.SecaoConteudo>

      <Conteudo.SecaoConteudo etapa={ETAPA} secao={mcp} variante="compacta">
        <Conteudo.Paragrafo bloco={blocoFonte(mcp, "paragraph")} />
        <Conteudo.Aviso bloco={blocoFonte(mcp, "callout")} />
        <Conteudo.LinksConteudo bloco={blocoFonte(mcp, "links")} />
      </Conteudo.SecaoConteudo>

      <Conteudo.EncerramentoConteudo etapa={ETAPA} secao={resumoEDuvidas} />
    </Conteudo.PaginaConteudoNativo>
  );
}
