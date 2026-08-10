import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { respostaJson } from "@/app/api/curso/http";
import { logEvento } from "@/lib/auth";
import {
  contextoFalhou,
  contextoPublicacaoEditavel,
  descartarRascunhoComunidade,
} from "@/lib/comunidade-server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const contexto = await contextoPublicacaoEditavel(id);
  if (contextoFalhou(contexto)) {
    return respostaJson({ ok: false, erro: contexto.erro }, contexto.status);
  }
  const { db, post, identity } = contexto;
  if (post.publicado) return respostaJson({ ok: true });

  const { data: anexo, error: anexoError } = await db
    .from("post_anexos")
    .select("id")
    .eq("post_id", post.id)
    .eq("status", "pronto")
    .limit(1)
    .maybeSingle();
  if (anexoError) {
    console.error("Falha ao validar anexos antes da publicação:", anexoError.code);
    return respostaJson({ ok: false, erro: "Não consegui publicar agora." }, 500);
  }
  if (!post.texto.trim() && !post.conteudo_html?.trim() && !anexo) {
    return respostaJson({ ok: false, erro: "Escreva algo ou adicione um anexo." }, 400);
  }

  const { data, error } = await db
    .from("posts")
    .update({ publicado: true })
    .eq("id", post.id)
    .eq("publicado", false)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Falha ao publicar na comunidade:", error.code);
    const status = error.code === "23514" ? 400 : 500;
    return respostaJson({ ok: false, erro: "Escreva algo ou adicione um anexo." }, status);
  }
  if (!data) return respostaJson({ ok: false, erro: "A publicação já mudou." }, 409);

  await logEvento(identity.email, "post", post.id);
  revalidatePath("/comunidade");
  return respostaJson({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const contexto = await contextoPublicacaoEditavel(id);
  if (contextoFalhou(contexto)) {
    return respostaJson({ ok: false, erro: contexto.erro }, contexto.status);
  }
  const { db, post } = contexto;
  if (post.publicado) {
    return respostaJson({ ok: false, erro: "Só rascunhos podem ser descartados." }, 409);
  }

  if (!(await descartarRascunhoComunidade(db, post.id))) {
    return respostaJson({ ok: false, erro: "Não consegui descartar o rascunho." }, 500);
  }
  return respostaJson({ ok: true });
}
