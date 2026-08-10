import { NextResponse, type NextRequest } from "next/server";
import { getUserEmail, memberStatus, isAdmin, logEvento } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function errorResponse(message: string, status: number) {
  return noStore(NextResponse.json({ erro: message }, { status }));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) {
    return errorResponse("id inválido", 400);
  }

  const email = await getUserEmail();
  if (!email) {
    return errorResponse("sem sessão", 401);
  }

  const [status, admin] = await Promise.all([memberStatus(email), isAdmin(email)]);
  if (status !== "ok" && !admin) {
    return errorResponse("sem acesso", 403);
  }

  const db = adminClient();

  // Material de leitura não sai do app: sem download.
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("modo")
    .eq("id", downloadId)
    .maybeSingle();
  if (cardError) {
    console.error("Falha ao buscar material:", cardError.code);
    return errorResponse("falha ao buscar material", 500);
  }
  if (!card) {
    return errorResponse("material não existe", 404);
  }
  if (card.modo !== "download") {
    return errorResponse("este material é de leitura dentro do app", 403);
  }

  const { data: arquivo, error: arquivoError } = await db
    .from("arquivos")
    .select("id, file")
    .eq("download_id", downloadId)
    .eq("ativo", true)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (arquivoError) {
    console.error("Falha ao buscar material:", arquivoError.code);
    return errorResponse("falha ao buscar material", 500);
  }

  if (!arquivo) {
    return errorResponse("sem arquivo ativo", 404);
  }

  const { data: signed, error } = await db.storage
    .from("materiais")
    .createSignedUrl(arquivo.file, 60);

  if (error || !signed) {
    return errorResponse("falha ao assinar", 500);
  }

  await logEvento(email, "download", downloadId);
  return noStore(NextResponse.redirect(signed.signedUrl));
}
