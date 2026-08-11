import type { NextRequest } from "next/server";
import { corpoJson, respostaJson } from "@/app/api/curso/http";
import { getMemberIdentity } from "@/lib/auth";
import { prepararConteudoComunidade } from "@/lib/comunidade";
import { limparRascunhosExpiradosComunidade } from "@/lib/comunidade-server";
import { privilegedDatabase } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const [identity, body] = await Promise.all([getMemberIdentity(), corpoJson(req)]);
  if (!identity) return respostaJson({ ok: false, erro: "Sem acesso." }, 403);
  if (!body) return respostaJson({ ok: false, erro: "Dados inválidos." }, 400);

  const preparado = prepararConteudoComunidade(body.html);
  if ("erro" in preparado) return respostaJson({ ok: false, erro: preparado.erro }, 400);

  const db = privilegedDatabase();
  await limparRascunhosExpiradosComunidade(db);
  const { data: aluno, error: alunoError } = await db
    .from("whitelist")
    .select("nome")
    .eq("email", identity.email)
    .maybeSingle();
  if (alunoError) {
    console.error("Falha ao buscar nome do autor da comunidade:", alunoError.code);
    return respostaJson({ ok: false, erro: "Não consegui preparar a publicação." }, 500);
  }

  const autor = identity.admin
    ? "Equipe IA para Planejadores"
    : aluno?.nome || identity.email.split("@")[0];
  const { data, error } = await db
    .from("posts")
    .insert({
      autor,
      email: identity.email,
      user_id: identity.userId,
      texto: preparado.conteudo.texto,
      conteudo_html: preparado.conteudo.html,
      publicado: false,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Falha ao criar rascunho da comunidade:", error?.code);
    return respostaJson({ ok: false, erro: "Não consegui preparar a publicação." }, 500);
  }

  return respostaJson({ ok: true, id: String(data.id) });
}
