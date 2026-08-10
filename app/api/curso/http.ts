import { NextResponse, type NextRequest } from "next/server";
import { getMemberIdentity, type MemberIdentity } from "@/lib/auth";

type IdentidadeEditavel =
  { identity: MemberIdentity; resposta?: never } | { identity?: never; resposta: NextResponse };

export function respostaJson(body: Record<string, unknown>, status = 200): NextResponse {
  const resposta = NextResponse.json(body, { status });
  resposta.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return resposta;
}

export async function corpoJson(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function obterIdentidadeEditavel(mensagemAdmin: string): Promise<IdentidadeEditavel> {
  const identity = await getMemberIdentity();
  if (!identity) {
    return { resposta: respostaJson({ ok: false, erro: "Sem acesso." }, 403) };
  }
  if (identity.admin) {
    return { resposta: respostaJson({ ok: false, erro: mensagemAdmin }, 403) };
  }
  return { identity };
}
