"use server";

import { revalidatePath } from "next/cache";
import { getUserEmail, isAdmin, logEvento } from "@/lib/auth";
import { normalizeEmail } from "@/lib/access";
import { aplicarLiberacaoIndividual } from "@/lib/admin-liberacao-etapa";
import { SEMANA_KEYS } from "@/lib/curso-atividades";
import { versaoConteudoValida } from "@/app/componentes/curso/conteudos";
import { removerMaterialComSeguranca, validarArquivoParaLeitura } from "@/lib/materiais-admin";
import { privilegedDatabase } from "@/lib/supabase/admin";

const MATERIAL_MAX_BYTES = 50 * 1024 * 1024;
const MATERIAL_EXTENSIONS = new Set([
  "csv",
  "docx",
  "html",
  "jpeg",
  "jpg",
  "json",
  "md",
  "pdf",
  "png",
  "pptx",
  "txt",
  "webp",
  "xlsx",
  "zip",
]);

type OperationError = { code?: string; message?: string } | null;

function assertOk(error: OperationError, operation: string) {
  if (!error) return;
  console.error(`${operation}:`, error.code ?? "erro-sem-codigo");
  throw new Error(`${operation} falhou.`);
}

function positiveInteger(value: FormDataEntryValue | null): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function validEmail(value: FormDataEntryValue | null): string | null {
  const email = normalizeEmail(String(value ?? ""));
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

function textField(value: FormDataEntryValue | null, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error("Texto maior que o permitido.");
  return text;
}

async function requireAdmin(): Promise<string> {
  const email = await getUserEmail();
  if (!email || !(await isAdmin(email))) {
    throw new Error("Sem permissão.");
  }
  return email;
}

/** date yyyy-mm-dd (fim do dia em Brasília) -> timestamptz ISO, ou null */
function aoFimDoDia(date: FormDataEntryValue | null): string | null {
  const s = String(date ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Data inválida.");
  const value = new Date(`${s}T23:59:59-03:00`);
  if (Number.isNaN(value.getTime())) throw new Error("Data inválida.");
  return value.toISOString();
}

/* ---------- alunos ---------- */

export async function liberarAluno(formData: FormData) {
  await requireAdmin();
  const email = validEmail(formData.get("email"));
  if (!email) throw new Error("E-mail inválido.");
  const turmaValue = String(formData.get("turma_id") ?? "").trim();
  const turmaId = turmaValue ? positiveInteger(formData.get("turma_id")) : null;
  if (turmaValue && !turmaId) throw new Error("Turma inválida.");
  const { error } = await privilegedDatabase()
    .from("whitelist")
    .upsert({
      email,
      nome: textField(formData.get("nome"), 160),
      turma_id: turmaId,
      expira_em: aoFimDoDia(formData.get("expira_em")),
    });
  assertOk(error, "Liberação do aluno");
  revalidatePath("/admin/alunos");
}

export async function removerAluno(formData: FormData) {
  await requireAdmin();
  const email = validEmail(formData.get("email"));
  if (!email) throw new Error("E-mail inválido.");
  const { error } = await privilegedDatabase().from("whitelist").delete().eq("email", email);
  assertOk(error, "Remoção do aluno");
  revalidatePath("/admin/alunos");
}

/** renova/edita o prazo individual; vazio = volta a herdar da turma */
export async function renovarAluno(formData: FormData) {
  await requireAdmin();
  const email = validEmail(formData.get("email"));
  if (!email) throw new Error("E-mail inválido.");
  const { error } = await privilegedDatabase()
    .from("whitelist")
    .update({ expira_em: aoFimDoDia(formData.get("expira_em")) })
    .eq("email", email);
  assertOk(error, "Renovação do aluno");
  revalidatePath("/admin/alunos");
}

export async function trocarTurma(formData: FormData) {
  await requireAdmin();
  const email = validEmail(formData.get("email"));
  if (!email) throw new Error("E-mail inválido.");
  const turmaValue = String(formData.get("turma_id") ?? "").trim();
  const turmaId = turmaValue ? positiveInteger(formData.get("turma_id")) : null;
  if (turmaValue && !turmaId) throw new Error("Turma inválida.");
  const { error } = await privilegedDatabase()
    .from("whitelist")
    .update({ turma_id: turmaId })
    .eq("email", email);
  assertOk(error, "Troca de turma");
  revalidatePath("/admin/alunos");
}

/* ---------- turmas ---------- */

export async function criarTurma(formData: FormData) {
  await requireAdmin();
  const nome = textField(formData.get("nome"), 160);
  if (!nome) throw new Error("Nome da turma é obrigatório.");
  const { error } = await privilegedDatabase()
    .from("turmas")
    .insert({
      nome,
      inicio: String(formData.get("inicio") ?? "") || null,
      fim: String(formData.get("fim") ?? "") || null,
      acesso_ate: aoFimDoDia(formData.get("acesso_ate")),
    });
  assertOk(error, "Criação da turma");
  revalidatePath("/admin/turmas");
}

export async function editarTurma(formData: FormData) {
  await requireAdmin();
  const id = positiveInteger(formData.get("id"));
  const nome = textField(formData.get("nome"), 160);
  if (!id || !nome) throw new Error("Dados da turma inválidos.");
  const { error } = await privilegedDatabase()
    .from("turmas")
    .update({
      nome,
      inicio: String(formData.get("inicio") ?? "") || null,
      fim: String(formData.get("fim") ?? "") || null,
      acesso_ate: aoFimDoDia(formData.get("acesso_ate")),
    })
    .eq("id", id);
  assertOk(error, "Edição da turma");
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/alunos");
}

/* ---------- liberação das etapas ---------- */

export async function definirLiberacaoSemana(formData: FormData) {
  const adminEmail = await requireAdmin();
  const turmaId = positiveInteger(formData.get("turma_id"));
  const semanaKey = String(formData.get("semana_key") ?? "");
  const novoEstado = String(formData.get("liberada") ?? "");

  if (!turmaId) throw new Error("Turma inválida.");
  if (!(SEMANA_KEYS as readonly string[]).includes(semanaKey)) {
    throw new Error("Etapa inválida.");
  }
  if (novoEstado !== "true" && novoEstado !== "false") {
    throw new Error("Estado de liberação inválido.");
  }

  const liberada = novoEstado === "true";
  const agora = new Date().toISOString();
  const { error } = await privilegedDatabase()
    .from("turma_semanas")
    .upsert(
      {
        turma_id: turmaId,
        semana_key: semanaKey,
        liberada,
        liberada_em: liberada ? agora : null,
        atualizada_em: agora,
      },
      { onConflict: "turma_id,semana_key" },
    );
  assertOk(error, "Atualização da liberação da etapa");

  await logEvento(
    adminEmail,
    `${liberada ? "semana_liberada" : "semana_bloqueada"}:${semanaKey}`,
    turmaId,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/semanas");
  revalidatePath("/");
  revalidatePath(`/semana/${semanaKey}`);
  revalidatePath("/etapa/[slug]", "page");
}

export async function definirLiberacaoEtapaAluno(formData: FormData) {
  const adminEmail = await requireAdmin();
  const db = privilegedDatabase();
  const { email, etapaKey, estado } = await aplicarLiberacaoIndividual(formData, {
    async alunoExiste(alunoEmail) {
      const { data, error } = await db
        .from("whitelist")
        .select("email")
        .eq("email", alunoEmail)
        .maybeSingle();
      assertOk(error, "Validação do aluno");
      return Boolean(data);
    },
    async remover(alunoEmail, chaveEtapa) {
      const { error } = await db
        .from("aluno_etapas")
        .delete()
        .eq("email", alunoEmail)
        .eq("etapa_key", chaveEtapa);
      assertOk(error, "Remoção do ajuste individual da etapa");
    },
    async salvar(ajuste) {
      const { error } = await db.from("aluno_etapas").upsert(
        {
          email: ajuste.email,
          etapa_key: ajuste.etapaKey,
          liberada: ajuste.liberada,
          atualizada_em: ajuste.atualizadaEm,
        },
        { onConflict: "email,etapa_key" },
      );
      assertOk(error, "Atualização do ajuste individual da etapa");
    },
  });

  await logEvento(adminEmail, `etapa_aluno_${estado}:${etapaKey}`, undefined, email);

  revalidatePath("/admin");
  revalidatePath("/admin/semanas");
  revalidatePath("/");
  revalidatePath(`/semana/${etapaKey}`);
  revalidatePath("/etapa/[slug]", "page");
}

/** Escolhe qual edição em código cada turma abre em uma etapa. */
export async function definirVersaoConteudoTurma(formData: FormData) {
  await requireAdmin();
  const turmaId = positiveInteger(formData.get("turma_id"));
  const semanaKey = String(formData.get("semana_key") ?? "");
  const versao = String(formData.get("versao") ?? "");
  if (!turmaId || !(SEMANA_KEYS as readonly string[]).includes(semanaKey)) {
    throw new Error("Turma ou etapa inválida.");
  }
  if (!versaoConteudoValida(versao)) {
    throw new Error("Essa versão de conteúdo não existe no código.");
  }

  const { error } = await privilegedDatabase().from("turma_conteudo_versoes").upsert(
    { turma_id: turmaId, etapa_key: semanaKey, versao },
    { onConflict: "turma_id,etapa_key" },
  );
  assertOk(error, "Atualização da versão de conteúdo");
  revalidatePath("/admin/semanas");
  revalidatePath("/");
  revalidatePath("/etapa/[slug]", "page");
}

/* ---------- materiais ---------- */

export async function criarCard(formData: FormData) {
  await requireAdmin();
  const titulo = textField(formData.get("titulo"), 200);
  if (!titulo) throw new Error("Título é obrigatório.");
  const modo = String(formData.get("modo") ?? "leitura");
  if (modo !== "leitura" && modo !== "download") {
    throw new Error("Modo inválido.");
  }
  const { error } = await privilegedDatabase()
    .from("downloads")
    .insert({
      titulo,
      tag: textField(formData.get("tag"), 80),
      desc: textField(formData.get("desc"), 1200),
      ordem: Math.trunc(Number(formData.get("ordem") ?? 0)) || 0,
      modo,
    });
  assertOk(error, "Criação do material");
  revalidatePath("/admin/materiais");
  revalidatePath("/");
}

/** leitura <-> download (leitura abre no app e registra; download baixa arquivo) */
export async function alternarModo(formData: FormData) {
  await requireAdmin();
  const id = positiveInteger(formData.get("id"));
  if (!id) throw new Error("Material inválido.");
  const db = privilegedDatabase();
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("modo")
    .eq("id", id)
    .maybeSingle();
  assertOk(cardError, "Leitura do material");
  if (!card) throw new Error("Material não encontrado.");
  if (card.modo === "download") {
    const { data: arquivo, error: arquivoError } = await db
      .from("arquivos")
      .select("file")
      .eq("download_id", id)
      .eq("ativo", true)
      .maybeSingle();
    assertOk(arquivoError, "Leitura do arquivo ativo");
    if (!arquivo) {
      throw new Error("Ative um arquivo HTML ou PDF antes de usar Leitura no app.");
    }
    validarArquivoParaLeitura(arquivo.file);
  }
  const { error } = await db
    .from("downloads")
    .update({ modo: card.modo === "leitura" ? "download" : "leitura" })
    .eq("id", id);
  assertOk(error, "Troca do modo do material");
  revalidatePath("/admin/materiais");
  revalidatePath("/");
}

export async function removerCard(formData: FormData) {
  await requireAdmin();
  const id = positiveInteger(formData.get("id"));
  if (!id) throw new Error("Material inválido.");
  const db = privilegedDatabase();
  const resultado = await removerMaterialComSeguranca(id, {
    async listarObjetos(materialId) {
      // Lista antes da exclusão em cascata apagar os metadados.
      const { data, error } = await db
        .from("arquivos")
        .select("file")
        .eq("download_id", materialId);
      assertOk(error, "Leitura dos arquivos do material");
      return (data ?? []).map((arquivo) => arquivo.file);
    },
    async excluirMetadados(materialId) {
      const { error } = await db.from("downloads").delete().eq("id", materialId);
      assertOk(error, "Remoção do material");
    },
    async removerObjetos(caminhos) {
      const { error } = await db.storage.from("materiais").remove([...caminhos]);
      if (error) throw error;
    },
  });
  if (resultado.limpezaStorageFalhou) {
    console.error("Material removido, mas a limpeza do Storage ficou pendente.");
  }
  revalidatePath("/admin/materiais");
  revalidatePath("/");
}

export async function subirArquivo(formData: FormData) {
  await requireAdmin();
  const downloadId = positiveInteger(formData.get("download_id"));
  const file = formData.get("arquivo") as File | null;
  if (!downloadId || !file || file.size === 0) throw new Error("Arquivo inválido.");
  if (file.size > MATERIAL_MAX_BYTES) throw new Error("O arquivo excede 50 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !MATERIAL_EXTENSIONS.has(extension)) {
    throw new Error("Tipo de arquivo não permitido.");
  }

  const db = privilegedDatabase();
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("modo")
    .eq("id", downloadId)
    .maybeSingle();
  assertOk(cardError, "Leitura do material");
  if (!card) throw new Error("Material não encontrado.");
  if (card.modo === "leitura") validarArquivoParaLeitura(file.name);

  const { data: versoes, error: versoesError } = await db
    .from("arquivos")
    .select("id, versao, ativo")
    .eq("download_id", downloadId)
    .order("versao", { ascending: false });
  assertOk(versoesError, "Leitura das versões");
  const versao = (versoes?.[0]?.versao ?? 0) + 1;
  const anteriorAtivo = versoes?.find((item) => item.ativo);

  const nomeLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180);
  const path = `${downloadId}/v${versao}-${nomeLimpo}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await db.storage.from("materiais").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Upload falhou: ${error.message}`);

  // a nova versão vira a ativa
  const { error: deactivateError } = await db
    .from("arquivos")
    .update({ ativo: false })
    .eq("download_id", downloadId);
  if (deactivateError) {
    await db.storage.from("materiais").remove([path]);
    assertOk(deactivateError, "Troca da versão ativa");
  }
  const { error: insertError } = await db.from("arquivos").insert({
    download_id: downloadId,
    file: path,
    versao,
    nota: String(formData.get("nota") ?? "").trim() || null,
    ativo: true,
  });
  if (insertError) {
    if (anteriorAtivo) {
      await db.from("arquivos").update({ ativo: true }).eq("id", anteriorAtivo.id);
    }
    await db.storage.from("materiais").remove([path]);
    assertOk(insertError, "Registro da nova versão");
  }

  revalidatePath("/admin/materiais");
  revalidatePath("/");
}

export async function ativarVersao(formData: FormData) {
  await requireAdmin();
  const arquivoId = positiveInteger(formData.get("arquivo_id"));
  if (!arquivoId) throw new Error("Versão inválida.");
  const db = privilegedDatabase();
  const { data: alvo, error: alvoError } = await db
    .from("arquivos")
    .select("id, download_id, file")
    .eq("id", arquivoId)
    .maybeSingle();
  assertOk(alvoError, "Leitura da versão");
  if (!alvo) throw new Error("Versão não encontrada.");
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("modo")
    .eq("id", alvo.download_id)
    .maybeSingle();
  assertOk(cardError, "Leitura do material");
  if (!card) throw new Error("Material não encontrado.");
  if (card.modo === "leitura") validarArquivoParaLeitura(alvo.file);

  const { data: anteriorAtivo, error: anteriorError } = await db
    .from("arquivos")
    .select("id")
    .eq("download_id", alvo.download_id)
    .eq("ativo", true)
    .maybeSingle();
  assertOk(anteriorError, "Leitura da versão ativa");
  const { error: deactivateError } = await db
    .from("arquivos")
    .update({ ativo: false })
    .eq("download_id", alvo.download_id);
  assertOk(deactivateError, "Desativação da versão anterior");
  const { error: activateError } = await db
    .from("arquivos")
    .update({ ativo: true })
    .eq("id", alvo.id);
  if (activateError && anteriorAtivo) {
    await db.from("arquivos").update({ ativo: true }).eq("id", anteriorAtivo.id);
  }
  assertOk(activateError, "Ativação da versão");
  revalidatePath("/admin/materiais");
}
