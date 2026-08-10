import { notFound, redirect } from "next/navigation";
import { chaveEtapaDoSlug, slugPublicoEtapa } from "@/lib/curso-nomenclatura";

type Props = { params: Promise<{ slug: string }> };

/** Compatibilidade para links antigos; a URL visível da trilha agora é /etapa. */
export default async function SemanaLegadaPage({ params }: Props) {
  const { slug } = await params;
  const chave = chaveEtapaDoSlug(slug);
  if (!chave) notFound();
  redirect(`/etapa/${slugPublicoEtapa(chave)}`);
}
