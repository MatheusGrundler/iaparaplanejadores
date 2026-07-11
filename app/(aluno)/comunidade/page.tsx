import { adminClient } from "@/lib/supabase/admin";
import { canAccessMemberArea } from "@/lib/auth";
import Composer from "./Composer";

export const dynamic = "force-dynamic";

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function ComunidadePage() {
  if (!(await canAccessMemberArea())) return null;

  const { data: posts } = await adminClient()
    .from("posts")
    .select("id, autor, texto, fixado, created_at")
    .eq("deletado", false)
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main>
      <h1>Comunidade</h1>
      <p className="sub">A turma inteira num lugar só. Sem pergunta boba.</p>

      <Composer />

      {!posts || posts.length === 0 ? (
        <div className="vazio card">
          <span className="spark">✦</span>
          Ainda não tem conversa por aqui. Quebra o gelo?
        </div>
      ) : (
        <div className="card">
          {posts.map((p) => (
            <div className={`post${p.fixado ? " fixado" : ""}`} key={p.id}>
              <span className="autor">{p.autor}</span>
              <span className="quando">
                {p.fixado ? "fixado · " : ""}
                {quando(p.created_at)}
              </span>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
