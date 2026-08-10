import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";

export type LiberacaoSemana = {
  semana_key: string;
  liberada: boolean;
};

export function mapaLiberacoes(
  linhas: ReadonlyArray<LiberacaoSemana>,
  admin = false,
): Map<SemanaKey, boolean> {
  const porSemana = new Map(linhas.map((linha) => [linha.semana_key, linha.liberada] as const));

  return new Map(
    SEMANA_KEYS.map((semanaKey) => [semanaKey, admin || porSemana.get(semanaKey) === true]),
  );
}

export function semanaEstaLiberada(
  liberacoes: ReadonlyMap<SemanaKey, boolean>,
  semanaKey: SemanaKey,
) {
  return liberacoes.get(semanaKey) === true;
}
