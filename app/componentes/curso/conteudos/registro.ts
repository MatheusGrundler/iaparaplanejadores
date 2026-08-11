import type { SemanaKey } from "@/lib/curso-atividades";
import type { RegistroConteudoNativo } from "./tipos";
import { CONTEUDOS_V1 } from "./v1/registro";

export const VERSAO_CONTEUDO_PADRAO = "v1";

/** Registro explícito das edições que existem no repositório. */
export const VERSOES_CONTEUDO = {
  v1: { rotulo: "Versão 1", conteudos: CONTEUDOS_V1 },
} as const;

export type VersaoConteudo = keyof typeof VERSOES_CONTEUDO;

export function versaoConteudoValida(valor: string): valor is VersaoConteudo {
  return valor in VERSOES_CONTEUDO;
}

export function listarVersoesConteudo() {
  return Object.entries(VERSOES_CONTEUDO).map(([codigo, versao]) => ({
    codigo: codigo as VersaoConteudo,
    rotulo: versao.rotulo,
  }));
}

export function conteudoNativoPorVersao(
  versao: VersaoConteudo,
  key: SemanaKey,
): RegistroConteudoNativo {
  return VERSOES_CONTEUDO[versao].conteudos[key];
}

/** Compatibilidade com os consumidores antigos: o conteúdo atual é a v1. */
export const CONTEUDOS_NATIVOS = CONTEUDOS_V1;

export function conteudoNativoPorKey(key: SemanaKey): RegistroConteudoNativo {
  return conteudoNativoPorVersao(VERSAO_CONTEUDO_PADRAO, key);
}
