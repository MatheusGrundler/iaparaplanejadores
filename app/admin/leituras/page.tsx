import { privilegedDatabase } from "@/lib/supabase/admin";
import { canAccessAdminArea } from "@/lib/auth";
import { formataTempo, rotuloStatus } from "@/lib/leitura";
import DuvidaAdmin from "./DuvidaAdmin";

export const dynamic = "force-dynamic";

function dataHoraBr(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Leitura = {
  download_id: number;
  email: string;
  segundos: number;
  status: string | null;
  duvida: string | null;
  duvida_html: string | null;
  respondida_em: string | null;
  respostas: Record<string, string> | null;
  ultimo_acesso: string | null;
};

const ROTULOS_RESPOSTAS: Record<string, string> = {
  // canvas do guia O mapa da IA (Preparação)
  tarefa: "Tarefa que rouba tempo",
  passos: "Como acontece hoje",
  prepara: "O que o assistente prepara",
  humano: "O que fica com o aluno",
  dados: "Informações e dados sensíveis",
  // check-ins históricos do Raio-X (marcos 3, 5 e 8)
  r3_agente: "Marco 3 · nome e vibe do agente",
  r3_skills: "Marco 3 · skills testadas",
  r3_protecao: "Marco 3 · teste do anonimizador",
  r5_fluxo: "Marco 5 · fluxo-âncora rodou?",
  r5_papeis: "Marco 5 · o que prepara × o que é do aluno",
  r5_parada: "Marco 5 · botão de parada",
  r8_falha: "Marco 8 · falha que vai simular",
  r8_volta: "Marco 8 · como recupera",
  r8_trava: "Marco 8 · o que ainda trava",
  r8_melhoria: "Marco 8 · próxima melhoria",
};

export default async function LeiturasPage() {
  if (!(await canAccessAdminArea())) return null;

  const db = privilegedDatabase();
  const [rMateriais, rAlunos, rLeituras] = await Promise.all([
    db.from("downloads").select("id, tag, titulo, ordem").eq("modo", "leitura").order("ordem"),
    db.from("whitelist").select("email, nome").order("email"),
    db
      .from("leituras")
      .select(
        "download_id, email, segundos, status, duvida, duvida_html, respondida_em, respostas, ultimo_acesso",
      ),
  ]);
  for (const [nome, r] of [
    ["materiais", rMateriais],
    ["alunos", rAlunos],
    ["leituras", rLeituras],
  ] as const) {
    if (r.error) console.error(`Leituras: consulta de ${nome} falhou:`, r.error.message);
  }
  const materiais = rMateriais.data;
  const alunos = rAlunos.data;
  const leituras = rLeituras.data;

  const porChave = new Map<string, Leitura>();
  for (const l of (leituras ?? []) as Leitura[]) {
    porChave.set(`${l.download_id}:${l.email}`, l);
  }

  const listaAlunos = alunos ?? [];
  const listaMateriais = materiais ?? [];

  return (
    <main>
      <h1>Leituras</h1>
      <p className="sub">
        Quem abriu cada material, quanto tempo ficou na tela e o que marcou: lido, entendido ou com
        dúvidas. As dúvidas são candidatas naturais à próxima live.
      </p>

      {listaMateriais.length === 0 && (
        <div className="vazio card">
          <span className="spark">✦</span>
          Nenhum material no modo leitura ainda. Crie um card em Materiais com o modo &quot;Leitura
          no app&quot; e suba um HTML ou PDF.
        </div>
      )}

      {listaMateriais.map((m) => {
        const emailsWhitelist = new Set(listaAlunos.map((a) => a.email));
        const linhas = [
          ...listaAlunos.map((a) => ({
            aluno: a,
            leitura: porChave.get(`${m.id}:${a.email}`) ?? null,
          })),
          // leituras de quem não é aluno (admin testando, por exemplo)
          ...((leituras ?? []) as Leitura[])
            .filter((l) => l.download_id === m.id && !emailsWhitelist.has(l.email))
            .map((l) => ({
              aluno: { email: l.email, nome: `${l.email} · admin/teste` },
              leitura: l,
            })),
        ];
        const abriram = linhas.filter((l) => l.leitura).length;
        const entenderam = linhas.filter((l) => l.leitura?.status === "entendido").length;
        const comDuvida = linhas.filter((l) => l.leitura?.status === "duvida").length;

        return (
          <div className="card" key={m.id} style={{ marginBottom: 14 }}>
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
                {m.tag && <span className="pill">{m.tag}</span>} <strong>{m.titulo}</strong>
              </div>
              <span className="muted">
                {abriram}/{listaAlunos.length} abriram · {entenderam} entenderam · {comDuvida} com
                dúvidas
              </span>
            </div>

            {linhas.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>
                Nenhum aluno na whitelist ainda.
              </p>
            ) : (
              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Abriu</th>
                    <th>Tempo de tela</th>
                    <th>Status</th>
                    <th>Dúvida</th>
                    <th>Último acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ aluno, leitura }) => (
                    <tr key={aluno.email}>
                      <td>
                        {aluno.nome || aluno.email}
                        {aluno.nome && (
                          <div className="muted" style={{ fontSize: ".8rem" }}>
                            {aluno.email}
                          </div>
                        )}
                      </td>
                      <td>{leitura ? "✓" : "—"}</td>
                      <td>{leitura ? formataTempo(leitura.segundos) : "—"}</td>
                      <td>
                        {leitura?.status ? (
                          <span className="pill">{rotuloStatus(leitura.status)}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="muted" style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                        {leitura?.duvida || (leitura?.duvida_html ? "(com anexos)" : "—")}
                        {leitura &&
                          (leitura.duvida ||
                            leitura.duvida_html ||
                            leitura.status === "duvida") && (
                            <div style={{ marginTop: 6 }}>
                              <DuvidaAdmin
                                downloadId={m.id}
                                alunoEmail={leitura.email}
                                alunoNome={aluno.nome || aluno.email}
                                respondida={Boolean(leitura.respondida_em)}
                              />
                            </div>
                          )}
                        {leitura?.respostas && (
                          <details style={{ marginTop: 6 }}>
                            <summary
                              style={{
                                cursor: "pointer",
                                color: "var(--lime)",
                              }}
                            >
                              Respostas do material
                            </summary>
                            <div style={{ marginTop: 6 }}>
                              {Object.entries(leitura.respostas)
                                .filter(([k, v]) => k !== "origem" && String(v ?? "").trim())
                                .map(([k, v]) => (
                                  <p key={k} style={{ margin: "6px 0" }}>
                                    <strong style={{ color: "var(--off, #F4F7EE)" }}>
                                      {ROTULOS_RESPOSTAS[k] ?? k}:
                                    </strong>{" "}
                                    {String(v)}
                                  </p>
                                ))}
                            </div>
                          </details>
                        )}
                      </td>
                      <td className="muted">{dataHoraBr(leitura?.ultimo_acesso ?? null)}</td>
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
