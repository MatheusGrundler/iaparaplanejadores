import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { corpoJson, obterIdentidadeEditavel, respostaJson } from "@/app/api/curso/http";
import { assinaturaAnexoValida, jsonAnexoValido } from "@/lib/curso-anexos";
import {
  extensaoDoAnexo,
  LIMITE_ANEXO_BYTES,
  MIME_ANEXO_JSON,
  MIMES_ANEXO_IMAGEM,
  type Atividade,
} from "@/lib/curso-atividades";
import { resolverQuestDoUsuario } from "@/lib/formularios/server";
import { nomeSeguro } from "@/lib/duvida";
import { privilegedDatabase, type PrivilegedDatabase } from "@/lib/supabase/admin";

const BUCKET = "quest-anexos";
const JANELA_SEGURA_UPLOAD_MS = 3 * 60 * 60 * 1000;
const MAX_PENDENTES_RECENTES = 12;

type Ctx = { params: Promise<{ atividade: string }> };
type Admin = PrivilegedDatabase;
type RespostaQuest = {
  id: string;
  status: string;
  formulario_versao_id: string | null;
};

async function obterOuCriarResposta(
  admin: Admin,
  userId: string,
  email: string,
  atividade: Atividade,
  versaoId: string | null,
): Promise<RespostaQuest | null> {
  const existenteQuery = admin
    .from("quest_respostas")
    .select("id, status, formulario_versao_id")
    .eq("user_id", userId)
    .eq("quest_key", atividade.key);
  const { data: existente, error: selectError } = await existenteQuery.maybeSingle();
  if (selectError) {
    console.error("Falha ao consultar resposta para anexo:", selectError.code);
    return null;
  }
  if (existente) return existente as RespostaQuest;

  const { data: nova, error } = await admin
    .from("quest_respostas")
    .insert({
      user_id: userId,
      email,
      semana_key: atividade.semanaKey,
      quest_key: atividade.key,
      respostas: {},
      schema_version: 1,
      status: "rascunho",
      formulario_versao_id: versaoId,
    })
    .select("id, status, formulario_versao_id")
    .maybeSingle();
  if (nova) return nova as RespostaQuest;
  if (error?.code !== "23505") {
    console.error("Falha ao preparar resposta para anexo:", error?.code);
    return null;
  }

  const concorrenteQuery = admin
    .from("quest_respostas")
    .select("id, status, formulario_versao_id")
    .eq("user_id", userId)
    .eq("quest_key", atividade.key);
  const { data: concorrente } = await concorrenteQuery.maybeSingle();
  return (concorrente as RespostaQuest | null) ?? null;
}

async function respostaDoAnexo(
  admin: Admin,
  respostaId: string,
  userId: string,
  questKey: string,
): Promise<RespostaQuest | null> {
  const { data, error } = await admin
    .from("quest_respostas")
    .select("id, status, formulario_versao_id")
    .eq("id", respostaId)
    .eq("user_id", userId)
    .eq("quest_key", questKey)
    .maybeSingle();
  if (error) console.error("Falha ao conferir estado da Quest:", error.code);
  return (data as RespostaQuest | null) ?? null;
}

async function conferirRespostaEditavel(
  admin: Admin,
  respostaId: string,
  userId: string,
  questKey: string,
  versaoId: string | null,
) {
  const resposta = await respostaDoAnexo(admin, respostaId, userId, questKey);
  if (!resposta) {
    return { erro: respostaJson({ ok: false, erro: "Quest não encontrada." }, 404) } as const;
  }
  if (resposta.status === "revisada") {
    return { erro: respostaJson({ ok: false, erro: "Esta Quest já foi revisada." }, 409) } as const;
  }
  if (resposta.formulario_versao_id && resposta.formulario_versao_id !== versaoId) {
    return {
      erro: respostaJson(
        { ok: false, erro: "A Quest pertence a outra versão do formulário." },
        409,
      ),
    } as const;
  }
  return { resposta } as const;
}

async function removerObjeto(admin: Admin, file: string) {
  const { error } = await admin.storage.from(BUCKET).remove([file]);
  if (error) console.error("Falha ao remover objeto da Quest:", error.message);
  return !error;
}

