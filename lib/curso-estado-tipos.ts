import type { RespostasAtividade } from "@/lib/curso-atividades";
import type { AnexoFormulario } from "@/lib/formularios";
import type { DuvidaAtual } from "@/lib/formularios/legado";

/** Contratos serializáveis compartilhados entre Server e Client Components. */
export type EstadoAtividade = {
  id: string | null;
  respostas: RespostasAtividade;
  status: string | null;
  atualizadoEm: string | null;
  anexos: AnexoFormulario[];
};

export type EstadoSemana = {
  atividades: Record<string, EstadoAtividade>;
  duvidas: DuvidaAtual[];
};
