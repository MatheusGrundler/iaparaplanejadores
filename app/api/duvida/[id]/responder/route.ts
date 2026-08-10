import { NextResponse, type NextRequest } from "next/server";
import { getUserEmail, isAdmin, logEvento } from "@/lib/auth";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { sanitizaRico } from "@/lib/sanitiza";
import { normalizeEmail } from "@/lib/access";

/** Resposta do admin a uma dúvida (HTML sanitizado). */

function noStore<T extends NextResponse>(r: T): T {
  r.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return r;
}
const jsonErro = (m: string, s: number) =>
  noStore(NextResponse.json({ ok: false, erro: m }, { status: s }));

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) {
    return jsonErro("id inválido", 400);
  }
  const email = await getUserEmail();
  if (!email || !(await isAdmin(email))) return jsonErro("sem acesso", 403);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return jsonErro("corpo inválido", 400);
  }

  const aluno = normalizeEmail(String(body.aluno ?? ""));
  const html = sanitizaRico(String(body.html ?? ""));
  if (!aluno) return jsonErro("aluno inválido", 400);
  if (!html) return jsonErro("resposta vazia", 400);

  const db = privilegedDatabase();
  const { data: leitura } = await db
    .from("leituras")
    .select("id")
    .eq("download_id", downloadId)
    .eq("email", aluno)
    .maybeSingle();
  if (!leitura) return jsonErro("dúvida não encontrada", 404);

  const { error } = await db
    .from("leituras")
    .update({ resposta_html: html, respondida_em: new Date().toISOString() })
    .eq("id", leitura.id);
  if (error) {
    console.error("Falha ao responder dúvida:", error.code);
    return jsonErro("falha ao responder", 500);
  }
  await logEvento(aluno, "duvida_respondida", downloadId);
  return noStore(NextResponse.json({ ok: true }));
}
