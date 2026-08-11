import { redirect } from "next/navigation";
import { canAccessAdminArea } from "@/lib/auth";
import {
  calcularPaginacao,
  itensPorPaginaDoParametro,
  paginaDoParametro,
  type ParametroBusca,
} from "@/lib/admin-paginacao";
import { rotuloEtapa } from "@/lib/curso-nomenclatura";
import { REGISTRO_FORMULARIOS, type DefinicaoFormulario } from "@/lib/formularios";
import { validarDefinicaoFormulario } from "@/lib/formularios/validacao";
import { privilegedDatabase } from "@/lib/supabase/admin";
import {
  ListaDuvidasAdmin,
  ListaEntregasAdmin,
  type AnexoAdmin,
  type DuvidaAdmin,
  type EntregaAdmin,
  type RespostaAdmin,
} from "./ListasPaginadas";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, ParametroBusca>;

type Props = {
  searchParams: Promise<SearchParams>;
};

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
  respostas: Record<string, unknown> | null;
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
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function rotuloChave(chave: string) {
  const match = /^semana-(\d+)$/.exec(chave);
  return match ? rotuloEtapa(Number(match[1])) : chave;
}

function textoValor(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor;
  if (typeof valor === "object") return JSON.stringify(valor, null, 2);
  return String(valor);
}

function respostasComRotulos(
  valores: Record<string, unknown> | null | undefined,
  formulario?: DefinicaoFormulario | null,
): RespostaAdmin[] {
  const objeto = valores ?? {};
  const chavesDoFormulario = formulario?.campos.map((campo) => campo.chave) ?? [];
  const chaves = [...new Set([...chavesDoFormulario, ...Object.keys(objeto)])];
  return chaves.map((chave) => ({
    chave,
    rotulo: formulario?.campos.find((campo) => campo.chave === chave)?.rotulo ?? chave,
    valor: textoValor(objeto[chave]),
  }));
}

function parametrosParaUrl(parametros: SearchParams) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    const primeiro = Array.isArray(valor) ? valor[0] : valor;
    if (primeiro !== undefined) busca.set(chave, primeiro);
  }
  return busca;
}

function rotuloTotal(total: number, singular: string, plural: string) {
  return `${total} ${total === 1 ? singular : plural}`;
}

