import "server-only";

import type { MemberIdentity } from "@/lib/auth";
import { getMemberIdentity } from "@/lib/auth";
import type { PrivilegedDatabase } from "@/lib/supabase/admin";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { BUCKET_COMUNIDADE } from "@/lib/comunidade-anexos";

export type PublicacaoEditavel = {
  id: number;
  user_id: string | null;
  email: string;
  texto: string;
  conteudo_html: string | null;
  publicado: boolean;
};

type ContextoPublicacao = {
  identity: MemberIdentity;
  db: PrivilegedDatabase;
  post: PublicacaoEditavel;
};

export type FalhaContextoPublicacao = { status: number; erro: string };

export function idPublicacaoValido(valor: unknown): number | null {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function contextoPublicacaoEditavel(
  valorId: unknown,
): Promise<ContextoPublicacao | FalhaContextoPublicacao> {
  const id = idPublicacaoValido(valorId);
  if (!id) return { status: 400, erro: "Publicação inválida." };

  const identity = await getMemberIdentity();
  if (!identity) return { status: 403, erro: "Sem acesso." };

  const db = privilegedDatabase();
  const { data, error } = await db
    .from("posts")
    .select("id, user_id, email, texto, conteudo_html, publicado")
    .eq("id", id)
    .eq("deletado", false)
    .maybeSingle();
  if (error) {
    console.error("Falha ao buscar publicação da comunidade:", error.code);
    return { status: 500, erro: "Não consegui abrir essa publicação." };
  }
  if (!data) return { status: 404, erro: "Publicação não encontrada." };

  const post = data as PublicacaoEditavel;
  const pertenceAoAtor = post.user_id
    ? post.user_id === identity.userId
    : post.email === identity.email;
  if (!identity.admin && !pertenceAoAtor) return { status: 403, erro: "Sem acesso." };

  return { identity, db, post };
}

export function contextoFalhou(
  contexto: ContextoPublicacao | FalhaContextoPublicacao,
): contexto is FalhaContextoPublicacao {
  return "status" in contexto;
}

export function caminhosRetornados(data: Array<{ file: string | null }> | null) {
  return [
    ...new Set((data ?? []).map((item) => item.file).filter((file): file is string => !!file)),
  ];
}

export async function removerObjetosEnfileiradosComunidade(
  db: PrivilegedDatabase,
  caminhos: string[],
) {
  if (caminhos.length === 0) return;
  const { error } = await db.storage.from(BUCKET_COMUNIDADE).remove(caminhos);
  if (error) {
    // O metadado e a fila foram gravados na mesma transação. Uma oscilação
    // deixa o objeto privado invisível, mas preserva o caminho para retry.
    console.error("Falha ao limpar objetos privados da comunidade:", error.message);
    return;
  }

  const { error: concluirError } = await db.rpc("concluir_exclusoes_storage_comunidade", {
    p_files: caminhos,
  });
  if (concluirError) {
    // A remoção do Storage é idempotente: manter a fila é seguro e a próxima
    // rodada apenas repetirá uma exclusão que já aconteceu.
    console.error("Falha ao concluir fila de exclusões da comunidade:", concluirError.code);
  }
}

export async function processarExclusoesPendentesComunidade(db: PrivilegedDatabase) {
  const { data, error } = await db.rpc("reservar_exclusoes_storage_comunidade", {
    p_limite: 100,
  });
  if (error) {
    console.error("Falha ao reservar exclusões da comunidade:", error.code);
    return;
  }
  await removerObjetosEnfileiradosComunidade(db, caminhosRetornados(data));
}

export type ResultadoDescarteAnexo = "removido" | "ausente" | "erro";

export async function descartarAnexoComunidade(
  db: PrivilegedDatabase,
  postId: number,
  file: string,
  apenasPendente = false,
): Promise<ResultadoDescarteAnexo> {
  const { data, error } = await db.rpc("descartar_anexo_comunidade", {
    p_post_id: postId,
    p_file: file,
    p_apenas_pendente: apenasPendente,
  });
  if (error) {
    console.error("Falha ao descartar anexo da comunidade:", error.code);
    return "erro";
  }
  const caminhos = caminhosRetornados(data);
  if (caminhos.length === 0) return "ausente";
  await removerObjetosEnfileiradosComunidade(db, caminhos);
  return "removido";
}

export async function descartarRascunhoComunidade(db: PrivilegedDatabase, postId: number) {
  const { data, error } = await db.rpc("descartar_rascunho_comunidade", {
    p_post_id: postId,
  });
  if (error) {
    console.error("Falha ao descartar rascunho da comunidade:", error.code);
    return false;
  }
  await removerObjetosEnfileiradosComunidade(db, caminhosRetornados(data));
  return true;
}

export async function limparRascunhosExpiradosComunidade(db: PrivilegedDatabase) {
  await processarExclusoesPendentesComunidade(db);
  const { data, error } = await db.rpc("limpar_rascunhos_comunidade_expirados", {
    p_limite: 20,
  });
  if (error) {
    console.error("Falha ao limpar rascunhos expirados da comunidade:", error.code);
    return;
  }
  await removerObjetosEnfileiradosComunidade(db, caminhosRetornados(data));
}
