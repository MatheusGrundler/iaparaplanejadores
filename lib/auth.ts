import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { expiracaoEfetiva, normalizeEmail } from "@/lib/access";

export { expiracaoEfetiva } from "@/lib/access";

export type MemberStatus = "ok" | "expirado" | "sem-acesso";

export async function getUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  return typeof email === "string" ? normalizeEmail(email) : null;
}

export async function memberStatus(email: string): Promise<MemberStatus> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("whitelist")
    .select("email, expira_em, turmas(acesso_ate)")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) {
    console.error("Falha ao verificar acesso do membro:", error.code);
    return "sem-acesso";
  }
  if (!data) return "sem-acesso";
  const turma = data.turmas as unknown as { acesso_ate: string | null } | null;
  const limite = expiracaoEfetiva(data.expira_em, turma?.acesso_ate);
  if (limite && limite.getTime() <= Date.now()) return "expirado";
  return "ok";
}

export async function isAdmin(email: string): Promise<boolean> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("admins")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) {
    console.error("Falha ao verificar permissão administrativa:", error.code);
    return false;
  }
  return Boolean(data);
}

/** Gates reutilizáveis: páginas com secret key não confiam só no layout. */
export async function canAccessMemberArea(): Promise<boolean> {
  const email = await getUserEmail();
  if (!email) return false;
  const [status, admin] = await Promise.all([
    memberStatus(email),
    isAdmin(email),
  ]);
  return status === "ok" || admin;
}

export async function canAccessAdminArea(): Promise<boolean> {
  const email = await getUserEmail();
  return Boolean(email && (await isAdmin(email)));
}

export async function logEvento(email: string, tipo: string, ref?: number) {
  const admin = adminClient();
  const { error } = await admin.from("eventos").insert({
    email: normalizeEmail(email),
    tipo,
    ref: ref ?? null,
  });
  if (error) console.error("Falha ao registrar evento:", error.code);
}
