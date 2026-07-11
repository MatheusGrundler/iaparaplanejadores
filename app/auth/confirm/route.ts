import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvento } from "@/lib/auth";
import { siteUrl } from "@/lib/supabase/env";

function noStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0"
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const site = siteUrl();

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const email = data.user?.email?.toLowerCase();
      if (email) await logEvento(email, "login");
      return noStore(NextResponse.redirect(new URL("/", site)));
    }
  }

  return noStore(
    NextResponse.redirect(new URL("/login?erro=link-invalido", site))
  );
}
