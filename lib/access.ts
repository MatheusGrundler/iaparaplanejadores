export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Expiração efetiva: override individual > prazo da turma > nunca expira. */
export function expiracaoEfetiva(
  expiraEm: string | null,
  acessoAteTurma: string | null | undefined
): Date | null {
  const raw = expiraEm ?? acessoAteTurma ?? null;
  if (!raw) return null;

  const limite = new Date(raw);
  if (Number.isNaN(limite.getTime())) {
    throw new RangeError("Data de expiração inválida.");
  }

  return limite;
}
