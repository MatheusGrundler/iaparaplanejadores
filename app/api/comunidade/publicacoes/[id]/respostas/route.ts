import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { corpoJson, respostaJson } from "@/app/api/curso/http";
import { getMemberIdentity, logEvento } from "@/lib/auth";
import { prepararConteudoComunidade } from "@/lib/comunidade";
import { privilegedDatabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

function idValido(valor: string) {
  return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const [{ id }, identity, body] = await Promise.all([params, getMemberIdentity(), corpoJson(req)]);
  if (!identity) return respostaJson({ ok: false, erro: "Sem acesso." }, 403);
  if (!idValido(id) || !body) return respostaJson({ ok: false, erro: "Dados inválidos." }, 400);

  const preparado = prepararConteudoComunidade(body.html);
  if ("erro" in preparado || !preparado.conteudo.texto || !preparado.conteudo.html) {
    return respostaJson({ ok: false, erro: preparado.erro ?? "Escreva uma resposta." }, 400);
  }

  const parentId = body.parentId;
  if (
    parentId !== undefined &&
    (typeof parentId !== "number" || !Number.isSafeInteger(parentId) || parentId <= 0)
  ) {
    return respostaJson({ ok: false, erro: "Resposta de origem inválida." }, 400);
  }

  const db = privilegedDatabase();
  const postId = Number(id);
  const [{ data: post, error: postError }, { data: aluno, error: alunoError }] = await Promise.all([
    db.from("posts").select("id").eq("id", postId).eq("publicado", true).eq("deletado", false).maybeSingle(),
    db.from("whitelist").select("nome").eq("email", identity.email).maybeSingle(),
  ]);
  if (postError || alunoError) {
    console.error("Falha ao preparar resposta da comunidade:", postError?.code ?? alunoError?.code);
    return respostaJson({ ok: false, erro: "Não consegui enviar sua resposta." }, 500);
  }
  if (!post) return respostaJson({ ok: false, erro: "Essa publicação não está mais disponível." }, 404);

  if (parentId !== undefined) {
    const { data: parent, error: parentError } = await db
      .from("post_respostas")
      .select("id")
      .eq("id", parentId)
      .eq("post_id", postId)
      .eq("deletado", false)
      .maybeSingle();
    if (parentError) {
      console.error("Falha ao validar resposta de origem:", parentError.code);
      return respostaJson({ ok: false, erro: "Não consegui enviar sua resposta." }, 500);
    }
    if (!parent) return respostaJson({ ok: false, erro: "Essa resposta não está mais disponível." }, 404);
  }

  const autor = identity.admin ? "Equipe IA para Planejadores" : aluno?.nome || identity.email.split("@")[0];
  const { data, error } = await db
    .from("post_respostas")
    .insert({
      post_id: postId,
      parent_id: parentId ?? null,
      user_id: identity.userId,
      autor,
      texto: preparado.conteudo.texto,
      conteudo_html: preparado.conteudo.html,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Falha ao criar resposta da comunidade:", error?.code);
    return respostaJson({ ok: false, erro: "Não consegui enviar sua resposta." }, 500);
  }

  await logEvento(identity.email, "resposta-comunidade", postId, String(data.id));
  revalidatePath("/comunidade");
  return respostaJson({ ok: true, id: data.id });
}
