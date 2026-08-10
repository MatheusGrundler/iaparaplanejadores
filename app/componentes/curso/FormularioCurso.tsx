"use client";

import { useMemo } from "react";
import { Formulario } from "@/app/componentes/formularios";
import type { EstadoAtividade } from "@/lib/curso-estado-tipos";
import type { SemanaKey } from "@/lib/curso-atividades";
import {
  criarAdaptadorDuvidaAtual,
  criarAdaptadorQuestAtual,
  type DefinicaoFormulario,
  type DuvidaAtual,
} from "@/lib/formularios";

type Props = {
  definicao: DefinicaoFormulario;
  semanaKey: SemanaKey;
  atividade?: EstadoAtividade;
  duvidas?: readonly DuvidaAtual[];
  somenteLeitura?: boolean;
};

/** Ponte serializável entre a página de conteúdo e os adapters das APIs. */
export default function FormularioCurso({
  definicao,
  semanaKey,
  atividade,
  duvidas = [],
  somenteLeitura = false,
}: Props) {
  const adapter = useMemo(
    () =>
      definicao.workflow.tipo === "quest"
        ? criarAdaptadorQuestAtual({
            atividadeKey: definicao.codigo,
            respostaIdInicial: atividade?.id ?? undefined,
            respostasIniciais: atividade?.respostas,
            statusInicial: atividade?.status,
            anexosIniciais: atividade?.anexos,
          })
        : criarAdaptadorDuvidaAtual({
            semanaKey,
            iniciais: duvidas,
          }),
    [atividade, definicao, duvidas, semanaKey],
  );

  return (
    <Formulario
      codigo={definicao.codigo}
      definicao={definicao}
      adapter={adapter}
      contexto={{ semanaKey }}
      somenteLeitura={somenteLeitura}
      mostrarHistorico={definicao.workflow.tipo === "duvida"}
    />
  );
}
