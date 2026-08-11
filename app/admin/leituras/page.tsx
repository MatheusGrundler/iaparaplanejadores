import Link from "next/link";
import { canAccessAdminArea } from "@/lib/auth";
import {
  ATIVIDADES_POR_SEMANA,
  SEMANA_KEYS,
  type SemanaKey,
} from "@/lib/curso-atividades";
import {
  calcularPaginacao,
  itensPorPaginaDoParametro,
  paginaDoParametro,
  type ParametroBusca,
} from "@/lib/admin-paginacao";
import { rotuloEtapa } from "@/lib/curso-nomenclatura";
import { formataTempo, rotuloStatus } from "@/lib/leitura";
import { privilegedDatabase } from "@/lib/supabase/admin";
import DuvidaAdmin from "./DuvidaAdmin";
import PaginacaoLeituras, { type PaginacaoLeituras as Paginacao } from "./PaginacaoLeituras";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, ParametroBusca>>;
};

type Aluno = { email: string; nome: string | null };
type Material = { id: number; tag: string | null; titulo: string; ordem: number };

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

type AcessoEtapa = {
  email: string;
  semana_key: SemanaKey;
  aberturas: number;
  segundos: number;
  primeiro_acesso: string;
  ultimo_acesso: string;
};

type QuestResumo = {
  email: string;
  semana_key: SemanaKey;
  quest_key: string;
  status: "rascunho" | "enviada" | "revisada";
  enviada_em: string | null;
  revisada_em: string | null;
  atualizado_em: string;
};

type DuvidaResumo = {
  email: string;
  semana_key: SemanaKey;
  status: "aberta" | "respondida" | "arquivada";
  criada_em: string;
};

type Evento = {
  id: number;
  email: string;
  tipo: string;
  alvo: string | null;
  ref: number | null;
  criado_em: string;
};

type LinhaMaterial = {
  aluno: Aluno;
  leitura: Leitura | null;
};

const TIPOS_EVENTO_APRENDIZAGEM = [
  "etapa_aberta",
  "quest_enviada",
  "duvida_etapa",
  "leitura_abrir",
  "leitura_lido",
  "leitura_entendido",
  "leitura_duvida",
  "login",
];