async function limparExpirados(admin: Admin, userId: string, questKey: string, respostaId: string) {
  const limite = new Date(Date.now() - JANELA_SEGURA_UPLOAD_MS).toISOString();
  const { data, error } = await admin
    .from("quest_anexos")
    .select("id, file, status, criado_em")
    .eq("user_id", userId)
    .eq("quest_key", questKey)
    .eq("resposta_id", respostaId)
    .in("status", ["pendente", "removido"])
    .lt("criado_em", limite)
    .limit(30);
  if (error) {
    console.error("Falha ao procurar uploads expirados:", error.code);
    return;
  }

  for (const anexo of data ?? []) {
    if (!(await removerObjeto(admin, anexo.file))) continue;
    const { error: deleteError } = await admin
      .from("quest_anexos")
      .delete()
      .eq("id", anexo.id)
      .eq("user_id", userId)
      .eq("quest_key", questKey)
      .eq("resposta_id", respostaId)
      .eq("status", anexo.status)
      .lt("criado_em", limite);
    if (deleteError) {
      console.error("Falha ao limpar metadado expirado:", deleteError.code);
    }
  }
}

async function validarConteudo(
  admin: Admin,
  file: string,
  mime: string,
  bytesEsperados: number,
): Promise<{ valido: boolean; erroTecnico: boolean }> {
  const { data: blob, error } = await admin.storage.from(BUCKET).download(file);
  if (error || !blob) {
    console.error("Falha ao inspecionar bytes do anexo:", error?.message);
    return { valido: false, erroTecnico: true };
  }
  if (blob.size !== bytesEsperados) return { valido: false, erroTecnico: false };

  if (mime === MIME_ANEXO_JSON) {
    return { valido: jsonAnexoValido(await blob.text()), erroTecnico: false };
  }

  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return { valido: assinaturaAnexoValida(mime, head), erroTecnico: false };
}

