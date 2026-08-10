import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Formulario from "@/app/componentes/curso/Formulario";
import { conteudoNativoPorKey } from "@/app/componentes/curso/conteudos";
import { getMemberIdentity } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import { carregarLiberacoesSemanas } from "@/lib/curso-liberacao";
import { semanaEstaLiberada } from "@/lib/curso-liberacao-regra";
import { chaveEtapaDoSlug, slugPublicoEtapa } from "@/lib/curso-nomenclatura";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const FORMULARIO_DUVIDA: Readonly<Record<SemanaKey, string>> = {
  "semana-0": "duvida-preparacao",
  "semana-1": "duvida-etapa-1",
  "semana-2": "duvida-etapa-2",
  "semana-3": "duvida-etapa-3",
  "semana-4": "duvida-etapa-4",
};

export default async function EtapaPage({ params }: Props) {
  const { slug } = await params;
  const chave = chaveEtapaDoSlug(slug);
  if (!chave) notFound();

  const slugCanonico = slugPublicoEtapa(chave);
  if (slug !== slugCanonico) redirect(`/etapa/${slugCanonico}`);

  const identity = await getMemberIdentity();
  if (!identity) return null;
  const liberacoes = await carregarLiberacoesSemanas(identity);
  if (!semanaEstaLiberada(liberacoes, chave)) {
    redirect(`/?etapa-bloqueada=${slugCanonico}`);
  }

  const conteudo = conteudoNativoPorKey(chave);
  const Componente = conteudo.componente;
  const indice = SEMANA_KEYS.indexOf(chave);
  const anteriorKey = SEMANA_KEYS.slice(0, indice)
    .reverse()
    .find((item) => liberacoes.get(item));
  const proximaKey = SEMANA_KEYS.slice(indice + 1).find((item) => liberacoes.get(item));

  return (
    <main className="conteudo-nativo-route">
      <Componente
        renderAtividade={(atividade) => <Formulario codigo={atividade.key} />}
        duvidas={<Formulario codigo={FORMULARIO_DUVIDA[chave]} />}
      />

      <nav className="conteudo-nativo-nav" aria-label="Navegação entre etapas">
        {anteriorKey ? (
          <Link href={`/etapa/${slugPublicoEtapa(anteriorKey)}`}>← Etapa anterior</Link>
        ) : (
          <Link href="/">← Voltar à trilha</Link>
        )}
        {proximaKey && <Link href={`/etapa/${slugPublicoEtapa(proximaKey)}`}>Próxima etapa →</Link>}
      </nav>
    </main>
  );
}
