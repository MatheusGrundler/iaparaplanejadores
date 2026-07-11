"use server";

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/access";
import { siteUrl } from "@/lib/supabase/env";

export type LoginState = { ok: boolean; msg: string } | null;

export async function enviarLinkMagico(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, msg: "Digite um e-mail válido." };
  }

  // só dispara o link pra quem está liberado (whitelist ou admin),
  // mas a resposta é a mesma pra todo mundo (sem vazar quem é aluno)
  const admin = adminClient();
  const [membroResult, admResult] = await Promise.all([
    admin.from("whitelist").select("email").eq("email", email).maybeSingle(),
    admin.from("admins").select("email").eq("email", email).maybeSingle(),
  ]);
  if (membroResult.error || admResult.error) {
    console.error(
      "Falha ao consultar autorização de login:",
      membroResult.error?.code ?? admResult.error?.code
    );
  }

  if (membroResult.data || admResult.data) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
    });
    if (error) console.error("Falha ao enviar link mágico:", error.code);
  }

  return {
    ok: true,
    msg: "Se esse e-mail estiver liberado, o link de acesso chega em instantes. Confira também o spam.",
  };
}
