"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMemberIdentity } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import type { DefinicaoFormulario } from "@/lib/formularios";
import { validarDefinicaoFormulario } from "@/lib/formularios/validacao";
import { privilegedDatabase } from "@/lib/supabase/admin";

function falhou(error: { code?: string; message?: string } | null, operacao: string) {
  if (!error) return;
  console.error(`${operacao}:`, error.code ?? "erro-sem-codigo");
  throw new Error(`${operacao} falhou.`);
}

async function exigirAdmin() {
  const identity = await getMemberIdentity();
  if (!identity?.admin) throw new Error("Sem permissão.");
  return identity;
}

function etapaValida(valor: string): valor is SemanaKey {
  return (SEMANA_KEYS as readonly string[]).includes(valor);
}

function definicaoDoFormulario(formData: FormData) {
  const bruto = String(formData.get("definicao") ?? "");
  if (!bruto || bruto.length > 524_288) throw new Error("Definição inválida.");
  let valor: unknown;
  try {
    valor = JSON.parse(bruto);
  } catch {
    throw new Error("Definição inválida.");
  }
  const resultado = validarDefinicaoFormulario(valor);
  if (!resultado.valido) {
    throw new Error(resultado.problemas[0]?.mensagem ?? "Revise o formulário.");
  }
  if (resultado.definicao.publicacao === "arquivado") {
    throw new Error("Salve como rascunho ou publique esta versão.");
  }
  return resultado.definicao;
}

export async function salvarFormulario(formData: FormData) {
  const identity = await exigirAdmin();
  const etapaKey = String(formData.get("etapa_key") ?? "");
  if (!etapaValida(etapaKey)) throw new Error("Etapa inválida.");

  const definicaoOriginal = definicaoDoFormulario(formData);
  const definicao: DefinicaoFormulario = {
    ...definicaoOriginal,
    metadados: {
      ...definicaoOriginal.metadados,
      semanaKey: etapaKey,
    },
  };
  const db = privilegedDatabase();
  const { data: existente, error: consultaError } = await db
    .from("curso_formularios")
    .select("id, codigo, tipo, etapa_key")
    .eq("codigo", definicao.codigo)
    .maybeSingle();
  falhou(consultaError, "Consulta do formulário");

  let formularioId = existente?.id as string | undefined;
  if (existente) {
    if (existente.tipo !== definicao.workflow.tipo || existente.etapa_key !== etapaKey) {
      throw new Error("O tipo e a etapa de um formulário existente não podem mudar.");
    }
    const { error } = await db
      .from("curso_formularios")
      .update({
        titulo: definicao.titulo,
        descricao: definicao.descricao,
        atualizado_por: identity.userId,
        arquivado: false,
      })
      .eq("id", formularioId);
    falhou(error, "Atualização do formulário");
  } else {
    const { data, error } = await db
      .from("curso_formularios")
      .insert({
        codigo: definicao.codigo,
        tipo: definicao.workflow.tipo,
        etapa_key: etapaKey,
        titulo: definicao.titulo,
        descricao: definicao.descricao,
        criado_por: identity.userId,
        atualizado_por: identity.userId,
      })
      .select("id")
      .single();
    falhou(error, "Criação do formulário");
    formularioId = data?.id;
  }
  if (!formularioId) throw new Error("Não consegui identificar o formulário.");

  const publicar = definicao.publicacao === "publicado";
  const definicaoPersistida: DefinicaoFormulario = publicar
    ? { ...definicao, publicacao: "rascunho" }
    : definicao;

  const { data: versaoExistente, error: versaoConsultaError } = await db
    .from("curso_formulario_versoes")
    .select("id, status")
    .eq("formulario_id", formularioId)
    .eq("numero", definicao.versao)
    .maybeSingle();
  falhou(versaoConsultaError, "Consulta da versão");

  let versaoId: string | null = versaoExistente?.id ?? null;
  if (versaoExistente) {
    if (versaoExistente.status !== "rascunho") {
      throw new Error("Essa versão já foi publicada. Crie uma nova versão para alterar.");
    }
    const { error } = await db
      .from("curso_formulario_versoes")
      .update({
        status: "rascunho",
        definicao: definicaoPersistida,
        atualizado_por: identity.userId,
        publicado_por: null,
        publicado_em: null,
      })
      .eq("id", versaoExistente.id)
      .eq("status", "rascunho");
    falhou(error, "Atualização da versão");
  } else {
    const { data, error } = await db
      .from("curso_formulario_versoes")
      .insert({
        formulario_id: formularioId,
        numero: definicao.versao,
        status: "rascunho",
        definicao: definicaoPersistida,
        criado_por: identity.userId,
        atualizado_por: identity.userId,
      })
      .select("id")
      .single();
    falhou(error, "Criação da versão");
    versaoId = data?.id ?? null;
  }

  if (publicar) {
    if (!versaoId) throw new Error("Não consegui identificar a versão para publicar.");
    const { error } = await db.rpc("publicar_curso_formulario_versao", {
      target_versao: versaoId,
      actor: identity.userId,
    });
    falhou(error, "Publicação da versão");
  }

  revalidatePath("/admin/formularios");
  revalidatePath("/etapa/[slug]", "page");
  redirect(`/admin/formularios?codigo=${encodeURIComponent(definicao.codigo)}&salvo=1`);
}
