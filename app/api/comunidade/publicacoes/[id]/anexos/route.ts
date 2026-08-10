import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { corpoJson, respostaJson } from "@/app/api/curso/http";
import {
  BUCKET_COMUNIDADE,
  caminhoAnexoComunidade,
  MAX_ANEXOS_COMUNIDADE,
  MAX_BYTES_COMUNIDADE,
  nomeOriginalSeguro,
  validarNovoAnexoComunidade,
} from "@/lib/comunidade-anexos";
import {
  contextoFalhou,
  contextoPublicacaoEditavel,
  descartarAnexoComunidade,
  type PublicacaoEditavel,
} from "@/lib/comunidade-server";
import { validarObjetoComunidade } from "@/lib/comunidade-storage";
import type { PrivilegedDatabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

type RequisicaoAnexoPreparada =
  | { ok: false; resposta: NextResponse }
  | {
      ok: true;
      body: Record<string, unknown>;
      db: PrivilegedDatabase;
      post: PublicacaoEditavel;
    };

async function prepararRequisicaoAnexo(
  req: NextRequest,
  params: Ctx["params"],
): Promise<RequisicaoAnexoPreparada> {
  const { id } = await params;
  const [contexto, body] = await Promise.all([contextoPublicacaoEditavel(id), corpoJson(req)]);
  if (contextoFalhou(contexto)) {
    return {
      ok: false,
      resposta: respostaJson({ ok: false, erro: contexto.erro }, contexto.status),
    };
  }
  if (!body) {
    return { ok: false, resposta: respostaJson({ ok: false, erro: "Dados inválidos." }, 400) };
  }
  if (contexto.post.publicado) {
    return {
      ok: false,
      resposta: respostaJson({ ok: false, erro: "Essa publicação já foi enviada." }, 409),
    };
  }
  return { ok: true, body, db: contexto.db, post: contexto.post };
}

function buscarAnexoPorCaminho(db: PrivilegedDatabase, postId: number, path: string) {
  return db
    .from("post_anexos")
    .select("id, file, mime, bytes, status")
    .eq("post_id", postId)
    .eq("file", path)
    .maybeSingle();
}

async function prepararOperacaoAnexo(req: NextRequest, params: Ctx["params"]) {
  const preparada = await prepararRequisicaoAnexo(req, params);
  if (!preparada.ok) return preparada;
  const path = String(preparada.body.path ?? "");
  const consulta = await buscarAnexoPorCaminho(preparada.db, preparada.post.id, path);
  return { ...preparada, path, consulta };
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const preparada = await prepararRequisicaoAnexo(req, params);
  if (!preparada.ok) return preparada.resposta;
  const { body, db, post } = preparada;
  if (!post.user_id) {
    return respostaJson({ ok: false, erro: "Essa publicação antiga não aceita anexos." }, 409);
  }

  const nomeOriginal = nomeOriginalSeguro(body.nome);
  const validacao = validarNovoAnexoComunidade(body.mime, body.bytes, nomeOriginal);
  if ("erro" in validacao) return respostaJson({ ok: false, erro: validacao.erro }, 415);

  const { data: existentes, error: existentesError } = await db
    .from("post_anexos")
    .select("bytes")
    .eq("post_id", post.id);
  if (existentesError) {
    console.error("Falha ao contar anexos da comunidade:", existentesError.code);
    return respostaJson({ ok: false, erro: "Não consegui preparar o arquivo." }, 500);
  }
  if ((existentes?.length ?? 0) >= MAX_ANEXOS_COMUNIDADE) {
    return respostaJson({ ok: false, erro: "Cada publicação aceita até 10 anexos." }, 400);
  }
  const total = (existentes ?? []).reduce((soma, item) => soma + Number(item.bytes), 0);
  if (total + validacao.bytes > MAX_BYTES_COMUNIDADE) {
    return respostaJson({ ok: false, erro: "Os anexos podem somar até 200 MB." }, 400);
  }

  const anexoId = randomUUID();
  const path = caminhoAnexoComunidade(post.user_id, post.id, anexoId, validacao.regra.extensao);
  const { error: registroError } = await db.from("post_anexos").insert({
    id: anexoId,
    post_id: post.id,
    user_id: post.user_id,
    file: path,
    nome_original: nomeOriginal,
    tipo: validacao.regra.tipo,
    mime: validacao.mime,
    bytes: validacao.bytes,
    status: "pendente",
  });
  if (registroError) {
    console.error("Falha ao registrar anexo pendente da comunidade:", registroError.code);
    const status = registroError.code === "23514" ? 400 : 500;
    return respostaJson({ ok: false, erro: "Não consegui preparar o arquivo." }, status);
  }

  const { data: upload, error: uploadError } = await db.storage
    .from(BUCKET_COMUNIDADE)
    .createSignedUploadUrl(path, { upsert: false });
  if (uploadError || !upload) {
    console.error("Falha ao assinar upload da comunidade:", uploadError?.message);
    await descartarAnexoComunidade(db, post.id, path, true);
    return respostaJson({ ok: false, erro: "Não consegui preparar o upload." }, 500);
  }

  return respostaJson({
    ok: true,
    path,
    url: upload.signedUrl,
    token: upload.token,
    tipo: validacao.regra.tipo,
    mime: validacao.mime,
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const operacao = await prepararOperacaoAnexo(req, params);
  if (!operacao.ok) return operacao.resposta;
  const { db, post, consulta } = operacao;
  const { data: anexo, error } = consulta;
  if (error) {
    console.error("Falha ao buscar anexo pendente da comunidade:", error.code);
    return respostaJson({ ok: false, erro: "Não consegui confirmar o arquivo." }, 500);
  }
  if (!anexo) return respostaJson({ ok: false, erro: "Anexo não encontrado." }, 404);
  if (anexo.status === "pronto") return respostaJson({ ok: true });

  // O cliente também envia mime/bytes para transparência, mas a confirmação
  // confia nos valores imutáveis registrados antes da assinatura do upload.
  const resultado = await validarObjetoComunidade(db, anexo.file, anexo.mime, anexo.bytes);
  if (!resultado.valido) {
    if (!resultado.erroTecnico) {
      await descartarAnexoComunidade(db, post.id, anexo.file, true);
    }
    const status = resultado.erroTecnico ? 503 : 415;
    const erro = resultado.erroTecnico
      ? "Não consegui conferir o arquivo agora. Tente novamente."
      : "O conteúdo do arquivo não corresponde ao formato informado.";
    return respostaJson({ ok: false, erro }, status);
  }

  const { data: confirmado, error: confirmarError } = await db
    .from("post_anexos")
    .update({ status: "pronto", pronto_em: new Date().toISOString() })
    .eq("id", anexo.id)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();
  if (confirmarError || !confirmado) {
    console.error("Falha ao confirmar anexo da comunidade:", confirmarError?.code);
    return respostaJson({ ok: false, erro: "Não consegui confirmar o arquivo." }, 500);
  }
  return respostaJson({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const operacao = await prepararOperacaoAnexo(req, params);
  if (!operacao.ok) return operacao.resposta;
  const { db, post, consulta } = operacao;
  const { data: anexo, error } = consulta;
  if (error) {
    console.error("Falha ao buscar anexo para remoção:", error.code);
    return respostaJson({ ok: false, erro: "Não consegui remover o anexo." }, 500);
  }
  if (!anexo) return respostaJson({ ok: false, erro: "Anexo não encontrado." }, 404);

  const descarte = await descartarAnexoComunidade(db, post.id, anexo.file);
  if (descarte === "erro") {
    return respostaJson({ ok: false, erro: "Não consegui remover o anexo." }, 500);
  }
  if (descarte === "ausente") {
    return respostaJson({ ok: false, erro: "Anexo não encontrado." }, 404);
  }
  return respostaJson({ ok: true });
}
