import { canAccessAdminArea } from "@/lib/auth";
import { rotuloEtapa } from "@/lib/curso-nomenclatura";
import { REGISTRO_FORMULARIOS, type DefinicaoFormulario } from "@/lib/formularios";
import { validarDefinicaoFormulario } from "@/lib/formularios/validacao";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { marcarQuestRevisada, responderDuvidaSemana } from "./actions";

export const dynamic = "force-dynamic";

type Quest = {
  id: string;
  email: string;
  formulario_versao_id: string | null;
  semana_key: string;
  quest_key: string;
  respostas: Record<string, unknown>;
  status: string;
  enviada_em: string | null;
  revisada_em: string | null;
};

type Anexo = {
  id: string;
  resposta_id: string;
  campo: string;
  file: string;
  nome_original: string;
  mime: string | null;
  bytes: number | null;
};

type Duvida = {
  id: string;
  email: string;
  formulario_codigo: string | null;
  formulario_versao_id: string | null;
  semana_key: string;
  pergunta: string;
  resposta: string | null;
  status: string;
  criada_em: string;
};

function quando(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function tamanho(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function rotuloChave(chave: string) {
  const match = /^semana-(\d+)$/.exec(chave);
  return match ? rotuloEtapa(Number(match[1])) : chave;
}

export default async function EntregasPage() {
  if (!(await canAccessAdminArea())) return null;
  const db = privilegedDatabase();

  const [questsResult, anexosResult, duvidasResult] = await Promise.all([
    db
      .from("quest_respostas")
      .select(
        "id, email, formulario_versao_id, semana_key, quest_key, respostas, status, enviada_em, revisada_em",
      )
      .in("status", ["enviada", "revisada"])
      .order("enviada_em", { ascending: false })
      .limit(100),
    db
      .from("quest_anexos")
      .select("id, resposta_id, campo, file, nome_original, mime, bytes")
      .eq("status", "pronto")
      .order("criado_em", { ascending: true }),
    db
      .from("curso_duvidas")
      .select(
        "id, email, formulario_codigo, formulario_versao_id, semana_key, pergunta, resposta, status, criada_em",
      )
      .order("criada_em", { ascending: false })
      .limit(100),
  ]);

  const quests = (questsResult.data ?? []) as Quest[];
  const duvidas = (duvidasResult.data ?? []) as Duvida[];
  const anexos = (anexosResult.data ?? []) as Anexo[];
  const formularioVersaoIds = [
    ...new Set(
      [...quests, ...duvidas]
        .map((item) => item.formulario_versao_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const versoesResult = formularioVersaoIds.length
    ? await db
        .from("curso_formulario_versoes")
        .select("id, numero, definicao")
        .in("id", formularioVersaoIds)
    : { data: [], error: null };
  const erro =
    questsResult.error || anexosResult.error || duvidasResult.error || versoesResult.error;
  const versaoPorId = new Map<string, { numero: number; definicao: DefinicaoFormulario }>();
  for (const versao of versoesResult.data ?? []) {
    const validacao = validarDefinicaoFormulario(versao.definicao);
    if (validacao.valido) {
      versaoPorId.set(versao.id, {
        numero: versao.numero,
        definicao: validacao.definicao,
      });
    }
  }
  const anexosComUrl = await Promise.all(
    anexos.map(async (anexo) => {
      const { data } = await db.storage.from("quest-anexos").createSignedUrl(anexo.file, 3600);
      return { ...anexo, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <main className="admin-entregas">
      <h1>Entregas e dúvidas</h1>
      <p className="sub">Quests enviadas pela turma e perguntas das páginas novas.</p>

      {erro && (
        <p className="aviso erro">
          As tabelas do curso ainda não estão disponíveis neste ambiente. Aplique a migration nova
          antes de usar este painel.
        </p>
      )}

      <section aria-labelledby="quests-admin-titulo">
        <div className="secao-cabecalho-admin">
          <div>
            <span className="pill">Quests</span>
            <h2 id="quests-admin-titulo">Entregas recebidas</h2>
          </div>
          <span>{quests.length} entrega(s)</span>
        </div>
        {quests.length === 0 ? (
          <div className="card vazio">Nenhuma Quest enviada ainda.</div>
        ) : (
          <div className="fila-admin">
            {quests.map((quest) => {
              const versao = quest.formulario_versao_id
                ? versaoPorId.get(quest.formulario_versao_id)
                : undefined;
              const formulario = versao?.definicao ?? REGISTRO_FORMULARIOS.buscar(quest.quest_key);
              const rotulo = rotuloChave(quest.semana_key);
              const anexosDaQuest = anexosComUrl.filter((anexo) => anexo.resposta_id === quest.id);
              return (
                <article className="card entrega-admin" key={quest.id}>
                  <div className="entrega-admin-topo">
                    <div>
                      <span className="pill">
                        {rotulo}
                        {versao ? ` · v${versao.numero}` : ""}
                      </span>
                      <h3>{formulario?.titulo ?? quest.quest_key}</h3>
                    </div>
                    <span className={`status-admin status-${quest.status}`}>
                      {quest.status === "revisada" ? "Revisada" : "A revisar"}
                    </span>
                  </div>
                  <div className="entrega-admin-meta">
                    <strong>{quest.email}</strong>
                    <span>Enviada {quando(quest.enviada_em)}</span>
                  </div>
                  <dl className="respostas-admin">
                    {Object.entries(quest.respostas ?? {})
                      .filter(([, valor]) => String(valor).trim())
                      .map(([key, valor]) => {
                        const campo = formulario?.campos.find((item) => item.chave === key);
                        return (
                          <div key={key}>
                            <dt>{campo?.rotulo ?? key}</dt>
                            <dd>{String(valor)}</dd>
                          </div>
                        );
                      })}
                  </dl>
                  {anexosDaQuest.length > 0 && (
                    <div className="anexos-admin">
                      <strong>Arquivos</strong>
                      <ul>
                        {anexosDaQuest.map((anexo) => (
                          <li key={anexo.id}>
                            {anexo.url ? (
                              <a href={anexo.url} target="_blank" rel="noreferrer">
                                {anexo.nome_original} ↗
                              </a>
                            ) : (
                              anexo.nome_original
                            )}
                            <span>{tamanho(anexo.bytes)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {quest.status === "enviada" && (
                    <form action={marcarQuestRevisada}>
                      <input type="hidden" name="id" value={quest.id} />
                      <button className="btn btn-mini" type="submit">
                        Marcar como revisada
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="duvidas-admin-secao" aria-labelledby="duvidas-admin-titulo">
        <div className="secao-cabecalho-admin">
          <div>
            <span className="pill">Dúvidas</span>
            <h2 id="duvidas-admin-titulo">Fila de perguntas</h2>
          </div>
          <span>{duvidas.filter((item) => item.status === "aberta").length} aberta(s)</span>
        </div>
        {duvidas.length === 0 ? (
          <div className="card vazio">Nenhuma dúvida enviada ainda.</div>
        ) : (
          <div className="fila-admin">
            {duvidas.map((duvida) => {
              const versao = duvida.formulario_versao_id
                ? versaoPorId.get(duvida.formulario_versao_id)
                : undefined;
              const rotulo = rotuloChave(duvida.semana_key);
              return (
                <article className="card duvida-admin-card" key={duvida.id}>
                  <div className="entrega-admin-meta">
                    <strong>{duvida.email}</strong>
                    <span>
                      {rotulo}
                      {versao ? ` · v${versao.numero}` : ""} · {quando(duvida.criada_em)}
                    </span>
                  </div>
                  <p>{duvida.pergunta}</p>
                  {duvida.resposta ? (
                    <div className="resposta-matheus">
                      <strong>Sua resposta</strong>
                      <p>{duvida.resposta}</p>
                    </div>
                  ) : (
                    <form action={responderDuvidaSemana} className="responder-duvida">
                      <input type="hidden" name="id" value={duvida.id} />
                      <label htmlFor={`resposta-${duvida.id}`}>Responder</label>
                      <textarea
                        id={`resposta-${duvida.id}`}
                        name="resposta"
                        minLength={2}
                        maxLength={5000}
                        rows={4}
                        required
                      />
                      <button className="btn btn-mini" type="submit">
                        Enviar resposta
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
