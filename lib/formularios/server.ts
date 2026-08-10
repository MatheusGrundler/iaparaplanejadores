import "server-only";

import type { MemberIdentity } from "@/lib/auth";
import {
  SEMANA_KEYS,
  type Atividade,
  type CampoAnexo,
  type CampoAtividade,
  type SemanaKey,
} from "@/lib/curso-atividades";
import { podeAcessarSemana } from "@/lib/curso-liberacao";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { REGISTRO_FORMULARIOS, FORMULARIOS_INICIAIS } from "./seeds";
import type { DefinicaoFormulario } from "./schema";
import { validarDefinicaoFormulario } from "./validacao";

type LinhaFormulario = {
  id: string;
  codigo: string;
  tipo: "quest" | "duvida";
  etapa_key: SemanaKey;
  arquivado: boolean;
};

export type FormularioPublicado = {
  definicao: DefinicaoFormulario;
  formularioId: string | null;
  versaoId: string | null;
  semanaKey: SemanaKey;
  origem: "banco" | "codigo";
};

function semanaValida(valor: unknown): valor is SemanaKey {
  return typeof valor === "string" && (SEMANA_KEYS as readonly string[]).includes(valor);
}

function semanaDoFormulario(definicao: DefinicaoFormulario): SemanaKey | null {
  const semana = definicao.metadados?.semanaKey;
  return semanaValida(semana) ? semana : null;
}

function codigoPorIdentificador(identificador: string) {
  const porAtividade = FORMULARIOS_INICIAIS.find(
    (formulario) => formulario.metadados?.atividadeKey === identificador,
  );
  return porAtividade?.codigo ?? identificador;
}

/**
 * Resolve primeiro a versão publicada pelo construtor e usa a definição em
 * código como fallback. Assim o deploy das páginas não depende do painel.
 */
export async function carregarFormularioPublicado(
  identificador: string,
): Promise<FormularioPublicado | null> {
  const codigo = codigoPorIdentificador(identificador);
  const db = privilegedDatabase();
  const { data: formulario, error: formularioError } = await db
    .from("curso_formularios")
    .select("id, codigo, tipo, etapa_key, arquivado")
    .eq("codigo", codigo)
    .maybeSingle();

  if (formularioError && formularioError.code !== "PGRST205") {
    console.error("Falha ao carregar identidade do formulário:", formularioError.code);
  }

  const linha = formulario as LinhaFormulario | null;
  if (linha?.arquivado) return null;
  if (linha) {
    const { data: versao, error: versaoError } = await db
      .from("curso_formulario_versoes")
      .select("id, definicao")
      .eq("formulario_id", linha.id)
      .eq("status", "publicado")
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versaoError) {
      console.error("Falha ao carregar versão publicada do formulário:", versaoError.code);
    } else if (versao) {
      const resultado = validarDefinicaoFormulario(versao.definicao);
      if (
        resultado.valido &&
        resultado.definicao.codigo === linha.codigo &&
        resultado.definicao.workflow.tipo === linha.tipo
      ) {
        return {
          definicao: resultado.definicao,
          formularioId: linha.id,
          versaoId: versao.id,
          semanaKey: linha.etapa_key,
          origem: "banco",
        };
      }
      console.error(`Definição publicada inválida para o formulário ${linha.codigo}.`);
    }
  }

  const definicao = REGISTRO_FORMULARIOS.buscar(codigo);
  const semanaKey = definicao ? semanaDoFormulario(definicao) : null;
  if (!definicao || !semanaKey) return null;
  return {
    definicao,
    formularioId: null,
    versaoId: null,
    semanaKey,
    origem: "codigo",
  };
}

export async function resolverFormularioDoUsuario(identity: MemberIdentity, identificador: string) {
  const formulario = await carregarFormularioPublicado(identificador);
  if (!formulario) return null;
  if (!identity.admin && !(await podeAcessarSemana(identity, formulario.semanaKey))) {
    return null;
  }
  return formulario;
}

function campoLegado(campo: DefinicaoFormulario["campos"][number]): CampoAtividade {
  const base = {
    key: campo.chave,
    label: campo.rotulo,
    ajuda: campo.ajuda,
    placeholder: campo.placeholder,
    obrigatorio: campo.obrigatorio,
    min: campo.minimoCaracteres,
    max: campo.maximoCaracteres,
  };
  return campo.tipo === "select"
    ? {
        ...base,
        tipo: "select",
        opcoes: campo.opcoes.map((opcao) => ({
          valor: opcao.valor,
          rotulo: opcao.rotulo,
        })),
      }
    : { ...base, tipo: campo.tipo };
}

function anexoLegado(anexo: DefinicaoFormulario["anexos"][number]): CampoAnexo {
  return {
    key: anexo.chave,
    label: anexo.rotulo,
    ajuda: anexo.ajuda,
    obrigatorio: anexo.obrigatorio,
    aceitaJson: anexo.tiposAceitos.includes("application/json"),
    maxArquivos: anexo.maximoArquivos,
  };
}

export function atividadeDaDefinicao(
  definicao: DefinicaoFormulario,
  semanaKey: SemanaKey,
): Atividade {
  return {
    key: definicao.codigo,
    semanaKey,
    titulo: definicao.titulo,
    descricao: definicao.descricao,
    botao: definicao.rotuloEnvio,
    campos: definicao.campos.map(campoLegado),
    anexos: definicao.anexos.map(anexoLegado),
  };
}

export async function resolverQuestDoUsuario(identity: MemberIdentity, identificador: string) {
  const formulario = await resolverFormularioDoUsuario(identity, identificador);
  if (!formulario || formulario.definicao.workflow.tipo !== "quest") return null;
  return {
    ...formulario,
    atividade: atividadeDaDefinicao(formulario.definicao, formulario.semanaKey),
  };
}
