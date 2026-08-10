import { NextResponse, type NextRequest } from "next/server";
import { getUserEmail, memberStatus, isAdmin } from "@/lib/auth";
import { privilegedDatabase } from "@/lib/supabase/admin";

/**
 * Serve o material de leitura DENTRO do app (sem download):
 * baixa o arquivo ativo do bucket privado no servidor e devolve inline,
 * pra ser exibido no iframe de /material/[id].
 */

const TIPOS_INLINE: Record<string, string> = {
  html: "text/html; charset=utf-8",
  pdf: "application/pdf",
};

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

  const db = privilegedDatabase();
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("id, modo")
    .eq("id", downloadId)
    .maybeSingle();
  if (cardError) {
    console.error("Falha ao buscar material:", cardError.code);
    return errorResponse("falha ao buscar material", 500);
  }
  if (!card) {
    return errorResponse("material não existe", 404);
  }
  if (card.modo !== "leitura") {
    return errorResponse("este material não é de leitura no app", 403);
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
    console.error("Falha ao buscar arquivo:", arquivoError.code);
    return errorResponse("falha ao buscar arquivo", 500);
  }
  if (!arquivo) {
    return errorResponse("sem arquivo ativo", 404);
  }

  const extensao = arquivo.file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = TIPOS_INLINE[extensao];
  if (!contentType) {
    return errorResponse("este formato não abre no leitor", 415);
  }

  const { data: blob, error: downloadError } = await db.storage
    .from("materiais")
    .download(arquivo.file);
  if (downloadError || !blob) {
    console.error("Falha ao ler do storage:", downloadError?.message);
    return errorResponse("falha ao carregar o material", 500);
  }

  const corpo = Buffer.from(await blob.arrayBuffer());
  const response = new NextResponse(corpo, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      // Reforço local; a regra por rota no next.config.ts garante os valores finais.
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
    },
  });
  return noStore(response);
}
