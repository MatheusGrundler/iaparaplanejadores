import { NextResponse, type NextRequest } from "next/server";
import { getUserEmail, memberStatus, isAdmin, logEvento } from "@/lib/auth";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { sanitizaRico, textoPuro } from "@/lib/sanitiza";

/**
 * Dúvida rica de um material:
 * - GET: thread do próprio aluno (ou de ?aluno=, se admin) com anexos assinados;
 * - POST: grava/atualiza a dúvida (HTML sanitizado) e marca o status "duvida".
 */

function noStore<T extends NextResponse>(r: T): T {
  r.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return r;
}
const jsonErro = (m: string, s: number) =>
  noStore(NextResponse.json({ ok: false, erro: m }, { status: s }));

async function contexto(req: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) {
    return { erro: jsonErro("id inválido", 400) } as const;
  }
  const email = await getUserEmail();
  if (!email) return { erro: jsonErro("sem sessão", 401) } as const;
  const [status, admin] = await Promise.all([memberStatus(email), isAdmin(email)]);
  if (status !== "ok" && !admin) return { erro: jsonErro("sem acesso", 403) } as const;
  const db = privilegedDatabase();
  const { data: card } = await db
    .from("downloads")
    .select("id, modo")
    .eq("id", downloadId)
    .maybeSingle();
  if (!card || card.modo !== "leitura") {
    return { erro: jsonErro("material não é de leitura", 404) } as const;
  }
  return { downloadId, email, admin, db } as const;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await contexto(req, params);
  if ("erro" in ctx) return ctx.erro;
  const { downloadId, email, admin, db } = ctx;

  const alunoParam = new URL(req.url).searchParams.get("aluno")?.toLowerCase().trim();
  const alvo = alunoParam && admin ? alunoParam : email;

  const { data: leitura } = await db
    .from("leituras")
    .select("id, duvida_html, resposta_html, respondida_em, status")
    .eq("download_id", downloadId)
    .eq("email", alvo)
    .maybeSingle();

  const anexos: {
    id: number;
    path: string;
    tipo: string;
    nome: string;
    url: string;
  }[] = [];
  if (leitura) {
    const { data: linhas } = await db
      .from("leitura_anexos")
      .select("id, file, tipo")
      .eq("leitura_id", leitura.id)
      .order("id");
    for (const a of linhas ?? []) {
      const { data: assinado } = await db.storage.from("duvidas").createSignedUrl(a.file, 600);
      if (assinado) {
        anexos.push({
          id: a.id,
          path: a.file,
          tipo: a.tipo,
          nome: a.file.split("/").pop()?.replace(/^\d+-/, "") ?? a.file,
          url: assinado.signedUrl,
        });
      }
    }
  }

  return noStore(
    NextResponse.json({
      ok: true,
      duvidaHtml: leitura?.duvida_html ?? "",
      respostaHtml: leitura?.resposta_html ?? "",
      respondidaEm: leitura?.respondida_em ?? null,
      status: leitura?.status ?? null,
      anexos,
    }),
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await contexto(req, params);
  if ("erro" in ctx) return ctx.erro;
  const { downloadId, email, db } = ctx;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return jsonErro("corpo inválido", 400);
  }

  const html = sanitizaRico(String(body.html ?? ""));
  const agora = new Date().toISOString();
  const { error } = await db.from("leituras").upsert(
    {
      download_id: downloadId,
      email,
      status: "duvida",
      duvida_html: html,
      duvida: textoPuro(html) || null,
      status_em: agora,
      ultimo_acesso: agora,
    },
    { onConflict: "download_id,email" },
  );
  if (error) {
    console.error("Falha ao gravar dúvida:", error.code);
    return jsonErro("falha ao registrar", 500);
  }
  await logEvento(email, "leitura_duvida", downloadId);
  return noStore(NextResponse.json({ ok: true }));
}
