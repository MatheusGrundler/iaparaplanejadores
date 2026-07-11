"use server";

import { revalidatePath } from "next/cache";
import { getUserEmail, memberStatus, isAdmin, logEvento } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export async function publicarPost(formData: FormData) {
  const email = await getUserEmail();
  if (!email) return;

  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto || texto.length > 3000) return;

  const [status, admin] = await Promise.all([
    memberStatus(email),
    isAdmin(email),
  ]);
  if (status !== "ok" && !admin) return;

  const db = adminClient();
  const { data: aluno, error: alunoError } = await db
    .from("whitelist")
    .select("nome")
    .eq("email", email)
    .maybeSingle();
  if (alunoError) {
    console.error("Falha ao buscar nome do autor:", alunoError.code);
    throw new Error("Não foi possível publicar agora.");
  }

  const autor = admin ? "Matheus" : aluno?.nome || email.split("@")[0];

  const { error } = await db.from("posts").insert({ autor, email, texto });
  if (error) {
    console.error("Falha ao publicar post:", error.code);
    throw new Error("Não foi possível publicar agora.");
  }
  await logEvento(email, "post");
  revalidatePath("/comunidade");
}
