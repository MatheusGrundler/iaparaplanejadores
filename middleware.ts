import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PRIVATE_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authHeaders = { ...PRIVATE_CACHE_HEADERS };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error("Configuração pública do Supabase ausente no middleware.");
  }

  const applyAuthState = (target: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    Object.entries(authHeaders).forEach(([name, value]) => target.headers.set(name, value));
    return target;
  };

  const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[], headers: Record<string, string>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        authHeaders = { ...authHeaders, ...headers };
        Object.entries(authHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Verifica a assinatura do token e renova a sessão quando necessário.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims.sub);

  const { pathname } = request.nextUrl;

  // Landing pública: anônimo na raiz vê a página de vendas (um projeto só);
  // logado segue para a área de conteúdos, na mesma raiz.
  if (pathname === "/" && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/landing.html";
    return applyAuthState(NextResponse.rewrite(url));
  }

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === "/landing.html" ||
    pathname === "/api/inscricao" ||
    pathname.startsWith("/videos-institucional");

  if (!isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyAuthState(NextResponse.redirect(url));
  }

  if (isAuthenticated && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return applyAuthState(NextResponse.redirect(url));
  }

  return applyAuthState(response);
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