async function descartarSemApagarRegistro(admin: Admin, anexoId: string, file: string) {
  if (!(await removerObjeto(admin, file))) return false;
  const { error } = await admin
    .from("quest_anexos")
    .update({ status: "removido", removido_em: new Date().toISOString() })
    .eq("id", anexoId)
    .in("status", ["pendente", "pronto"]);
  if (error) console.error("Falha ao marcar anexo como removido:", error.code);
  return !error;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { atividade: atividadeKey } = await params;
  const [acesso, body] = await Promise.all([
    obterIdentidadeEditavel("A prévia administrativa é somente leitura."),
    corpoJson(req),
  ]);
  if (acesso.resposta) return acesso.resposta;
  const { identity } = acesso;
  const resolvida = await resolverQuestDoUsuario(identity, atividadeKey);
  if (!resolvida) {
    return respostaJson({ ok: false, erro: "Atividade indisponível nesta Etapa." }, 403);
  }
  const { atividade, versaoId } = resolvida;
  if (!body) return respostaJson({ ok: false, erro: "Dados inválidos." }, 400);

  const campoKey = String(body.campo ?? "");
  const campo = atividade.anexos.find((item) => item.key === campoKey);
  if (!campo) return respostaJson({ ok: false, erro: "Campo de anexo inválido." }, 400);

  const mime = String(body.mime ?? "").toLowerCase();
  const bytes = Math.trunc(Number(body.bytes ?? 0));
  const mimeValido =
    MIMES_ANEXO_IMAGEM.includes(mime as (typeof MIMES_ANEXO_IMAGEM)[number]) ||
    (campo.aceitaJson && mime === MIME_ANEXO_JSON);
  const extensao = extensaoDoAnexo(mime);
  if (!mimeValido || !extensao) {
    return respostaJson({ ok: false, erro: "Formato de arquivo não aceito." }, 415);
  }
  if (bytes < 1 || bytes > LIMITE_ANEXO_BYTES) {
    return respostaJson({ ok: false, erro: "O arquivo precisa ter até 10 MB." }, 400);
  }

  const admin = privilegedDatabase();
  const resposta = await obterOuCriarResposta(
    admin,
    identity.userId,
    identity.email,
    atividade,
    versaoId,
  );
  if (!resposta) {
    return respostaJson({ ok: false, erro: "Não consegui preparar o envio." }, 500);
  }
  if (resposta.status === "revisada") {
    return respostaJson({ ok: false, erro: "Esta Quest já foi revisada." }, 409);
  }
  if (resposta.formulario_versao_id && resposta.formulario_versao_id !== versaoId) {
    return respostaJson({ ok: false, erro: "A Quest pertence a outra versão do formulário." }, 409);
  }

  await limparExpirados(admin, identity.userId, atividade.key, resposta.id);
  const cutoff = new Date(Date.now() - JANELA_SEGURA_UPLOAD_MS).toISOString();
  const [prontosResult, pendentesResult] = await Promise.all([
    admin
      .from("quest_anexos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", identity.userId)
      .eq("quest_key", atividade.key)
      .eq("resposta_id", resposta.id)
      .eq("campo", campo.key)
      .eq("status", "pronto"),
    admin
      .from("quest_anexos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", identity.userId)
      .eq("quest_key", atividade.key)
      .eq("resposta_id", resposta.id)
      .eq("status", "pendente")
      .gte("criado_em", cutoff),
  ]);
  if (prontosResult.error || pendentesResult.error) {
    console.error(
      "Falha ao contar anexos:",
      prontosResult.error?.code ?? pendentesResult.error?.code,
    );
    return respostaJson({ ok: false, erro: "Não consegui preparar o envio." }, 500);
  }
  if ((prontosResult.count ?? 0) >= campo.maxArquivos) {
    return respostaJson(
      {
        ok: false,
        erro: `Esse campo aceita até ${campo.maxArquivos} arquivo(s).`,
      },
      400,
    );
  }
  if ((pendentesResult.count ?? 0) >= MAX_PENDENTES_RECENTES) {
    return respostaJson(
      {
        ok: false,
        erro: "Há muitos envios incompletos. Aguarde e tente novamente.",
      },
      429,
    );
  }

  const anexoId = randomUUID();
  const file = `${identity.userId}/${resposta.id}/${anexoId}.${extensao}`;
  const nomeOriginal = nomeSeguro(String(body.nome ?? `arquivo.${extensao}`));
  const { error: registroError } = await admin.from("quest_anexos").insert({
    id: anexoId,
    resposta_id: resposta.id,
    user_id: identity.userId,
    semana_key: atividade.semanaKey,
    quest_key: atividade.key,
    campo: campo.key,
    file,
    nome_original: nomeOriginal,
    mime_declarado: mime,
    bytes_declarados: bytes,
    status: "pendente",
  });
  if (registroError) {
    console.error("Falha ao registrar anexo pendente:", registroError.code);
    return respostaJson({ ok: false, erro: "Não consegui preparar o envio." }, 500);
  }

  const { data: upload, error: uploadError } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(file);
  if (uploadError || !upload) {
    console.error("Falha ao assinar upload da Quest:", uploadError?.message);
    return respostaJson({ ok: false, erro: "Não consegui preparar o upload." }, 500);
  }

  return respostaJson({ ok: true, anexoId, uploadUrl: upload.signedUrl });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { atividade: atividadeKey } = await params;
  const [acesso, body] = await Promise.all([
    obterIdentidadeEditavel("A prévia administrativa é somente leitura."),
    corpoJson(req),
  ]);
  if (acesso.resposta) return acesso.resposta;
  const { identity } = acesso;
  const resolvida = await resolverQuestDoUsuario(identity, atividadeKey);
  if (!resolvida) {
    return respostaJson({ ok: false, erro: "Atividade indisponível nesta Etapa." }, 403);
  }
  const { atividade, versaoId } = resolvida;
  const anexoId = String(body?.anexoId ?? "");
  if (!anexoId) return respostaJson({ ok: false, erro: "Anexo inválido." }, 400);

  const admin = privilegedDatabase();
  const { data: anexo } = await admin
    .from("quest_anexos")
    .select(
      "id, resposta_id, file, campo, nome_original, mime_declarado, bytes_declarados, mime, bytes, status",
    )
    .eq("id", anexoId)
    .eq("user_id", identity.userId)
    .eq("quest_key", atividade.key)
    .maybeSingle();
  if (!anexo) return respostaJson({ ok: false, erro: "Anexo não encontrado." }, 404);
  const estado = await conferirRespostaEditavel(
    admin,
    anexo.resposta_id,
    identity.userId,
    atividade.key,
    versaoId,
  );
  if ("erro" in estado) return estado.erro;
  const { resposta } = estado;
  if (anexo.status === "removido") {
    return respostaJson({ ok: false, erro: "Esse envio já foi descartado." }, 409);
  }
  if (anexo.status === "pronto") {
    const { data: assinado } = await admin.storage.from(BUCKET).createSignedUrl(anexo.file, 900);
    return respostaJson({
      ok: true,
      anexo: {
        id: anexo.id,
        campo: anexo.campo,
        nome: anexo.nome_original,
        mime: anexo.mime,
        bytes: anexo.bytes,
        url: assinado?.signedUrl ?? null,
      },
    });
  }

  const { data: info, error: infoError } = await admin.storage.from(BUCKET).info(anexo.file);
  const metadataLegado = info?.metadata as Record<string, unknown> | null | undefined;
  const mimeReal = String(info?.contentType ?? metadataLegado?.mimetype ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const bytesReal = Math.trunc(Number(info?.size ?? metadataLegado?.size ?? 0));
  const campo = atividade.anexos.find((item) => item.key === anexo.campo);
  const mimeRealValido = Boolean(
    campo &&
    (MIMES_ANEXO_IMAGEM.includes(mimeReal as (typeof MIMES_ANEXO_IMAGEM)[number]) ||
      (campo.aceitaJson && mimeReal === MIME_ANEXO_JSON)),
  );
  const metadataBate =
    !infoError &&
    mimeRealValido &&
    bytesReal > 0 &&
    bytesReal <= LIMITE_ANEXO_BYTES &&
    mimeReal === anexo.mime_declarado &&
    bytesReal === anexo.bytes_declarados;

  let conteudoValido = false;
  if (metadataBate) {
    const inspecao = await validarConteudo(admin, anexo.file, mimeReal, bytesReal);
    if (inspecao.erroTecnico) {
      return respostaJson({ ok: false, erro: "Não consegui inspecionar o arquivo agora." }, 503);
    }
    conteudoValido = inspecao.valido;
  }

  if (!metadataBate || !conteudoValido) {
    if (!(await descartarSemApagarRegistro(admin, anexo.id, anexo.file))) {
      return respostaJson({ ok: false, erro: "Não consegui descartar o arquivo inválido." }, 500);
    }
    return respostaJson({ ok: false, erro: "O arquivo recebido não passou pela validação." }, 400);
  }

  const atualizarAnexoQuery = admin
    .from("quest_anexos")
    .update({
      status: "pronto",
      mime: mimeReal,
      bytes: bytesReal,
      pronto_em: new Date().toISOString(),
    })
    .eq("id", anexo.id)
    .eq("resposta_id", resposta.id)
    .eq("user_id", identity.userId)
    .eq("quest_key", atividade.key)
    .eq("status", "pendente");
  const { data: atualizado, error: updateError } = await atualizarAnexoQuery
    .select("id")
    .maybeSingle();
  if (updateError || !atualizado) {
    console.error("Falha ao confirmar anexo:", updateError?.code);
    return respostaJson(
      {
        ok: false,
        erro: "A Quest mudou ou esse campo atingiu o limite de arquivos.",
      },
      409,
    );
  }

  const { data: assinado } = await admin.storage.from(BUCKET).createSignedUrl(anexo.file, 900);
  return respostaJson({
    ok: true,
    anexo: {
      id: anexo.id,
      campo: anexo.campo,
      nome: anexo.nome_original,
      mime: mimeReal,
      bytes: bytesReal,
      url: assinado?.signedUrl ?? null,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { atividade: atividadeKey } = await params;
  const [acesso, body] = await Promise.all([
    obterIdentidadeEditavel("A prévia administrativa é somente leitura."),
    corpoJson(req),
  ]);
  if (acesso.resposta) return acesso.resposta;
  const { identity } = acesso;
  const resolvida = await resolverQuestDoUsuario(identity, atividadeKey);
  if (!resolvida) {
    return respostaJson({ ok: false, erro: "Atividade indisponível nesta Etapa." }, 403);
  }
  const { atividade, versaoId } = resolvida;
  const anexoId = String(body?.anexoId ?? "");
  if (!anexoId) return respostaJson({ ok: false, erro: "Anexo inválido." }, 400);

  const admin = privilegedDatabase();
  const { data: anexo } = await admin
    .from("quest_anexos")
    .select("id, resposta_id, file, status")
    .eq("id", anexoId)
    .eq("user_id", identity.userId)
    .eq("quest_key", atividade.key)
    .maybeSingle();
  if (!anexo) return respostaJson({ ok: false, erro: "Anexo não encontrado." }, 404);
  const estado = await conferirRespostaEditavel(
    admin,
    anexo.resposta_id,
    identity.userId,
    atividade.key,
    versaoId,
  );
  if ("erro" in estado) return estado.erro;
  if (anexo.status === "removido") return respostaJson({ ok: true });

  if (!(await descartarSemApagarRegistro(admin, anexo.id, anexo.file))) {
    return respostaJson({ ok: false, erro: "Não consegui remover o arquivo." }, 500);
  }
  return respostaJson({ ok: true });
}
