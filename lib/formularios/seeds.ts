import {
  ATIVIDADES,
  type Atividade,
  type CampoAtividade,
  type SemanaKey,
} from "@/lib/curso-atividades";
import { RegistroFormularios } from "./registro";
import {
  FORMULARIO_SCHEMA_VERSION,
  workflowDuvida,
  workflowQuest,
  type CampoFormulario,
  type DefinicaoFormulario,
} from "./schema";

const CODIGOS_QUEST: ReadonlyArray<{
  atividadeKey: keyof typeof ATIVIDADES;
  codigo: string;
}> = [
  { atividadeKey: "semana-0-preparacao", codigo: "quest-preparacao-agente" },
  { atividadeKey: "semana-1-quest", codigo: "quest-etapa-1" },
  { atividadeKey: "semana-2-quest", codigo: "quest-etapa-2" },
  { atividadeKey: "semana-3-quest", codigo: "quest-etapa-3" },
  { atividadeKey: "semana-4-quest", codigo: "quest-etapa-4" },
] as const;

function campoAtual(campo: CampoAtividade): CampoFormulario {
  const base = {
    chave: campo.key,
    rotulo: campo.label,
    ajuda: campo.ajuda,
    placeholder: campo.placeholder,
    obrigatorio: campo.obrigatorio,
    minimoCaracteres: campo.min,
    maximoCaracteres: campo.max,
  };
  return campo.tipo === "select"
    ? {
        ...base,
        tipo: "select",
        opcoes: (campo.opcoes ?? []).map((opcao) => ({
          valor: opcao.valor,
          rotulo: opcao.rotulo,
        })),
      }
    : { ...base, tipo: campo.tipo };
}

/** Converte uma atividade atual sem acoplar o novo renderer ao formato legado. */
export function definicaoQuestDeAtividade(
  atividade: Atividade,
  codigo = atividade.key,
): DefinicaoFormulario {
  return {
    schemaVersion: FORMULARIO_SCHEMA_VERSION,
    codigo,
    versao: 1,
    publicacao: "publicado",
    titulo: atividade.titulo,
    descricao: atividade.descricao,
    rotuloEnvio: atividade.botao,
    workflow: workflowQuest(),
    campos: atividade.campos.map(campoAtual),
    anexos: atividade.anexos.map((anexo) => ({
      chave: anexo.key,
      rotulo: anexo.label,
      ajuda: anexo.ajuda,
      obrigatorio: anexo.obrigatorio,
      maximoArquivos: anexo.maxArquivos,
      tamanhoMaximoBytes: 10 * 1024 * 1024,
      tiposAceitos: [
        "image/jpeg",
        "image/png",
        "image/webp",
        ...(anexo.aceitaJson ? ["application/json"] : []),
      ],
    })),
    metadados: {
      origem: "curso-atividades",
      atividadeKey: atividade.key,
      semanaKey: atividade.semanaKey,
    },
  };
}

const CODIGOS_DUVIDA: ReadonlyArray<{ codigo: string; semanaKey: SemanaKey }> = [
  { codigo: "duvida-preparacao", semanaKey: "semana-0" },
  { codigo: "duvida-etapa-1", semanaKey: "semana-1" },
  { codigo: "duvida-etapa-2", semanaKey: "semana-2" },
  { codigo: "duvida-etapa-3", semanaKey: "semana-3" },
  { codigo: "duvida-etapa-4", semanaKey: "semana-4" },
];

function duvidaEtapa(codigo: string, semanaKey: SemanaKey): DefinicaoFormulario {
  return {
    schemaVersion: FORMULARIO_SCHEMA_VERSION,
    codigo,
    versao: 1,
    publicacao: "publicado",
    titulo: "O que ficou travado?",
    descricao:
      "Escreva do seu jeito. A pergunta chega aqui para acompanharmos e pode virar pauta da próxima live de dúvidas.",
    rotuloEnvio: "Enviar dúvida",
    workflow: workflowDuvida("Resposta da equipe"),
    campos: [
      {
        chave: "pergunta",
        rotulo: "Sua dúvida sobre esta etapa",
        tipo: "textarea",
        placeholder: "Em que ponto você parou? O que tentou? O que aconteceu?",
        obrigatorio: true,
        minimoCaracteres: 5,
        maximoCaracteres: 4_000,
      },
    ],
    anexos: [],
    metadados: { origem: "curso-duvidas", semanaKey },
  };
}

/** Seeds em código usados até existir uma fonte versionada definitiva. */
export const FORMULARIOS_INICIAIS: readonly DefinicaoFormulario[] = [
  ...CODIGOS_QUEST.map(({ atividadeKey, codigo }) =>
    definicaoQuestDeAtividade(ATIVIDADES[atividadeKey], codigo),
  ),
  ...CODIGOS_DUVIDA.map(({ codigo, semanaKey }) => duvidaEtapa(codigo, semanaKey)),
];

export const REGISTRO_FORMULARIOS = new RegistroFormularios(FORMULARIOS_INICIAIS);

export const FORMULARIOS_POR_CODIGO = Object.freeze(
  Object.fromEntries(FORMULARIOS_INICIAIS.map((formulario) => [formulario.codigo, formulario])),
) as Readonly<Record<string, DefinicaoFormulario>>;
