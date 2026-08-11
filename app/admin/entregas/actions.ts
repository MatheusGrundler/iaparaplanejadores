"use server";

import { revalidatePath } from "next/cache";
import { canAccessAdminArea, getMemberIdentity } from "@/lib/auth";
import { privilegedDatabase } from "@/lib/supabase/admin";

function uuidValido(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function responderDuvidaSemana(formData: FormData) {
  if (!(await canAccessAdminArea())) return;
  const identity = await getMemberIdentity();
  const id = String(formData.get("id") ?? "");
  const resposta = String(formData.get("resposta") ?? "").trim();
  if (!uuidValido(id) || resposta.length < 2 || resposta.length > 5000) return;

  const { data, error } = await privilegedDatabase()
    .from("curso_duvidas")
    .update({
      resposta,
      status: "respondida",
      respondida_por: identity?.userId ?? null,
      respondida_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "aberta")
    .is("resposta", null)
    .select("id")
    .maybeSingle();
  if (error) console.error("Falha ao responder dúvida da Imersão:", error.code);
  if (!error && !data) {
    console.warn("A dúvida já havia sido respondida ou arquivada antes desta ação.");
  }
  revalidatePath("/admin/entregas");
}

export async function marcarQuestRevisada(formData: FormData) {
  if (!(await canAccessAdminArea())) return;
  const id = String(formData.get("id") ?? "");
  if (!uuidValido(id)) return;

  const { error } = await privilegedDatabase()
    .from("quest_respostas")
    .update({ status: "revisada", revisada_em: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "enviada");
  if (error) console.error("Falha ao revisar Quest:", error.code);
  revalidatePath("/admin/entregas");
}