export default async function EntregasPage({ searchParams }: Props) {
  if (!(await canAccessAdminArea())) return null;
  const parametros = await searchParams;
  const paginaEntregas = paginaDoParametro(parametros.paginaEntregas);
  const porPaginaEntregas = itensPorPaginaDoParametro(parametros.porPaginaEntregas);
  const paginaDuvidas = paginaDoParametro(parametros.paginaDuvidas);
  const porPaginaDuvidas = itensPorPaginaDoParametro(parametros.porPaginaDuvidas);
  const inicioEntregas = (paginaEntregas - 1) * porPaginaEntregas;
  const inicioDuvidas = (paginaDuvidas - 1) * porPaginaDuvidas;
  const db = privilegedDatabase();

  const [questsResult, duvidasResult, duvidasAbertasResult] = await Promise.all([
    db
      .from("quest_respostas")
      .select(
        "id, email, formulario_versao_id, semana_key, quest_key, respostas, status, enviada_em, revisada_em",
        { count: "exact" },
      )
      .in("status", ["enviada", "revisada"])
      .order("enviada_em", { ascending: false })
      .order("id", { ascending: false })
      .range(inicioEntregas, inicioEntregas + porPaginaEntregas - 1),
    db
      .from("curso_duvidas")
      .select(
        "id, email, formulario_codigo, formulario_versao_id, semana_key, pergunta, respostas, resposta, status, criada_em",
        { count: "exact" },
      )
      .order("criada_em", { ascending: false })
      .order("id", { ascending: false })
      .range(inicioDuvidas, inicioDuvidas + porPaginaDuvidas - 1),
    db
      .from("curso_duvidas")
      .select("id", { count: "exact", head: true })
      .eq("status", "aberta"),
  ]);

  const quests = (questsResult.data ?? []) as Quest[];
  const duvidas = (duvidasResult.data ?? []) as Duvida[];
  const paginacaoEntregas = calcularPaginacao(
    questsResult.count ?? quests.length,
    paginaEntregas,
    porPaginaEntregas,
  );
  const paginacaoDuvidas = calcularPaginacao(
    duvidasResult.count ?? duvidas.length,
    paginaDuvidas,
    porPaginaDuvidas,
  );

  if (
    paginacaoEntregas.pagina !== paginaEntregas ||
    paginacaoDuvidas.pagina !== paginaDuvidas
  ) {
    const busca = parametrosParaUrl(parametros);
    busca.set("paginaEntregas", String(paginacaoEntregas.pagina));
    busca.set("porPaginaEntregas", String(porPaginaEntregas));
    busca.set("paginaDuvidas", String(paginacaoDuvidas.pagina));
    busca.set("porPaginaDuvidas", String(porPaginaDuvidas));
    redirect(`/admin/entregas?${busca.toString()}`);
  }

  const questIdsDaPagina = quests.map((quest) => quest.id);
  let anexos: Anexo[] = [];
  let erroAnexos = false;
  if (questIdsDaPagina.length) {
    const anexosResult = await db
      .from("quest_anexos")
      .select("id, resposta_id, campo, file, nome_original, mime, bytes")
      .in("resposta_id", questIdsDaPagina)
      .eq("status", "pronto")
      .order("criado_em", { ascending: true });
    anexos = (anexosResult.data ?? []) as Anexo[];
    erroAnexos = Boolean(anexosResult.error);
  }

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
  const anexosPorResposta = new Map<string, typeof anexosComUrl>();
  for (const anexo of anexosComUrl) {
    const atuais = anexosPorResposta.get(anexo.resposta_id) ?? [];
    atuais.push(anexo);
    anexosPorResposta.set(anexo.resposta_id, atuais);
  }

  const entregas: EntregaAdmin[] = quests.map((quest) => {
    const versao = quest.formulario_versao_id
      ? versaoPorId.get(quest.formulario_versao_id)
      : undefined;
    const formulario = versao?.definicao ?? REGISTRO_FORMULARIOS.buscar(quest.quest_key);
    const anexosDaQuest = anexosPorResposta.get(quest.id) ?? [];
    const anexosFormatados: AnexoAdmin[] = anexosDaQuest.map((anexo) => ({
      id: anexo.id,
      nome: anexo.nome_original,
      campo:
        formulario?.anexos.find((campo) => campo.chave === anexo.campo)?.rotulo ?? anexo.campo,
      tamanho: tamanho(anexo.bytes),
      url: anexo.url,
    }));
    return {
      id: quest.id,
      email: quest.email,
      titulo: formulario?.titulo ?? quest.quest_key,
      etapa: rotuloChave(quest.semana_key),
      versao: versao?.numero ?? null,
      status: quest.status,
      statusRotulo: quest.status === "revisada" ? "Revisada" : "A revisar",
      enviadaEm: quando(quest.enviada_em),
      revisadaEm: quest.revisada_em ? quando(quest.revisada_em) : null,
      respostas: respostasComRotulos(quest.respostas, formulario),
      anexos: anexosFormatados,
    };
  });

  const duvidasFormatadas: DuvidaAdmin[] = duvidas.map((duvida) => {
    const versao = duvida.formulario_versao_id
      ? versaoPorId.get(duvida.formulario_versao_id)
      : undefined;
    const formulario =
      versao?.definicao ??
      (duvida.formulario_codigo
        ? REGISTRO_FORMULARIOS.buscar(duvida.formulario_codigo)
        : undefined);
    const informacoes = respostasComRotulos(duvida.respostas, formulario).filter(
      (resposta) => resposta.chave !== "pergunta",
    );
    const status =
      duvida.status === "arquivada"
        ? "arquivada"
        : Boolean(duvida.resposta) || duvida.status === "respondida"
          ? "respondida"
          : "aberta";
    const statusRotulo =
      status === "arquivada" ? "Arquivada" : status === "respondida" ? "Respondida" : "Aberta";
    return {
      id: duvida.id,
      email: duvida.email,
      etapa: rotuloChave(duvida.semana_key),
      versao: versao?.numero ?? null,
      status,
      statusRotulo,
      criadaEm: quando(duvida.criada_em),
      pergunta: duvida.pergunta,
      informacoes,
      resposta: duvida.resposta,
    };
  });

  const erro = Boolean(
    questsResult.error ||
      duvidasResult.error ||
      duvidasAbertasResult.error ||
      versoesResult.error ||
      erroAnexos,
  );
  const duvidasAbertas = duvidasAbertasResult.count ?? 0;

  return (
    <main className="admin-entregas">
      <h1>Entregas e dúvidas</h1>
      <p className="sub">Quests enviadas pela turma e perguntas das páginas novas.</p>

      {erro && (
        <p className="aviso erro">
          Não foi possível carregar todas as informações agora. Atualize a página para tentar
          novamente.
        </p>
      )}

      <section aria-labelledby="quests-admin-titulo">
        <div className="secao-cabecalho-admin">
          <div>
            <span className="pill">Quests</span>
            <h2 id="quests-admin-titulo">Entregas recebidas</h2>
          </div>
          <span>{rotuloTotal(paginacaoEntregas.total, "entrega", "entregas")}</span>
        </div>
        <ListaEntregasAdmin itens={entregas} paginacao={paginacaoEntregas} />
      </section>

      <section className="duvidas-admin-secao" aria-labelledby="duvidas-admin-titulo">
        <div className="secao-cabecalho-admin">
          <div>
            <span className="pill">Dúvidas</span>
            <h2 id="duvidas-admin-titulo">Fila de perguntas</h2>
          </div>
          <span>{rotuloTotal(duvidasAbertas, "aberta", "abertas")}</span>
        </div>
        <ListaDuvidasAdmin itens={duvidasFormatadas} paginacao={paginacaoDuvidas} />
      </section>
    </main>
  );
}
