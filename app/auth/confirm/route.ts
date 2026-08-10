import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvento } from "@/lib/auth";
import { siteUrl } from "@/lib/supabase/env";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const site = siteUrl();

  const supabase = await createClient();

  // Formato 1: link direto com token_hash (template de e-mail personalizado).
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const email = data.user?.email?.toLowerCase();
      if (email) await logEvento(email, "login");
      return noStore(NextResponse.redirect(new URL("/", site)));
    }
  }

  // Formato 2: fluxo PKCE do template padrão do Supabase — o e-mail aponta
  // pro /auth/v1/verify deles, que redireciona pra cá com ?code=...
  // Requer o mesmo navegador que pediu o link (o code_verifier fica em cookie).
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const email = data.user?.email?.toLowerCase();
      if (email) await logEvento(email, "login");
      return noStore(NextResponse.redirect(new URL("/", site)));
    }
    console.error("Falha na troca do código de login:", error.code);
  }

  return noStore(NextResponse.redirect(new URL("/login?erro=link-invalido", site)));
}
