import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "./env";

/**
 * Cliente service_role: ignora RLS. SÓ pode ser usado no servidor,
 * e sempre depois de conferir quem está chamando (aluno logado ou admin).
 */
export function adminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Ponto único para novos fluxos server-side que precisam do cliente elevado.
 * Mantém a criação da infraestrutura confinada a este adapter.
 */
export function privilegedDatabase() {
  return adminClient();
}

export type PrivilegedDatabase = ReturnType<typeof adminClient>;
