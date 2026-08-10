import type { SemanaKey } from "@/lib/curso-atividades";
import {
  SEMANAS,
  type BlocoSemana,
  type SecaoSemana,
  type SemanaCurso,
} from "@/lib/curso-conteudo";

type BlocoDoTipo<Tipo extends BlocoSemana["type"]> = Extract<BlocoSemana, { type: Tipo }>;

export function etapaFonte(key: SemanaKey): SemanaCurso {
  const etapa = SEMANAS.find((item) => item.slug === key);

  if (!etapa) {
    throw new Error(`Conteúdo não encontrado para ${key}.`);
  }

  return etapa;
}

export function secaoFonte(etapa: SemanaCurso, id: string): SecaoSemana {
  const secao = etapa.sections.find((item) => item.id === id);

  if (!secao) {
    throw new Error(`Seção ${id} não encontrada em ${etapa.slug}.`);
  }

  return secao;
}

export function blocosFonte<Tipo extends BlocoSemana["type"]>(
  secao: SecaoSemana,
  tipo: Tipo,
): readonly BlocoDoTipo<Tipo>[] {
  return secao.blocks.filter((bloco): bloco is BlocoDoTipo<Tipo> => bloco.type === tipo);
}

export function blocoFonte<Tipo extends BlocoSemana["type"]>(
  secao: SecaoSemana,
  tipo: Tipo,
  indice = 0,
): BlocoDoTipo<Tipo> {
  const bloco = blocosFonte(secao, tipo)[indice];

  if (!bloco) {
    throw new Error(`Bloco ${tipo} #${indice + 1} não encontrado na seção ${secao.id}.`);
  }

  return bloco;
}
