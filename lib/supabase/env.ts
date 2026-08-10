function required(
  value: string | undefined,
  name: string,
  fallbackValue?: string,
  fallbackName?: string,
): string {
  const normalized = value?.trim() || fallbackValue?.trim();

  if (!normalized) {
    const fallback = fallbackName ? ` (ou ${fallbackName})` : "";
    throw new Error(`Variável de ambiente ausente: ${name}${fallback}.`);
  }

  return normalized;
}

export function supabaseUrl(): string {
  const value = required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não contém uma URL válida.");
  }
}

/** A publishable key é o nome atual; a anon key continua aceita na transição. */
export function supabasePublicKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/** Nunca importar esta função em Client Components. */
export function supabaseSecretKey(): string {
  return required(
    process.env.SUPABASE_SECRET_KEY,
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
}

export function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL não contém uma URL válida.");
  }
}
