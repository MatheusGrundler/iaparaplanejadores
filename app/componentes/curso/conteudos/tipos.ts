import type { ComponentType, ReactNode } from "react";
import type { Atividade, SemanaKey } from "@/lib/curso-atividades";
import type { QuestSemana, SemanaCurso } from "@/lib/curso-conteudo";

export type RenderizadorAtividade = (atividade: Atividade) => ReactNode;

export type ConteudoNativoProps = {
  /**
   * Permite que a rota injete o formulário vigente sem acoplar a página de
   * conteúdo ao armazenamento ou à implementação do formulário.
   */
  renderAtividade?: RenderizadorAtividade;
  /** Conteúdo complementar da rota, como o formulário de dúvidas da etapa. */
  duvidas?: ReactNode;
};

export type MetadadosConteudoNativo = {
  key: SemanaKey;
  slug: SemanaCurso["slug"];
  numero: SemanaCurso["number"];
  rotulo: string;
  titulo: string;
  promessa: string;
  objetivos: readonly string[];
  resultado: string;
  quest?: QuestSemana;
};

export type RegistroConteudoNativo = {
  metadata: MetadadosConteudoNativo;
  componente: ComponentType<ConteudoNativoProps>;
  atividades: readonly Atividade[];
};
