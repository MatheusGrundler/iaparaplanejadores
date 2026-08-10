import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { canAccessAdminArea } from "@/lib/auth";
import { criarTurma, editarTurma } from "../actions";

export const dynamic = "force-dynamic";

function paraInputDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export default async function TurmasPage() {
  if (!(await canAccessAdminArea())) return null;

  const db = adminClient();
  const [{ data: turmas }, { data: alunos }] = await Promise.all([
    db.from("turmas").select("id, nome, inicio, fim, acesso_ate").order("id"),
    db.from("whitelist").select("turma_id"),
  ]);

  const porTurma = new Map<number, number>();
  for (const a of alunos ?? []) {
    if (a.turma_id) porTurma.set(a.turma_id, (porTurma.get(a.turma_id) ?? 0) + 1);
  }

  return (
    <main>
      <h1>Turmas</h1>
      <p className="sub">
        Defina o período de acesso da turma. A liberação das etapas é controlada separadamente.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Nova turma</h2>
        <form
          action={criarTurma}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label>Nome</label>
            <input name="nome" required placeholder="Turma 2" />
          </div>
          <div>
            <label>Início</label>
            <input name="inicio" type="date" />
          </div>
          <div>
            <label>Fim</label>
            <input name="fim" type="date" />
          </div>
          <div>
            <label>Acesso até</label>
            <input name="acesso_ate" type="date" />
          </div>
          <button className="btn btn-mini">Criar</button>
        </form>
      </div>

      {(turmas ?? []).map((t) => (
        <div className="card" key={t.id} style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <strong>{t.nome}</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {porTurma.get(t.id) ?? 0} aluno(s) · prazo compartilhado
              </p>
            </div>
            <Link className="btn btn-mini" href={`/admin/semanas#turma-${t.id}`}>
              Liberar etapas
            </Link>
          </div>
          <form
            action={editarTurma}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <input type="hidden" name="id" value={t.id} />
            <div>
              <label>Nome</label>
              <input name="nome" defaultValue={t.nome} required />
            </div>
            <div>
              <label>Início</label>
              <input name="inicio" type="date" defaultValue={t.inicio ?? ""} />
            </div>
            <div>
              <label>Fim</label>
              <input name="fim" type="date" defaultValue={t.fim ?? ""} />
            </div>
            <div>
              <label>Acesso até</label>
              <input name="acesso_ate" type="date" defaultValue={paraInputDate(t.acesso_ate)} />
            </div>
            <button className="btn btn-fantasma btn-mini">Salvar</button>
          </form>
        </div>
      ))}
    </main>
  );
}
