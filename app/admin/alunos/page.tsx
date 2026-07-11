import { adminClient } from "@/lib/supabase/admin";
import { canAccessAdminArea, expiracaoEfetiva } from "@/lib/auth";
import {
  liberarAluno,
  removerAluno,
  renovarAluno,
  trocarTurma,
} from "../actions";

export const dynamic = "force-dynamic";

function dataBr(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

export default async function AlunosPage() {
  if (!(await canAccessAdminArea())) return null;

  const db = adminClient();

  const [{ data: alunos }, { data: turmas }, { data: logins }] =
    await Promise.all([
      db
        .from("whitelist")
        .select("email, nome, expira_em, turma_id, criado_em, turmas(id, nome, acesso_ate)")
        .order("criado_em", { ascending: false }),
      db.from("turmas").select("id, nome, acesso_ate").order("id"),
      db
        .from("eventos")
        .select("email, criado_em")
        .eq("tipo", "login")
        .order("criado_em", { ascending: false }),
    ]);

  const ultimoLogin = new Map<string, string>();
  for (const l of logins ?? []) {
    if (!ultimoLogin.has(l.email)) ultimoLogin.set(l.email, l.criado_em);
  }

  return (
    <main>
      <h1>Alunos</h1>
      <p className="sub">
        Quem está na lista entra; quem sai da lista perde o acesso na hora. O
        prazo individual vence sobre o prazo da turma.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Liberar aluno</h2>
        <form
          action={liberarAluno}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1.4fr 1.4fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label>E-mail</label>
            <input name="email" type="email" required placeholder="aluno@exemplo.com" />
          </div>
          <div>
            <label>Nome</label>
            <input name="nome" placeholder="Como aparece na comunidade" />
          </div>
          <div>
            <label>Turma</label>
            <select name="turma_id" defaultValue={turmas?.[0]?.id ?? ""}>
              <option value="">Sem turma</option>
              {(turmas ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Acesso até (opcional)</label>
            <input name="expira_em" type="date" />
          </div>
          <button className="btn btn-mini">Liberar</button>
        </form>
        <p className="muted" style={{ marginTop: 10 }}>
          Sem data, o aluno herda o prazo da turma. Sem turma e sem data, o
          acesso não expira.
        </p>
      </div>

      <div className="card">
        <h2>Lista ({alunos?.length ?? 0})</h2>
        {!alunos || alunos.length === 0 ? (
          <p className="muted">Ninguém liberado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Acesso até</th>
                <th>Último login</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const turma = a.turmas as unknown as {
                  id: number;
                  nome: string;
                  acesso_ate: string | null;
                } | null;
                const limite = expiracaoEfetiva(a.expira_em, turma?.acesso_ate);
                const expirado = limite && limite.getTime() <= Date.now();
                const login = ultimoLogin.get(a.email);
                return (
                  <tr key={a.email}>
                    <td>
                      <strong>{a.nome || "—"}</strong>
                      <br />
                      <span className="muted">{a.email}</span>
                    </td>
                    <td>
                      <form action={trocarTurma} className="linha-acoes">
                        <input type="hidden" name="email" value={a.email} />
                        <select
                          name="turma_id"
                          defaultValue={turma?.id ?? ""}
                          style={{ width: 150 }}
                        >
                          <option value="">Sem turma</option>
                          {(turmas ?? []).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nome}
                            </option>
                          ))}
                        </select>
                        <button className="btn btn-fantasma btn-mini">ok</button>
                      </form>
                    </td>
                    <td>
                      {expirado ? (
                        <span style={{ color: "var(--erro)" }}>
                          expirou {dataBr(limite)}
                        </span>
                      ) : limite ? (
                        dataBr(limite)
                      ) : (
                        <span className="muted">não expira</span>
                      )}
                      {a.expira_em && (
                        <span className="muted"> (individual)</span>
                      )}
                    </td>
                    <td className="muted">
                      {login ? dataBr(login) : "nunca logou"}
                    </td>
                    <td>
                      <div className="linha-acoes">
                        <form action={renovarAluno} className="linha-acoes">
                          <input type="hidden" name="email" value={a.email} />
                          <input
                            name="expira_em"
                            type="date"
                            style={{ width: 140 }}
                          />
                          <button className="btn btn-fantasma btn-mini">
                            Renovar
                          </button>
                        </form>
                        <form action={removerAluno}>
                          <input type="hidden" name="email" value={a.email} />
                          <button className="btn btn-perigo btn-mini">
                            Cortar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ marginTop: 10 }}>
          Renovar com a data vazia faz o aluno voltar a herdar o prazo da turma.
        </p>
      </div>
    </main>
  );
}
