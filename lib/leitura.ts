/** Regras puras do registro de leitura (testáveis sem banco). */

export const STATUS_LEITURA = ["lido", "entendido", "duvida"] as const;
export type StatusLeitura = (typeof STATUS_LEITURA)[number];

export function validaStatus(value: unknown): StatusLeitura | null {
  return typeof value === "string" && (STATUS_LEITURA as readonly string[]).includes(value)
    ? (value as StatusLeitura)
    : null;
}

/** Pulsos de tempo aceitos: inteiros de 1 a 120 segundos. Fora disso, 0 (ignorado). */
export function clampSegundos(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n, 120);
}

export function rotuloStatus(status: string | null | undefined): string {
  if (status === "lido") return "Lido";
  if (status === "entendido") return "Entendido";
  if (status === "duvida") return "Com dúvidas";
  return "—";
}

export function formataTempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return "—";
  const total = Math.trunc(segundos);
  if (total < 60) return `${total} s`;
  const minutos = Math.trunc(total / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.trunc(minutos / 60);
  const resto = minutos % 60;
  return resto > 0 ? `${horas} h ${String(resto).padStart(2, "0")} min` : `${horas} h`;
}
