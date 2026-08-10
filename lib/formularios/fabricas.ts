import {
  FORMULARIO_SCHEMA_VERSION,
  workflowDuvida,
  workflowQuest,
  type CampoAnexoFormulario,
  type CampoFormulario,
  type DefinicaoFormulario,
  type TipoCampoFormulario,
  type WorkflowFormulario,
} from "./schema";

export function chaveFormulario(valor: string, fallback = "formulario") {
  const normalizada = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return normalizada || fallback;
}

export function novoCampoFormulario(
  indice: number,
  tipo: TipoCampoFormulario = "textarea",
): CampoFormulario {
  const base = {
    chave: `campo-${indice + 1}`,
    rotulo: "Novo campo",
    ajuda: "",
    placeholder: "",
    obrigatorio: false,
    minimoCaracteres: 0,
    maximoCaracteres: tipo === "textarea" ? 2_000 : 240,
  };
  if (tipo === "select") {
    return {
      ...base,
      tipo,
      opcoes: [{ valor: "opcao-1", rotulo: "Opção 1" }],
    };
  }
  return { ...base, tipo };
}

export function novoAnexoFormulario(indice: number): CampoAnexoFormulario {
  return {
    chave: `anexo-${indice + 1}`,
    rotulo: "Novo anexo",
    ajuda: "Explique o que deve ser enviado e lembre o aluno de retirar dados pessoais.",
    obrigatorio: false,
    maximoArquivos: 1,
    tamanhoMaximoBytes: 10 * 1024 * 1024,
    tiposAceitos: ["image/jpeg", "image/png", "image/webp"],
  };
}

export function novoFormulario(tipo: WorkflowFormulario["tipo"] = "quest"): DefinicaoFormulario {
  return {
    schemaVersion: FORMULARIO_SCHEMA_VERSION,
    codigo: "novo-formulario",
    versao: 1,
    publicacao: "rascunho",
    titulo: tipo === "quest" ? "Nova Quest" : "Nova área de dúvidas",
    descricao:
      tipo === "quest"
        ? "Explique o que o aluno precisa registrar ou entregar."
        : "Conte onde você travou e o que já tentou.",
    rotuloEnvio: tipo === "quest" ? "Enviar Quest" : "Enviar dúvida",
    workflow: tipo === "quest" ? workflowQuest() : workflowDuvida(),
    campos: [novoCampoFormulario(0)],
    anexos: [],
  };
}

export function trocarTipoCampo(
  campo: CampoFormulario,
  tipo: TipoCampoFormulario,
): CampoFormulario {
  const base = {
    chave: campo.chave,
    rotulo: campo.rotulo,
    ajuda: campo.ajuda,
    placeholder: campo.placeholder,
    obrigatorio: campo.obrigatorio,
    minimoCaracteres: campo.minimoCaracteres,
    maximoCaracteres: campo.maximoCaracteres,
  };
  if (tipo === "select") {
    return {
      ...base,
      tipo,
      opcoes:
        campo.tipo === "select" && campo.opcoes.length
          ? campo.opcoes
          : [{ valor: "opcao-1", rotulo: "Opção 1" }],
    };
  }
  return { ...base, tipo };
}
