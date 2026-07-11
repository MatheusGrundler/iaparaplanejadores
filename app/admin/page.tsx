import { adminClient } from "@/lib/supabase/admin";
import { canAccessAdminArea } from "@/lib/auth";

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

export default async function AdminHome() {
  if (!(await canAccessAdminArea())) return null;

  const db = adminClient();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [alunos, materiais, posts, downloadsHoje, ultimos] = await Promise.all([
    db.from("whitelist").select("*", { count: "exact", head: true }),
    db.from("downloads").select("*", { count: "exact", head: true }),
    db
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("deletado", false),
    db
      .from("eventos")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "download")
      .gte("criado_em", hoje.toISOString()),
    db
      .from("eventos")
      .select("email, tipo, criado_em")
      .order("criado_em", { ascending: false })
      .limit(12),
  ]);

  const stats = [
    { rotulo: "Alunos liberados", valor: alunos.count ?? 0 },
    { rotulo: "Materiais", valor: materiais.count ?? 0 },
    { rotulo: "Posts na comunidade", valor: posts.count ?? 0 },
    { rotulo: "Downloads hoje", valor: downloadsHoje.count ?? 0 },
  ];

  return (
    <main>
      <h1>Visão geral</h1>
      <p className="sub">O pulso da turma num olhar.</p>

      <div className="grid" style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <div className="card" key={s.rotulo}>
            <div className="stat">{s.valor}</div>
            <div className="muted">{s.rotulo}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Última atividade</h2>
        {!ultimos.data || ultimos.data.length === 0 ? (
          <p className="muted">Nada ainda. Assim que a turma entrar, aparece aqui.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quem</th>
                <th>O quê</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {ultimos.data.map((e, i) => (
                <tr key={i}>
                  <td>{e.email}</td>
                  <td>{e.tipo}</td>
                  <td className="muted">{quando(e.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
