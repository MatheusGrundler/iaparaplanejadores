import { notFound, redirect } from "next/navigation";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { canAccessMemberArea, getUserEmail } from "@/lib/auth";
import { destinoDoMaterial } from "@/lib/materiais";
import Leitor from "./Leitor";

export const dynamic = "force-dynamic";

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const downloadId = Number(id);
  if (!Number.isSafeInteger(downloadId) || downloadId <= 0) notFound();

  // O layout melhora a UX; este gate protege o acesso à secret key.
  if (!(await canAccessMemberArea())) return null;

  const db = privilegedDatabase();
  const { data: card, error: cardError } = await db
    .from("downloads")
    .select("id, titulo, modo")
    .eq("id", downloadId)
    .maybeSingle();
  if (cardError) {
    console.error("Falha ao carregar o material:", cardError.code);
    return <ErroMaterial />;
  }
  if (!card) notFound();
  const destino = destinoDoMaterial(downloadId, card.modo);
  if (destino.tipo === "download") redirect(destino.caminho);
  if (destino.tipo === "invalido") notFound();

  const { data: arquivo, error: arquivoError } = await db
    .from("arquivos")
    .select("id")
    .eq("download_id", downloadId)
    .eq("ativo", true)
    .maybeSingle();
  if (arquivoError) {
    console.error("Falha ao carregar o arquivo ativo:", arquivoError.code);
    return <ErroMaterial />;
  }
  if (!arquivo) notFound();

  const email = await getUserEmail();
  let statusInicial: string | null = null;
  if (email) {
    const { data: leitura, error: leituraError } = await db
      .from("leituras")
      .select("status")
      .eq("download_id", downloadId)
      .eq("email", email)
      .maybeSingle();
    if (leituraError) {
      console.error("Falha ao carregar o estado de leitura:", leituraError.code);
      return <ErroMaterial />;
    }
    statusInicial = leitura?.status ?? null;
  }

  return <Leitor id={card.id} titulo={card.titulo} statusInicial={statusInicial} />;
}

function ErroMaterial() {
  return (
    <main>
      <h1>Material indisponível</h1>
      <div className="card vazio" role="alert">
        Não foi possível carregar este material agora. Tente novamente em alguns instantes.
      </div>
    </main>
  );
}
