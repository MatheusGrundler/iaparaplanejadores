import { NextResponse, type NextRequest } from "next/server";
import { getUserEmail, memberStatus, isAdmin } from "@/lib/auth";
import { privilegedDatabase, type PrivilegedDatabase } from "@/lib/supabase/admin";
import { LIMITES_ANEXOS, nomeSeguro, tipoDoMime, validaNovoAnexo } from "@/lib/duvida";

/**
 * Anexos da dúvida (imagens até 10 MB, máx. 10; vídeos até 100 MB, máx. 5).
 * O upload vai DIRETO do navegador pro Storage com URL assinada (não passa
 * pelo servidor, então vídeo grande não estoura o limite da função):
 * - POST: valida limites e devolve a URL assinada de upload;
 * - PUT: confirma o upload e registra o anexo;
 * - DELETE: remove um anexo (dono ou admin).
 */

function noStore<T extends NextResponse>(r: T): T {
  r.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return r;
}
const jsonErro = (m: string, s: number) =>
  noStore(NextResponse.json({ ok: false, erro: m }, { status: s }));

type Ctx = { params: Promise<{ id: string }> };

async function contexto(params: Ctx["params"]) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) {
    return { erro: jsonErro("id inválido", 400) } as const;
  }
  const email = await getUserEmail();
  if (!email) return { erro: jsonErro("sem sessão", 401) } as const;
  const [status, admin] = await Promise.all([memberStatus(email), isAdmin(email)]);
  if (status !== "ok" && !admin) return { erro: jsonErro("sem acesso", 403) } as const;
  return { downloadId, email, admin, db: privilegedDatabase() } as const;
}

async function leituraDoAluno(
  db: PrivilegedDatabase,
  downloadId: number,
  email: string,
  criar: boolean,
) {
  const { data } = await db
    .from("leituras")
    .select("id")
    .eq("download_id", downloadId)
    .eq("email", email)
    .maybeSingle();
  if (data || !criar) return data;
  const { data: nova, error } = await db
    .from("leituras")
    .insert({ download_id: downloadId, email })
    .select("id")
    .maybeSingle();
  if (error) console.error("Falha ao criar leitura pro anexo:", error.code);
  return nova;
}

async function parse(req: NextRequest) {
  try {
    return JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function donoDoAnexo(valor: unknown) {
  const candidato = Array.isArray(valor) ? valor[0] : valor;
  if (!candidato || typeof candidato !== "object") return null;
  const leitura = candidato as Record<string, unknown>;
  if (typeof leitura.download_id !== "number" || typeof leitura.email !== "string") {
    return null;
  }
  return { download_id: leitura.download_id, email: leitura.email };
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const ctx = await contexto(params);
  if ("erro" in ctx) return ctx.erro;
  const { downloadId, email, db } = ctx;
  const body = await parse(req);
  if (!body) return jsonErro("corpo inválido", 400);

  const mime = String(body.mime ?? "");
  const bytes = Number(body.bytes ?? 0);
  const tipo = tipoDoMime(mime);
  if (!tipo) return jsonErro("só imagens e vídeos", 415);

  const leitura = await leituraDoAluno(db, downloadId, email, true);
  if (!leitura) return jsonErro("falha ao preparar", 500);

  const { data: existentes } = await db
    .from("leitura_anexos")
    .select("tipo")
    .eq("leitura_id", leitura.id);
  const problema = validaNovoAnexo(existentes ?? [], tipo, bytes);
  if (problema) return jsonErro(problema, 400);

  const path = `l${leitura.id}/${Date.now()}-${nomeSeguro(String(body.nome ?? "arquivo"))}`;
  const { data: assinado, error } = await db.storage.from("duvidas").createSignedUploadUrl(path);
  if (error || !assinado) {
    console.error("Falha ao assinar upload:", error?.message);
    return jsonErro("falha ao preparar upload", 500);
  }
  return noStore(
    NextResponse.json({
      ok: true,
      path,
      url: assinado.signedUrl,
      token: assinado.token,
      limites: LIMITES_ANEXOS,
    }),
  );
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const ctx = await contexto(params);
  if ("erro" in ctx) return ctx.erro;
  const { downloadId, email, db } = ctx;
  const body = await parse(req);
  if (!body) return jsonErro("corpo inválido", 400);

  const path = String(body.path ?? "");
  const mime = String(body.mime ?? "");
  const bytes = Number(body.bytes ?? 0);
  const tipo = tipoDoMime(mime);
  if (!tipo) return jsonErro("só imagens e vídeos", 415);

  const leitura = await leituraDoAluno(db, downloadId, email, false);
  if (!leitura || !path.startsWith(`l${leitura.id}/`)) {
    return jsonErro("anexo não pertence a esta dúvida", 403);
  }

  const pasta = path.split("/")[0];
  const arquivo = path.split("/").slice(1).join("/");
  const { data: achados } = await db.storage
    .from("duvidas")
    .list(pasta, { search: arquivo, limit: 1 });
  if (!achados || achados.length === 0) {
    return jsonErro("upload não encontrado no storage", 400);
  }

  const { error } = await db.from("leitura_anexos").insert({
    leitura_id: leitura.id,
    file: path,
    tipo,
    bytes: Math.max(1, Math.trunc(bytes)),
  });
  if (error) {
    console.error("Falha ao registrar anexo:", error.code);
    return jsonErro("falha ao registrar anexo", 500);
  }
  return noStore(NextResponse.json({ ok: true }));
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const ctx = await contexto(params);
  if ("erro" in ctx) return ctx.erro;
  const { downloadId, email, admin, db } = ctx;
  const body = await parse(req);
  if (!body) return jsonErro("corpo inválido", 400);
  const path = String(body.path ?? "");

  const { data: anexo } = await db
    .from("leitura_anexos")
    .select("id, file, leituras!inner(download_id, email)")
    .eq("file", path)
    .maybeSingle();
  const dono = donoDoAnexo(anexo?.leituras);
  if (!anexo || !dono || dono.download_id !== downloadId) {
    return jsonErro("anexo não encontrado", 404);
  }
  if (dono.email !== email && !admin) return jsonErro("sem acesso", 403);

  await db.storage.from("duvidas").remove([anexo.file]);
  const { error } = await db.from("leitura_anexos").delete().eq("id", anexo.id);
  if (error) {
    console.error("Falha ao remover anexo:", error.code);
    return jsonErro("falha ao remover", 500);
  }
  return noStore(NextResponse.json({ ok: true }));
}
