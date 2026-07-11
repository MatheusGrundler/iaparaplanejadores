import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { canAccessMemberArea } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Card = {
  id: number;
  tag: string | null;
  titulo: string;
  desc: string | null;
  ordem: number;
};

export default async function ConteudosPage() {
  // O layout melhora a UX; este gate protege o acesso à secret key.
  if (!(await canAccessMemberArea())) return null;

  const supabase = await createClient();

  // leitura como aluno (RLS); admin fora da whitelist lê via service_role
  let { data: cards } = await supabase
    .from("downloads")
    .select("id, tag, titulo, desc, ordem")
    .order("ordem", { ascending: true });

  if (!cards || cards.length === 0) {
    const { data: viaAdmin } = await adminClient()
      .from("downloads")
      .select("id, tag, titulo, desc, ordem")
      .order("ordem", { ascending: true });
    cards = viaAdmin ?? [];
  }

  // quais cards têm arquivo ativo pra baixar
  const { data: ativos } = await adminClient()
    .from("arquivos")
    .select("download_id")
    .eq("ativo", true);
  const comArquivo = new Set((ativos ?? []).map((a) => a.download_id));

  return (
    <main>
      <h1>Conteúdos</h1>
      <p className="sub">
        Os materiais da imersão, sempre na versão mais recente.
      </p>

      {cards.length === 0 ? (
        <div className="vazio card">
          <span className="spark">✦</span>
          Os materiais aparecem aqui assim que forem liberados.
        </div>
      ) : (
        <div className="grid">
          {(cards as Card[]).map((c) => (
            <div className="card" key={c.id}>
              {c.tag && <span className="pill">{c.tag}</span>}
              <h2 style={{ margin: "12px 0 6px" }}>{c.titulo}</h2>
              {c.desc && (
                <p className="muted" style={{ marginBottom: 16 }}>
                  {c.desc}
                </p>
              )}
              {comArquivo.has(c.id) ? (
                <a className="btn btn-mini" href={`/api/download/${c.id}`}>
                  Baixar
                </a>
              ) : (
                <span className="muted">Em breve</span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
