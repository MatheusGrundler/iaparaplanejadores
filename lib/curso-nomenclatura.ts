import type { SemanaKey } from "@/lib/curso-atividades";

type EtapaNumerada = { number: number };

const SLUG_PUBLICO_POR_CHAVE: Readonly<Record<SemanaKey, string>> = {
  "semana-0": "preparacao",
  "semana-1": "1",
  "semana-2": "2",
  "semana-3": "3",
  "semana-4": "4",
};

/**
 * A chave interna continua sendo `semana-*` para preservar respostas e links.
 * Na interface, a trilha usa uma nomenclatura que não sugere calendário.
 */
export function rotuloEtapa(etapa: EtapaNumerada | number) {
  const numero = typeof etapa === "number" ? etapa : etapa.number;
  return numero === 0 ? "Preparação" : `Etapa ${numero}`;
}

/** Converte a chave estável do banco no segmento curto exibido na URL. */
export function slugPublicoEtapa(chave: SemanaKey) {
  return SLUG_PUBLICO_POR_CHAVE[chave];
}

/** Aceita tanto a URL atual quanto a chave legada para permitir redirects seguros. */
export function chaveEtapaDoSlug(slug: string): SemanaKey | null {
  for (const [chave, publico] of Object.entries(SLUG_PUBLICO_POR_CHAVE)) {
    if (slug === publico || slug === chave) return chave as SemanaKey;
  }
  return null;
}
