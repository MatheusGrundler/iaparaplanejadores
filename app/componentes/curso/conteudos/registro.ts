import type { ComponentType } from "react";
import { ATIVIDADES_POR_SEMANA, type SemanaKey } from "@/lib/curso-atividades";
import Etapa1 from "./Etapa1";
import Etapa2 from "./Etapa2";
import Etapa3 from "./Etapa3";
import Etapa4 from "./Etapa4";
import Preparacao from "./Preparacao";
import { etapaFonte } from "./dados";
import type { ConteudoNativoProps, MetadadosConteudoNativo, RegistroConteudoNativo } from "./tipos";

function metadados(key: SemanaKey): MetadadosConteudoNativo {
  const etapa = etapaFonte(key);

  return {
    key,
    slug: etapa.slug,
    numero: etapa.number,
    rotulo: etapa.number === 0 ? "Preparação" : `Etapa ${etapa.number}`,
    titulo: etapa.title,
    promessa: etapa.promise,
    objetivos: etapa.objectives,
    resultado: etapa.result,
    ...(etapa.quest ? { quest: etapa.quest } : {}),
  };
}

function registrar(
  key: SemanaKey,
  componente: ComponentType<ConteudoNativoProps>,
): RegistroConteudoNativo {
  return {
    metadata: metadados(key),
    componente,
    atividades: ATIVIDADES_POR_SEMANA[key],
  };
}

export const CONTEUDOS_NATIVOS = {
  "semana-0": registrar("semana-0", Preparacao),
  "semana-1": registrar("semana-1", Etapa1),
  "semana-2": registrar("semana-2", Etapa2),
  "semana-3": registrar("semana-3", Etapa3),
  "semana-4": registrar("semana-4", Etapa4),
} as const satisfies Readonly<Record<SemanaKey, RegistroConteudoNativo>>;

export function conteudoNativoPorKey(key: SemanaKey): RegistroConteudoNativo {
  return CONTEUDOS_NATIVOS[key];
}
