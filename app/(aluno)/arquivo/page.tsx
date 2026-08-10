import Link from "next/link";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { canAccessMemberArea } from "@/lib/auth";

export const dynamic = "force-dynamic";

type MaterialAntigo = {
  id: number;
  tag: string | null;
  titulo: string;
  desc: string | null;
  ordem: number;
};

export default async function ArquivoPage() {
  if (!(await canAccessMemberArea())) return null;

  const db = privilegedDatabase();
  const [{ data: materiais }, { data: ativos }] = await Promise.all([
    db.from("downloads").select("id, tag, titulo, desc, ordem").order("ordem", { ascending: true }),
    db.from("arquivos").select("download_id").eq("ativo", true),
  ]);
  const comArquivo = new Set((ativos ?? []).map((item) => item.download_id));

  return (
    <main className="pagina-arquivo">
      <div className="breadcrumb">
        <Link href="/">Imersão</Link>
        <span aria-hidden="true">/</span>
        <span>Arquivo anterior</span>
      </div>

      <div className="arquivo-cabecalho">
        <span className="pill">Consulta</span>
        <h1>Materiais da estrutura anterior</h1>
        <p className="sub">
          Nada foi apagado. Os conteúdos antigos permanecem aqui como referência, enquanto a
          experiência principal acontece na Preparação e nas Etapas 1 a 4.
        </p>
      </div>

      {!materiais?.length ? (
        <div className="vazio card">Nenhum material antigo encontrado.</div>
      ) : (
        <div className="grid arquivo-grid">
          {(materiais as MaterialAntigo[]).map((material) => (
            <article className="card arquivo-card" key={material.id}>
              {material.tag && <span className="pill">{material.tag}</span>}
              <h2>{material.titulo}</h2>
              {material.desc && <p className="muted">{material.desc}</p>}
              {comArquivo.has(material.id) ? (
                <Link className="btn btn-fantasma btn-mini" href={`/material/${material.id}`}>
                  Abrir na plataforma
                </Link>
              ) : (
                <span className="muted">Sem arquivo ativo</span>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
