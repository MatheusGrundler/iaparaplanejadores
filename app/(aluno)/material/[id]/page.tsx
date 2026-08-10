import { notFound } from "next/navigation";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { canAccessMemberArea, getUserEmail } from "@/lib/auth";
import Leitor from "./Leitor";

export const dynamic = "force-dynamic";

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) notFound();

  // O layout melhora a UX; este gate protege o acesso à secret key.
  if (!(await canAccessMemberArea())) return null;

  const db = privilegedDatabase();
  const { data: card } = await db
    .from("downloads")
    .select("id, titulo, modo")
    .eq("id", downloadId)
    .maybeSingle();
  if (!card || card.modo !== "leitura") notFound();

  const { data: arquivo } = await db
    .from("arquivos")
    .select("id")
    .eq("download_id", downloadId)
    .eq("ativo", true)
    .maybeSingle();
  if (!arquivo) notFound();

  const email = await getUserEmail();
  let statusInicial: string | null = null;
  if (email) {
    const { data: leitura } = await db
      .from("leituras")
      .select("status")
      .eq("download_id", downloadId)
      .eq("email", email)
      .maybeSingle();
    statusInicial = leitura?.status ?? null;
  }

  return <Leitor id={card.id} titulo={card.titulo} statusInicial={statusInicial} />;
}