const ROTULOS_RESPOSTAS: Record<string, string> = {
  tarefa: "Tarefa que rouba tempo",
  passos: "Como acontece hoje",
  prepara: "O que o assistente prepara",
  humano: "O que fica com o aluno",
  dados: "Informações e dados sensíveis",
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

function semanaValida(value: unknown): value is SemanaKey {
  return typeof value === "string" && (SEMANA_KEYS as readonly string[]).includes(value);
}

function maiorData(datas: Array<string | null | undefined>) {
  return datas.filter((data): data is string => Boolean(data)).sort().at(-1) ?? null;
}

function rotuloEntrega(quests: QuestResumo[], total: number) {
  if (total === 0) return "Sem Quest";
  if (quests.some((quest) => quest.status === "revisada")) return "Revisada";
  if (quests.some((quest) => quest.status === "enviada")) return "Enviada";
  if (quests.some((quest) => quest.status === "rascunho")) return "Rascunho";
  return "Não enviada";
}

function rotuloDuvidas(duvidas: DuvidaResumo[]) {
  if (duvidas.length === 0) return "—";
  const abertas = duvidas.filter((duvida) => duvida.status === "aberta").length;
  return abertas > 0
    ? `${duvidas.length} · ${abertas} ${abertas === 1 ? "aberta" : "abertas"}`
    : `${duvidas.length} ${duvidas.length === 1 ? "enviada" : "enviadas"}`;
}

function rotuloEvento(evento: Evento, materiais: Map<number, string>) {
  const etapa = semanaValida(evento.alvo) ? rotuloEtapa(SEMANA_KEYS.indexOf(evento.alvo)) : null;
  const material = evento.ref ? materiais.get(evento.ref) : null;
  if (evento.tipo === "etapa_aberta") return `Abriu ${etapa ?? "uma etapa"}`;
  if (evento.tipo === "quest_enviada") return `Concluiu uma Quest${etapa ? ` · ${etapa}` : ""}`;
  if (evento.tipo === "duvida_etapa") return `Enviou uma dúvida${etapa ? ` · ${etapa}` : ""}`;
  if (evento.tipo === "leitura_abrir") return `Abriu ${material ?? "um material"}`;
  if (evento.tipo === "leitura_lido") return `Marcou como lido · ${material ?? "material"}`;
  if (evento.tipo === "leitura_entendido") {
    return `Marcou como entendido · ${material ?? "material"}`;
  }
  if (evento.tipo === "leitura_duvida") return `Marcou dúvida · ${material ?? "material"}`;
  if (evento.tipo === "login") return "Entrou na plataforma";
  return evento.tipo;
}

function TabelaMaterial({
  material,
  linhas,
  paginacao,
  paginaParametro,
  quantidadeParametro,
  entidadePlural,
}: {
  material: Material;
  linhas: LinhaMaterial[];
  paginacao: Paginacao;
  paginaParametro: string;
  quantidadeParametro: string;
  entidadePlural: string;
}) {
  if (linhas.length === 0) return <p className="muted">Nenhum acesso neste grupo.</p>;
  const linhasDaPagina = linhas.slice(paginacao.offset, paginacao.fim);

  return (
    <>
      <div style={{ overflowX: "auto" }}>
      <table style={{ marginTop: 12, minWidth: 880 }}>
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
          {linhasDaPagina.map(({ aluno, leitura }) => (
            <tr key={aluno.email}>
              <td>
                {aluno.nome || aluno.email}
                {aluno.nome && (
                  <div className="muted" style={{ fontSize: ".875rem" }}>
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
                  (leitura.duvida || leitura.duvida_html || leitura.status === "duvida") && (
                    <div style={{ marginTop: 6 }}>
                      <DuvidaAdmin
                        downloadId={material.id}
                        alunoEmail={leitura.email}
                        alunoNome={aluno.nome || aluno.email}
                        respondida={Boolean(leitura.respondida_em)}
                      />
                    </div>
                  )}
                {leitura?.respostas && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", color: "var(--lime)" }}>
                      Respostas do material
                    </summary>
                    <div style={{ marginTop: 6 }}>
                      {Object.entries(leitura.respostas)
                        .filter(([chave, valor]) => chave !== "origem" && String(valor ?? "").trim())
                        .map(([chave, valor]) => (
                          <p key={chave} style={{ margin: "6px 0" }}>
                            <strong style={{ color: "var(--off, #f4f7ee)" }}>
                              {ROTULOS_RESPOSTAS[chave] ?? chave}:
                            </strong>{" "}
                            {String(valor)}
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
      </div>
      <PaginacaoLeituras
        paginacao={paginacao}
        paginaParametro={paginaParametro}
        quantidadeParametro={quantidadeParametro}
        entidadeSingular="aluno"
        entidadePlural={entidadePlural}
      />
    </>
  );
}

export default async function LeiturasPage({ searchParams }: Props) {
  if (!(await canAccessAdminArea())) return null;

  const params = await searchParams;
  const etapaParam = Array.isArray(params.etapa) ? params.etapa[0] : params.etapa;
  const etapaSelecionada = semanaValida(etapaParam) ? etapaParam : "semana-0";
  const paginaEtapa = paginaDoParametro(params.paginaEtapa);
  const porPaginaEtapa = itensPorPaginaDoParametro(params.porPaginaEtapa);
  const paginaEventos = paginaDoParametro(params.paginaEventos);
  const porPaginaEventos = itensPorPaginaDoParametro(params.porPaginaEventos);
  const inicioEventos = (paginaEventos - 1) * porPaginaEventos;
  const db = privilegedDatabase();
  const [
    rMateriais,
    rAlunos,
    rLeituras,
    rAcessos,
    rQuests,
    rDuvidas,
  ] = await Promise.all([
    db.from("downloads").select("id, tag, titulo, ordem").eq("modo", "leitura").order("ordem"),
    db.from("whitelist").select("email, nome").order("email"),
    db
      .from("leituras")
      .select(
        "download_id, email, segundos, status, duvida, duvida_html, respondida_em, respostas, ultimo_acesso",
      ),
    db
      .from("curso_acessos")
      .select("email, semana_key, aberturas, segundos, primeiro_acesso, ultimo_acesso"),
    db
      .from("quest_respostas")
      .select("email, semana_key, quest_key, status, enviada_em, revisada_em, atualizado_em"),
    db.from("curso_duvidas").select("email, semana_key, status, criada_em"),
  ]);

  const alunos = (rAlunos.data ?? []) as Aluno[];
  const rEventos =
    alunos.length > 0
        ? await db
          .from("eventos")
          .select("id, email, tipo, alvo, ref, criado_em", { count: "exact" })
          .in("tipo", TIPOS_EVENTO_APRENDIZAGEM)
          .in(
            "email",
            alunos.map((aluno) => aluno.email),
          )
          .order("criado_em", { ascending: false })
          .order("id", { ascending: false })
          .range(inicioEventos, inicioEventos + porPaginaEventos - 1)
      : { data: [], count: 0, error: null };

  for (const [nome, resultado] of [
    ["materiais", rMateriais],
    ["alunos", rAlunos],
    ["leituras de materiais", rLeituras],
    ["acessos às etapas", rAcessos],
    ["Quests", rQuests],
    ["dúvidas", rDuvidas],
    ["eventos", rEventos],
  ] as const) {
    if (resultado.error) {
      console.error(`Leituras: consulta de ${nome} falhou:`, resultado.error.message);
    }
  }

  const materiais = (rMateriais.data ?? []) as Material[];
  const leituras = (rLeituras.data ?? []) as Leitura[];
  const acessos = (rAcessos.data ?? []) as AcessoEtapa[];
  const quests = (rQuests.data ?? []) as QuestResumo[];
  const duvidas = (rDuvidas.data ?? []) as DuvidaResumo[];
  const eventos = (rEventos.data ?? []) as Evento[];
  const paginacaoEtapa = calcularPaginacao(alunos.length, paginaEtapa, porPaginaEtapa);
  const paginacaoEventos = calcularPaginacao(
    rEventos.count ?? eventos.length,
    paginaEventos,
    porPaginaEventos,
  );
  const alunosDaPagina = alunos.slice(paginacaoEtapa.offset, paginacaoEtapa.fim);

  const acessoPorAluno = new Map(
    acessos.map((acesso) => [`${acesso.semana_key}:${acesso.email}`, acesso] as const),
  );
  const leiturasPorChave = new Map(
    leituras.map((leitura) => [`${leitura.download_id}:${leitura.email}`, leitura] as const),
  );
  const nomesPorEmail = new Map(alunos.map((aluno) => [aluno.email, aluno.nome] as const));
  const materiaisPorId = new Map(materiais.map((material) => [material.id, material.titulo] as const));

  const questsDaEtapa = quests.filter((quest) => quest.semana_key === etapaSelecionada);
  const duvidasDaEtapa = duvidas.filter((duvida) => duvida.semana_key === etapaSelecionada);
  const acessaram = alunos.filter((aluno) =>
    acessoPorAluno.has(`${etapaSelecionada}:${aluno.email}`),
  ).length;
  const entregaram = new Set(
    questsDaEtapa
      .filter((quest) => quest.status === "enviada" || quest.status === "revisada")
      .map((quest) => quest.email),
  ).size;
  const totalAtividades = ATIVIDADES_POR_SEMANA[etapaSelecionada].length;

  return (
    <main>
      <h1>Leituras e atividade</h1>
      <p className="sub">
        Acompanhe separadamente as etapas da Imersão, os formulários concluídos e os materiais da
        Biblioteca. O tempo considera apenas os períodos em que a página ficou visível na tela.
      </p>

      <section aria-labelledby="atividade-etapas">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="pill">Imersão</span>
            <h2 id="atividade-etapas" style={{ marginTop: 10 }}>
              Atividade nas etapas
            </h2>
          </div>
          <p className="muted" style={{ maxWidth: 680 }}>
            A medição de abertura e tempo começa a partir desta atualização. Entregas anteriores
            continuam visíveis como atividade registrada, sem inventar tempo retroativo.
          </p>
        </div>

        <nav className="linha-acoes" aria-label="Escolher etapa" style={{ margin: "14px 0" }}>
          {SEMANA_KEYS.map((semanaKey, indice) => (
            <Link
              key={semanaKey}
              href={`/admin/leituras?etapa=${semanaKey}`}
              className={
                semanaKey === etapaSelecionada ? "btn btn-mini" : "btn btn-fantasma btn-mini"
              }
              aria-current={semanaKey === etapaSelecionada ? "page" : undefined}
            >
              {rotuloEtapa(indice)}
            </Link>
          ))}
        </nav>

        <div className="card" style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <strong>{rotuloEtapa(SEMANA_KEYS.indexOf(etapaSelecionada))}</strong>
            <span className="muted">
              {acessaram}/{alunos.length} com acesso medido · {entregaram} com entrega ·{" "}
              {duvidasDaEtapa.length} {duvidasDaEtapa.length === 1 ? "dúvida" : "dúvidas"}
            </span>
          </div>

          {alunos.length === 0 ? (
            <p className="muted" style={{ marginTop: 14 }}>
              Nenhum aluno na turma ainda.
            </p>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
              <table style={{ marginTop: 12, minWidth: 880 }}>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Acesso à etapa</th>
                    <th>Tempo visível</th>
                    <th>Entrega</th>
                    <th>Dúvidas</th>
                    <th>Última atividade</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosDaPagina.map((aluno) => {
                    const acesso = acessoPorAluno.get(`${etapaSelecionada}:${aluno.email}`);
                    const questsAluno = questsDaEtapa.filter((quest) => quest.email === aluno.email);
                    const duvidasAluno = duvidasDaEtapa.filter(
                      (duvida) => duvida.email === aluno.email,
                    );
                    const temInteracao = questsAluno.length > 0 || duvidasAluno.length > 0;
                    const ultimaAtividade = maiorData([
                      acesso?.ultimo_acesso,
                      ...questsAluno.map((quest) => quest.atualizado_em),
                      ...duvidasAluno.map((duvida) => duvida.criada_em),
                    ]);

                    return (
                      <tr key={aluno.email}>
                        <td>
                          {aluno.nome || aluno.email}
                          {aluno.nome && <div className="muted">{aluno.email}</div>}
                        </td>
                        <td>
                          {acesso ? (
                            <span className="pill">
                              {acesso.aberturas} {acesso.aberturas === 1 ? "abertura" : "aberturas"}
                            </span>
                          ) : temInteracao ? (
                            <span className="pill" title="Interação anterior à medição de acesso">
                              Atividade registrada
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>{acesso ? formataTempo(acesso.segundos) : "—"}</td>
                        <td>
                          <span className={questsAluno.length > 0 ? "pill" : "muted"}>
                            {rotuloEntrega(questsAluno, totalAtividades)}
                          </span>
                        </td>
                        <td>{rotuloDuvidas(duvidasAluno)}</td>
                        <td className="muted">{dataHoraBr(ultimaAtividade)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <PaginacaoLeituras
                paginacao={paginacaoEtapa}
                paginaParametro="paginaEtapa"
                quantidadeParametro="porPaginaEtapa"
                entidadeSingular="aluno"
                entidadePlural="alunos da etapa"
              />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="eventos-recentes" style={{ marginBottom: 34 }}>
        <span className="pill">Eventos</span>
        <h2 id="eventos-recentes" style={{ marginTop: 10 }}>
          Atividade recente
        </h2>
        <div className="card">
          {eventos.length === 0 ? (
            <p className="muted">Nenhum evento de aprendizagem registrado ainda.</p>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Evento</th>
                      <th>Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((evento) => (
                      <tr key={evento.id}>
                        <td>
                          {nomesPorEmail.get(evento.email) || evento.email}
                          {nomesPorEmail.get(evento.email) && (
                            <div className="muted">{evento.email}</div>
                          )}
                        </td>
                        <td>{rotuloEvento(evento, materiaisPorId)}</td>
                        <td className="muted">{dataHoraBr(evento.criado_em)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginacaoLeituras
                paginacao={paginacaoEventos}
                paginaParametro="paginaEventos"
                quantidadeParametro="porPaginaEventos"
                entidadeSingular="evento"
                entidadePlural="eventos"
              />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="leituras-biblioteca">
        <span className="pill">Biblioteca</span>
        <h2 id="leituras-biblioteca" style={{ marginTop: 10 }}>
          Leitura de materiais
        </h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Esta área acompanha apenas os cards cadastrados em Materiais como “Leitura no app”.
          Acessos administrativos de teste ficam separados dos números dos alunos.
        </p>

        {materiais.length === 0 && (
          <div className="vazio card">
            <span className="spark">✦</span>
            Nenhum material no modo leitura ainda. Crie um card em Materiais com o modo “Leitura no
            app” e suba um HTML ou PDF.
          </div>
        )}

        {materiais.map((material) => {
          const emailsAlunos = new Set(alunos.map((aluno) => aluno.email));
          const paginaParametro = `paginaMaterial${material.id}`;
          const quantidadeParametro = `porPaginaMaterial${material.id}`;
          const paginaTesteParametro = `paginaTesteMaterial${material.id}`;
          const quantidadeTesteParametro = `porPaginaTesteMaterial${material.id}`;
          const paginacaoMaterial = calcularPaginacao(
            alunos.length,
            paginaDoParametro(params[paginaParametro]),
            itensPorPaginaDoParametro(params[quantidadeParametro]),
          );
          const linhasAlunos = alunos.map((aluno) => ({
            aluno,
            leitura: leiturasPorChave.get(`${material.id}:${aluno.email}`) ?? null,
          }));
          const linhasTeste = leituras
            .filter(
              (leitura) =>
                leitura.download_id === material.id && !emailsAlunos.has(leitura.email),
            )
            .map((leitura) => ({
              aluno: { email: leitura.email, nome: `${leitura.email} · admin/teste` },
              leitura,
            }));
          const abriram = linhasAlunos.filter((linha) => linha.leitura).length;
          const entenderam = linhasAlunos.filter(
            (linha) => linha.leitura?.status === "entendido",
          ).length;
          const comDuvida = linhasAlunos.filter(
            (linha) => linha.leitura?.status === "duvida",
          ).length;

          return (
            <div className="card" key={material.id} style={{ marginBottom: 14 }}>
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
                  {material.tag && <span className="pill">{material.tag}</span>}{" "}
                  <strong>{material.titulo}</strong>
                </div>
                <span className="muted">
                  {abriram}/{alunos.length} alunos abriram · {entenderam} entenderam · {comDuvida}{" "}
                  com dúvidas
                </span>
              </div>

              <TabelaMaterial
                material={material}
                linhas={linhasAlunos}
                paginacao={paginacaoMaterial}
                paginaParametro={paginaParametro}
                quantidadeParametro={quantidadeParametro}
                entidadePlural={`alunos em ${material.titulo}`}
              />

              {linhasTeste.length > 0 && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ cursor: "pointer", color: "var(--lime)" }}>
                    Acessos de admin/teste ({linhasTeste.length})
                  </summary>
                  <TabelaMaterial
                    material={material}
                    linhas={linhasTeste}
                    paginacao={calcularPaginacao(
                      linhasTeste.length,
                      paginaDoParametro(params[paginaTesteParametro]),
                      itensPorPaginaDoParametro(params[quantidadeTesteParametro]),
                    )}
                    paginaParametro={paginaTesteParametro}
                    quantidadeParametro={quantidadeTesteParametro}
                    entidadePlural={`acessos de teste em ${material.titulo}`}
                  />
                </details>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
