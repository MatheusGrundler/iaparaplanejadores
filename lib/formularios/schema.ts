export const FORMULARIO_SCHEMA_VERSION = 1 as const;

export const TIPOS_CAMPO_FORMULARIO = ["text", "email", "url", "textarea", "select"] as const;

export type TipoCampoFormulario = (typeof TIPOS_CAMPO_FORMULARIO)[number];
export type PublicacaoFormulario = "rascunho" | "publicado" | "arquivado";

export type OpcaoFormulario = {
  valor: string;
  rotulo: string;
};

type CampoBase = {
  chave: string;
  rotulo: string;
  ajuda?: string;
  placeholder?: string;
  obrigatorio?: boolean;
  minimoCaracteres?: number;
  maximoCaracteres: number;
};

export type CampoTextoFormulario = CampoBase & {
  tipo: Exclude<TipoCampoFormulario, "select">;
  opcoes?: never;
};

export type CampoSelecaoFormulario = CampoBase & {
  tipo: "select";
  opcoes: readonly OpcaoFormulario[];
};

export type CampoFormulario = CampoTextoFormulario | CampoSelecaoFormulario;

export type CampoAnexoFormulario = {
  chave: string;
  rotulo: string;
  ajuda: string;
  obrigatorio?: boolean;
  maximoArquivos: number;
  tamanhoMaximoBytes: number;
  tiposAceitos: readonly string[];
};

export type WorkflowQuest = {
  tipo: "quest";
  multiplicidade: "unico";
  /** Campo legado mantido para definições publicadas na versão 1 do schema. */
  rascunho: {
    autosave: true;
    esperaMs: number;
  };
  envio: {
    permiteReenvioAntesDaRevisao: boolean;
  };
  revisao: {
    habilitada: true;
    bloqueiaEdicao: true;
  };
};

export type WorkflowDuvida = {
  tipo: "duvida";
  multiplicidade: "multiplo";
  rascunho: {
    autosave: false;
  };
  resposta: {
    habilitada: true;
    rotuloAutor: string;
  };
};

export type WorkflowFormulario = WorkflowQuest | WorkflowDuvida;

export type ValorMetadadoFormulario = string | number | boolean | null;

/**
 * Definição imutável de uma versão de formulário.
 *
 * `codigo` identifica o formulário nas páginas em código. `versao` identifica
 * exatamente o schema usado por uma resposta já enviada.
 */
export type DefinicaoFormulario = {
  schemaVersion: typeof FORMULARIO_SCHEMA_VERSION;
  codigo: string;
  versao: number;
  publicacao: PublicacaoFormulario;
  titulo: string;
  descricao: string;
  rotuloEnvio: string;
  workflow: WorkflowFormulario;
  campos: readonly CampoFormulario[];
  anexos: readonly CampoAnexoFormulario[];
  metadados?: Readonly<Record<string, ValorMetadadoFormulario>>;
};

export type ValoresFormulario = Record<string, string>;

export type AnexoFormulario = {
  id: string;
  campo: string;
  nome: string;
  mime: string;
  bytes: number;
  url: string | null;
};

export type StatusEnvioFormulario =
  "novo" | "rascunho" | "enviado" | "revisado" | "aberto" | "respondido";

export type RespostaFormulario = {
  texto: string;
  autor: string;
  respondidaEm: string;
};

export type RegistroEnvioFormulario = {
  id: string;
  codigoFormulario: string;
  versaoFormulario: number;
  status: Exclude<StatusEnvioFormulario, "novo" | "rascunho">;
  valores: ValoresFormulario;
  anexos: readonly AnexoFormulario[];
  criadoEm: string;
  atualizadoEm: string;
  resposta?: RespostaFormulario;
};

export type EstadoAtualFormulario = {
  id?: string;
  status: StatusEnvioFormulario;
  valores: ValoresFormulario;
  anexos: readonly AnexoFormulario[];
  atualizadoEm?: string;
};

export type EstadoFormulario = {
  atual: EstadoAtualFormulario;
  historico: readonly RegistroEnvioFormulario[];
};

export function workflowQuest(esperaMs = 900): WorkflowQuest {
  return {
    tipo: "quest",
    multiplicidade: "unico",
    rascunho: { autosave: true, esperaMs },
    envio: { permiteReenvioAntesDaRevisao: true },
    revisao: { habilitada: true, bloqueiaEdicao: true },
  };
}

export function workflowDuvida(rotuloAutor = "Resposta da equipe"): WorkflowDuvida {
  return {
    tipo: "duvida",
    multiplicidade: "multiplo",
    rascunho: { autosave: false },
    resposta: { habilitada: true, rotuloAutor },
  };
}

export function valoresVazios(definicao: DefinicaoFormulario): ValoresFormulario {
  return Object.fromEntries(definicao.campos.map((campo) => [campo.chave, ""]));
}

export function estadoVazio(definicao: DefinicaoFormulario): EstadoFormulario {
  return {
    atual: {
      status: "novo",
      valores: valoresVazios(definicao),
      anexos: [],
    },
    historico: [],
  };
}

export function formularioBloqueado(
  definicao: DefinicaoFormulario,
  estado: EstadoFormulario,
): boolean {
  return definicao.workflow.tipo === "quest" && estado.atual.status === "revisado";
}
