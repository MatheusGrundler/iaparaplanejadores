import { adminClient } from "@/lib/supabase/admin";
import { canAccessAdminArea } from "@/lib/auth";
import {
  criarCard,
  removerCard,
  subirArquivo,
  ativarVersao,
} from "../actions";

export const dynamic = "force-dynamic";

function dataBr(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

export default async function MateriaisPage() {
  if (!(await canAccessAdminArea())) return null;

  const db = adminClient();
  const [{ data: cards }, { data: arquivos }] = await Promise.all([
    db.from("downloads").select("id, tag, titulo, desc, ordem").order("ordem"),
    db
      .from("arquivos")
      .select("id, download_id, file, versao, nota, ativo, criado_em")
      .order("versao", { ascending: false }),
  ]);

  const porCard = new Map<number, NonNullable<typeof arquivos>>();
  for (const a of arquivos ?? []) {
    const lista = porCard.get(a.download_id) ?? [];
    lista.push(a);
    porCard.set(a.download_id, lista);
  }

  return (
    <main>
      <h1>Materiais</h1>
      <p className="sub">
        Cada card aponta pra versão ativa do arquivo. Subiu uma versão nova, o
        aluno já baixa a nova — e dá pra reverter com um clique.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Novo card</h2>
        <form
          action={criarCard}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 2fr 80px auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label>Tag</label>
            <input name="tag" placeholder="Kit" />
          </div>
          <div>
            <label>Título</label>
            <input name="titulo" required placeholder="Starter Kit do planejador" />
          </div>
          <div>
            <label>Descrição</label>
            <input name="desc" placeholder="O pacote pra montar seu agente" />
          </div>
          <div>
            <label>Ordem</label>
            <input name="ordem" type="number" defaultValue={0} />
          </div>
          <button className="btn btn-mini">Criar</button>
        </form>
      </div>

      {(cards ?? []).map((c) => {
        const versoes = porCard.get(c.id) ?? [];
        return (
          <div className="card" key={c.id} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                {c.tag && <span className="pill">{c.tag}</span>}{" "}
                <strong>{c.titulo}</strong>{" "}
                <span className="muted">{c.desc}</span>
              </div>
              <form action={removerCard}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn btn-perigo btn-mini">
                  Apagar card
                </button>
              </form>
            </div>

            <form
              action={subirArquivo}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr auto",
                gap: 10,
                alignItems: "end",
                margin: "16px 0",
              }}
            >
              <input type="hidden" name="download_id" value={c.id} />
              <div>
                <label>Arquivo (nova versão)</label>
                <input name="arquivo" type="file" required />
              </div>
              <div>
                <label>Nota da versão</label>
                <input name="nota" placeholder="o que mudou" />
              </div>
              <button className="btn btn-mini">Subir v{(versoes[0]?.versao ?? 0) + 1}</button>
            </form>

            {versoes.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Versão</th>
                    <th>Arquivo</th>
                    <th>Nota</th>
                    <th>Quando</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {versoes.map((v) => (
                    <tr key={v.id}>
                      <td>
                        v{v.versao}{" "}
                        {v.ativo && (
                          <span className="pill" style={{ marginLeft: 6 }}>
                            ativa
                          </span>
                        )}
                      </td>
                      <td className="muted">{v.file.split("/").pop()}</td>
                      <td className="muted">{v.nota || "—"}</td>
                      <td className="muted">{dataBr(v.criado_em)}</td>
                      <td>
                        {!v.ativo && (
                          <form action={ativarVersao}>
                            <input
                              type="hidden"
                              name="arquivo_id"
                              value={v.id}
                            />
                            <button className="btn btn-fantasma btn-mini">
                              Reativar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </main>
  );
}
