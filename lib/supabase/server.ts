import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicKey, supabaseUrl } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Cliente com a sessão do usuário (RLS vale). Só em Server Components/Actions/Routes. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl(),
    supabasePublicKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[], _headers: Record<string, string>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Em Server Components a resposta é imutável; o middleware renova.
          }
        },
      },
    }
  );
}
