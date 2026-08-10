import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";

export type LiberacaoSemana = {
  semana_key: string;
  liberada: boolean;
};

export type LiberacaoEtapaAluno = {
  etapa_key: string;
  liberada: boolean;
};

type ResultadoFonte<T> = {
  data: ReadonlyArray<T> | null;
  error: { code?: string } | null;
};

export type FontesLiberacaoAluno = {
  carregarTurma(turmaId: number): Promise<ResultadoFonte<LiberacaoSemana>>;
  carregarAluno(email: string): Promise<ResultadoFonte<LiberacaoEtapaAluno>>;
};

export function mapaLiberacoes(
  liberacoesTurma: ReadonlyArray<LiberacaoSemana>,
  admin = false,
  ajustesIndividuais: ReadonlyArray<LiberacaoEtapaAluno> = [],
): Map<SemanaKey, boolean> {
  const porTurma = new Map(
    liberacoesTurma.map((linha) => [linha.semana_key, linha.liberada] as const),
  );
  const porAluno = new Map(
    ajustesIndividuais.map((linha) => [linha.etapa_key, linha.liberada] as const),
  );

  return new Map(
    SEMANA_KEYS.map((semanaKey) => {
      const liberada = porAluno.has(semanaKey)
        ? porAluno.get(semanaKey) === true
        : porTurma.get(semanaKey) === true;
      return [semanaKey, admin || liberada];
    }),
  );
}

export function semanaEstaLiberada(
  liberacoes: ReadonlyMap<SemanaKey, boolean>,
  semanaKey: SemanaKey,
) {
  return liberacoes.get(semanaKey) === true;
}

export async function carregarMapaLiberacoesAluno(
  turmaId: number | null,
  email: string,
  fontes: FontesLiberacaoAluno,
) {
  const [turma, aluno] = await Promise.all([
    turmaId ? fontes.carregarTurma(turmaId) : Promise.resolve({ data: [], error: null }),
    fontes.carregarAluno(email),
  ]);

  const erro = turma.error?.code ?? aluno.error?.code;
  return {
    liberacoes: erro
      ? mapaLiberacoes([])
      : mapaLiberacoes(turma.data ?? [], false, aluno.data ?? []),
    erro,
  };
}
