import { ATIVIDADES_POR_SEMANA } from "@/lib/curso-atividades";
import { blocoFonte, etapaFonte, secaoFonte } from "./dados";
import * as Conteudo from "./PrimitivasConteudo";
import type { ConteudoNativoProps } from "./tipos";

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
    <Conteudo.PaginaConteudoNativo etapa={ETAPA} atividades={ATIVIDADES} {...props}>
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
    </Conteudo.PaginaConteudoNativo>
  );
}
