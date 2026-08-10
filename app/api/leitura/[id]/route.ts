import { NextResponse, type NextRequest } from "next/server";
import { getUserEmail, memberStatus, isAdmin, logEvento } from "@/lib/auth";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { clampSegundos, validaStatus } from "@/lib/leitura";

/**
 * Registro de leitura do aluno, por material:
 * - acao "abrir": marca primeiro/último acesso;
 * - acao "pulso": soma segundos de tela (enviado pelo leitor enquanto a aba está visível);
 * - acao "status": grava lido / entendido / duvida (com o texto da dúvida).
 * Aceita sendBeacon (corpo texto), por isso o parse manual do JSON.
 */

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return response;
}

function jsonOk() {
  return noStore(NextResponse.json({ ok: true }));
}

function jsonErro(message: string, status: number) {
  return noStore(NextResponse.json({ ok: false, erro: message }, { status }));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) {
    return jsonErro("id inválido", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return jsonErro("corpo inválido", 400);
  }

  const email = await getUserEmail();
  if (!email) return jsonErro("sem sessão", 401);

  const [status, admin] = await Promise.all([memberStatus(email), isAdmin(email)]);
  if (status !== "ok" && !admin) return jsonErro("sem acesso", 403);

  const db = privilegedDatabase();
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("id, modo")
    .eq("id", downloadId)
    .maybeSingle();
  if (cardError) {
    console.error("Falha ao buscar material:", cardError.code);
    return jsonErro("falha ao buscar material", 500);
  }
  if (!card || card.modo !== "leitura") {
    return jsonErro("material não é de leitura", 404);
  }

  const acao = String(body.acao ?? "");
  const agora = new Date().toISOString();

  if (acao === "abrir") {
    const { data: existente, error: leituraError } = await db
      .from("leituras")
      .select("id")
      .eq("download_id", downloadId)
      .eq("email", email)
      .maybeSingle();
    if (leituraError) {
      console.error("Falha ao buscar leitura:", leituraError.code);
      return jsonErro("falha ao registrar", 500);
    }
    if (existente) {
      const { error } = await db
        .from("leituras")
        .update({ ultimo_acesso: agora })
        .eq("id", existente.id);
      if (error) console.error("Falha ao atualizar acesso:", error.code);
    } else {
      const { error } = await db
        .from("leituras")
        .insert({ download_id: downloadId, email, ultimo_acesso: agora });
      if (error) {
        console.error("Falha ao criar leitura:", error.code);
        return jsonErro("falha ao registrar", 500);
      }
      await logEvento(email, "leitura_abrir", downloadId);
    }
    return jsonOk();
  }

  if (acao === "pulso") {
    const segundos = clampSegundos(body.segundos);
    if (segundos === 0) return jsonOk();
    const { error } = await db.rpc("leitura_pulso", {
      p_download_id: downloadId,
      p_email: email,
      p_segundos: segundos,
    });
    if (error) {
      console.error("Falha no pulso de leitura:", error.code);
      return jsonErro("falha ao registrar", 500);
    }
    return jsonOk();
  }

  if (acao === "respostas") {
    const respostas = body.respostas;
    if (
      !respostas ||
      typeof respostas !== "object" ||
      Array.isArray(respostas) ||
      JSON.stringify(respostas).length > 8000
    ) {
      return jsonErro("respostas inválidas", 400);
    }
    const { error } = await db.from("leituras").upsert(
      {
        download_id: downloadId,
        email,
        respostas,
        ultimo_acesso: agora,
      },
      { onConflict: "download_id,email" },
    );
    if (error) {
      console.error("Falha ao gravar respostas:", error.code);
      return jsonErro("falha ao registrar", 500);
    }
    return jsonOk();
  }

  if (acao === "status") {
    const novoStatus = validaStatus(body.status);
    if (!novoStatus) return jsonErro("status inválido", 400);
    const duvida =
      novoStatus === "duvida"
        ? String(body.duvida ?? "")
            .trim()
            .slice(0, 2000) || null
        : null;
    const { error } = await db.from("leituras").upsert(
      {
        download_id: downloadId,
        email,
        status: novoStatus,
        duvida,
        status_em: agora,
        ultimo_acesso: agora,
      },
      { onConflict: "download_id,email" },
    );
    if (error) {
      console.error("Falha ao gravar status:", error.code);
      return jsonErro("falha ao registrar", 500);
    }
    await logEvento(email, `leitura_${novoStatus}`, downloadId);
    return jsonOk();
  }

  return jsonErro("ação desconhecida", 400);
}
