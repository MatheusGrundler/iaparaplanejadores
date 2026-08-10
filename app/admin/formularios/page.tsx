import Link from "next/link";
import { canAccessAdminArea } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import { FORMULARIOS_INICIAIS, novoFormulario, type DefinicaoFormulario } from "@/lib/formularios";
import { validarDefinicaoFormulario } from "@/lib/formularios/validacao";
import { privilegedDatabase } from "@/lib/supabase/admin";
import EditorFormularioAdmin from "./EditorFormularioAdmin";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Identidade = {
  id: string;
  codigo: string;
  tipo: "quest" | "duvida";
  etapa_key: SemanaKey;
  titulo: string;
  arquivado: boolean;
};

type Versao = {
  id: string;
  formulario_id: string;
  numero: number;
  status: "rascunho" | "publicado" | "arquivado";
  definicao: unknown;
};

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor : undefined;
}

function etapaDaDefinicao(definicao: DefinicaoFormulario): SemanaKey {
  const etapa = definicao.metadados?.semanaKey;
  return typeof etapa === "string" && (SEMANA_KEYS as readonly string[]).includes(etapa)
    ? (etapa as SemanaKey)
    : "semana-0";
}

function definicaoValida(valor: unknown) {
  const resultado = validarDefinicaoFormulario(valor);
  return resultado.valido ? resultado.definicao : null;
}

export default async function FormulariosAdminPage({ searchParams }: Props) {
  if (!(await canAccessAdminArea())) return null;

  const parametros = await searchParams;
  const codigoSelecionado = texto(parametros.codigo);
  const novoTipo = texto(parametros.novo);
  const db = privilegedDatabase();
  const [{ data: identidadesData }, { data: versoesData }] = await Promise.all([
    db
      .from("curso_formularios")
      .select("id, codigo, tipo, etapa_key, titulo, arquivado")
      .order("codigo"),
    db
      .from("curso_formulario_versoes")
      .select("id, formulario_id, numero, status, definicao")
      .order("numero", { ascending: false }),
  ]);
  const identidades = (identidadesData ?? []) as Identidade[];
  const versoes = (versoesData ?? []) as Versao[];
  const identidadePorCodigo = new Map(identidades.map((item) => [item.codigo, item]));
  const codigos = [
    ...new Set([
      ...FORMULARIOS_INICIAIS.map((item) => item.codigo),
      ...identidades.map((item) => item.codigo),
    ]),
  ].sort();

  let inicial: DefinicaoFormulario;
  let etapaInicial: SemanaKey;
  if (novoTipo === "quest" || novoTipo === "duvida") {
    inicial = novoFormulario(novoTipo);
    etapaInicial = "semana-0";
  } else if (codigoSelecionado) {
    const identidade = identidadePorCodigo.get(codigoSelecionado);
    const versoesDoFormulario = identidade
      ? versoes.filter((item) => item.formulario_id === identidade.id)
      : [];
    const rascunho = versoesDoFormulario.find((item) => item.status === "rascunho");
    const ultima = rascunho ?? versoesDoFormulario[0];
    const definidaNoBanco = ultima ? definicaoValida(ultima.definicao) : null;
    const definidaNoCodigo = FORMULARIOS_INICIAIS.find((item) => item.codigo === codigoSelecionado);
    const base = definidaNoBanco ?? definidaNoCodigo ?? novoFormulario();
    const maiorVersao = Math.max(0, ...versoesDoFormulario.map((item) => item.numero));
    inicial = rascunho
      ? base
      : {
          ...base,
          versao: Math.max(base.versao, maiorVersao + 1),
          publicacao: "rascunho",
        };
    etapaInicial = identidade?.etapa_key ?? etapaDaDefinicao(base);
  } else {
    inicial = novoFormulario("quest");
    etapaInicial = "semana-0";
  }

  return (
    <main className="admin-formularios">
      <header className="admin-formularios-hero">
        <div>
          <span className="pill">Construtor</span>
          <h1>Formulários</h1>
          <p className="sub">
            Crie Quests e áreas de dúvidas. Para exibir, copie o código do formulário para a página
            TSX do conteúdo.
          </p>
        </div>
        <div className="admin-formularios-novos">
          <Link className="btn btn-fantasma btn-mini" href="/admin/formularios?novo=duvida">
            Nova dúvida
          </Link>
          <Link className="btn btn-mini" href="/admin/formularios?novo=quest">
            Nova Quest
          </Link>
        </div>
      </header>

      {texto(parametros.salvo) === "1" && (
        <p className="aviso sucesso" role="status">
          Formulário salvo. Se a versão foi publicada, as páginas já usam a definição nova.
        </p>
      )}

      <section className="admin-formularios-catalogo" aria-labelledby="catalogo-formularios">
        <div>
          <h2 id="catalogo-formularios">Catálogo</h2>
          <p>Os itens “em código” continuam funcionando mesmo antes da primeira edição.</p>
        </div>
        <div className="admin-formularios-chips">
          {codigos.map((codigo) => {
            const identidade = identidadePorCodigo.get(codigo);
            const publicada = identidade
              ? versoes.some(
                  (item) => item.formulario_id === identidade.id && item.status === "publicado",
                )
              : false;
            return (
              <Link
                className={codigoSelecionado === codigo ? "ativo" : undefined}
                href={`/admin/formularios?codigo=${encodeURIComponent(codigo)}`}
                key={codigo}
              >
                <strong>{codigo}</strong>
                <span>{publicada ? "Publicado" : "Em código"}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="admin-formularios-embed" aria-label="Código para incorporar">
        <span>Na página de conteúdo</span>
        <code>{`<Formulario codigo="${inicial.codigo}" />`}</code>
      </aside>

      <EditorFormularioAdmin inicial={inicial} etapaInicial={etapaInicial} />
    </main>
  );
}
