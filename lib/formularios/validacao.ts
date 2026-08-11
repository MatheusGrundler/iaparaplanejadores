import {
  FORMULARIO_SCHEMA_VERSION,
  TIPOS_CAMPO_FORMULARIO,
  type AnexoFormulario,
  type CampoAnexoFormulario,
  type DefinicaoFormulario,
  type ValoresFormulario,
} from "./schema";

export type SeveridadeValidacao = "erro" | "aviso";

export type ProblemaDefinicaoFormulario = {
  caminho: string;
  codigo: string;
  mensagem: string;
  severidade: SeveridadeValidacao;
};

export type ResultadoValidacaoDefinicao =
  | {
      valido: true;
      definicao: DefinicaoFormulario;
      problemas: ProblemaDefinicaoFormulario[];
    }
  | { valido: false; problemas: ProblemaDefinicaoFormulario[] };

export type ModoValidacaoEnvio = "rascunho" | "envio";

export type ResultadoValidacaoEnvio = {
  valido: boolean;
  valores: ValoresFormulario;
  errosCampos: Record<string, string>;
  errosAnexos: Record<string, string>;
  errosGerais: string[];
};

const CHAVE_TECNICA = /^[a-z0-9][a-z0-9-_]*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAXIMO_TOTAL_RESPOSTAS = 50_000;
const MIMES_ANEXO_SUPORTADOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/json",
]);

function objeto(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function problema(
  problemas: ProblemaDefinicaoFormulario[],
  caminho: string,
  codigo: string,
  mensagem: string,
  severidade: SeveridadeValidacao = "erro",
) {
  problemas.push({ caminho, codigo, mensagem, severidade });
}

function textoObrigatorio(
  valor: unknown,
  caminho: string,
  maximo: number,
  problemas: ProblemaDefinicaoFormulario[],
) {
  if (typeof valor !== "string" || !valor.trim()) {
    problema(problemas, caminho, "texto_obrigatorio", "Preencha este texto.");
    return;
  }
  if (valor.trim().length > maximo) {
    problema(problemas, caminho, "texto_longo", `Use no máximo ${maximo} caracteres.`);
  }
}

function chaveValida(valor: unknown, caminho: string, problemas: ProblemaDefinicaoFormulario[]) {
  textoObrigatorio(valor, caminho, 100, problemas);
  if (typeof valor === "string" && valor && !CHAVE_TECNICA.test(valor)) {
    problema(
      problemas,
      caminho,
      "chave_invalida",
      "Use letras minúsculas, números, hífen ou sublinhado.",
    );
  }
}

/** Valida a definição antes de registrá-la ou publicá-la. */
export function validarDefinicaoFormulario(valor: unknown): ResultadoValidacaoDefinicao {
  const problemas: ProblemaDefinicaoFormulario[] = [];
  if (!objeto(valor)) {
    return {
      valido: false,
      problemas: [
        {
          caminho: "formulario",
          codigo: "objeto_invalido",
          mensagem: "O formulário precisa ser um objeto.",
          severidade: "erro",
        },
      ],
    };
  }

  if (valor.schemaVersion !== FORMULARIO_SCHEMA_VERSION) {
    problema(
      problemas,
      "schemaVersion",
      "schema_incompativel",
      `Use a versão ${FORMULARIO_SCHEMA_VERSION} do schema.`,
    );
  }
  chaveValida(valor.codigo, "codigo", problemas);
  if (!Number.isInteger(valor.versao) || Number(valor.versao) < 1) {
    problema(problemas, "versao", "versao_invalida", "A versão precisa ser um inteiro positivo.");
  }
  if (!["rascunho", "publicado", "arquivado"].includes(String(valor.publicacao))) {
    problema(problemas, "publicacao", "publicacao_invalida", "Escolha um estado de publicação.");
  }
  textoObrigatorio(valor.titulo, "titulo", 180, problemas);
  textoObrigatorio(valor.descricao, "descricao", 2_000, problemas);
  textoObrigatorio(valor.rotuloEnvio, "rotuloEnvio", 100, problemas);

  if (!objeto(valor.workflow) || !["quest", "duvida"].includes(String(valor.workflow.tipo))) {
    problema(problemas, "workflow", "workflow_invalido", "Escolha Quest ou Dúvida.");
  } else if (valor.workflow.tipo === "quest") {
    if (valor.workflow.multiplicidade !== "unico") {
      problema(
        problemas,
        "workflow.multiplicidade",
        "quest_nao_unica",
        "Quest aceita um único envio ativo.",
      );
    }
    if (!objeto(valor.workflow.rascunho) || valor.workflow.rascunho.autosave !== true) {
      problema(
        problemas,
        "workflow.rascunho",
        "autosave_ausente",
        "Quest precisa manter a configuração de rascunho compatível com esta versão.",
      );
    } else {
      const espera = Number(valor.workflow.rascunho.esperaMs);
      if (!Number.isInteger(espera) || espera < 300 || espera > 10_000) {
        problema(
          problemas,
          "workflow.rascunho.esperaMs",
          "espera_invalida",
          "Use um intervalo de 300 a 10000 ms.",
        );
      }
    }
    if (
      !objeto(valor.workflow.revisao) ||
      valor.workflow.revisao.habilitada !== true ||
      valor.workflow.revisao.bloqueiaEdicao !== true
    ) {
      problema(
        problemas,
        "workflow.revisao",
        "bloqueio_ausente",
        "A revisão da Quest precisa bloquear novas edições.",
      );
    }
  } else {
    if (valor.workflow.multiplicidade !== "multiplo") {
      problema(
        problemas,
        "workflow.multiplicidade",
        "duvida_nao_repetivel",
        "Dúvida precisa aceitar vários envios.",
      );
    }
    if (!objeto(valor.workflow.rascunho) || valor.workflow.rascunho.autosave !== false) {
      problema(
        problemas,
        "workflow.rascunho",
        "rascunho_invalido",
        "Dúvidas precisam manter a configuração de envio direto desta versão.",
      );
    }
    if (!objeto(valor.workflow.resposta) || valor.workflow.resposta.habilitada !== true) {
      problema(
        problemas,
        "workflow.resposta",
        "resposta_ausente",
        "O fluxo de dúvida precisa aceitar resposta.",
      );
    } else {
      textoObrigatorio(
        valor.workflow.resposta.rotuloAutor,
        "workflow.resposta.rotuloAutor",
        100,
        problemas,
      );
    }
  }

  if (!Array.isArray(valor.campos) || valor.campos.length < 1 || valor.campos.length > 40) {
    problema(problemas, "campos", "quantidade_campos", "Use de 1 a 40 campos de resposta.");
  } else {
    valor.campos.forEach((campo, indice) => {
      const caminho = `campos[${indice}]`;
      if (!objeto(campo)) {
        problema(problemas, caminho, "campo_invalido", "Este campo está inválido.");
        return;
      }
      chaveValida(campo.chave, `${caminho}.chave`, problemas);
      textoObrigatorio(campo.rotulo, `${caminho}.rotulo`, 240, problemas);
      if (!TIPOS_CAMPO_FORMULARIO.includes(campo.tipo as never)) {
        problema(
          problemas,
          `${caminho}.tipo`,
          "tipo_campo_invalido",
          "Escolha um tipo de campo aceito.",
        );
      }
      const maximo = Number(campo.maximoCaracteres);
      const minimo = Number(campo.minimoCaracteres ?? 0);
      if (!Number.isInteger(maximo) || maximo < 1 || maximo > 20_000) {
        problema(
          problemas,
          `${caminho}.maximoCaracteres`,
          "maximo_invalido",
          "Use um máximo entre 1 e 20000.",
        );
      }
      if (!Number.isInteger(minimo) || minimo < 0 || minimo > maximo) {
        problema(
          problemas,
          `${caminho}.minimoCaracteres`,
          "minimo_invalido",
          "O mínimo não pode superar o máximo.",
        );
      }
      if (campo.tipo === "select") {
        if (!Array.isArray(campo.opcoes) || campo.opcoes.length < 1 || campo.opcoes.length > 100) {
          problema(problemas, `${caminho}.opcoes`, "opcoes_invalidas", "Inclua de 1 a 100 opções.");
        } else {
          const valores = new Set<string>();
          campo.opcoes.forEach((opcao, opcaoIndice) => {
            const opcaoPath = `${caminho}.opcoes[${opcaoIndice}]`;
            if (!objeto(opcao)) {
              problema(problemas, opcaoPath, "opcao_invalida", "Esta opção está inválida.");
              return;
            }
            chaveValida(opcao.valor, `${opcaoPath}.valor`, problemas);
            textoObrigatorio(opcao.rotulo, `${opcaoPath}.rotulo`, 120, problemas);
            if (typeof opcao.valor === "string") {
              if (valores.has(opcao.valor)) {
                problema(
                  problemas,
                  `${opcaoPath}.valor`,
                  "opcao_duplicada",
                  "Este valor já está em uso.",
                );
              }
              valores.add(opcao.valor);
            }
          });
        }
      }
    });
  }

  if (!Array.isArray(valor.anexos) || valor.anexos.length > 20) {
    problema(problemas, "anexos", "quantidade_anexos", "Use no máximo 20 campos de anexo.");
  } else {
    valor.anexos.forEach((anexo, indice) => {
      const caminho = `anexos[${indice}]`;
      if (!objeto(anexo)) {
        problema(problemas, caminho, "anexo_invalido", "Este campo de anexo está inválido.");
        return;
      }
      chaveValida(anexo.chave, `${caminho}.chave`, problemas);
      textoObrigatorio(anexo.rotulo, `${caminho}.rotulo`, 240, problemas);
      textoObrigatorio(anexo.ajuda, `${caminho}.ajuda`, 1_000, problemas);
      const maximo = Number(anexo.maximoArquivos);
      if (!Number.isInteger(maximo) || maximo < 1 || maximo > 20) {
        problema(
          problemas,
          `${caminho}.maximoArquivos`,
          "maximo_arquivos",
          "Aceite de 1 a 20 arquivos.",
        );
      }
      const bytes = Number(anexo.tamanhoMaximoBytes);
      if (!Number.isInteger(bytes) || bytes < 1 || bytes > 10 * 1024 * 1024) {
        problema(
          problemas,
          `${caminho}.tamanhoMaximoBytes`,
          "tamanho_arquivo",
          "Use um limite de até 10 MB.",
        );
      }
      if (!Array.isArray(anexo.tiposAceitos) || anexo.tiposAceitos.length < 1) {
        problema(
          problemas,
          `${caminho}.tiposAceitos`,
          "tipos_ausentes",
          "Informe ao menos um tipo MIME.",
        );
      } else {
        anexo.tiposAceitos.forEach((mime, mimeIndice) => {
          if (typeof mime !== "string" || !MIMES_ANEXO_SUPORTADOS.has(mime)) {
            problema(
              problemas,
              `${caminho}.tiposAceitos[${mimeIndice}]`,
              "mime_invalido",
              "Use JPEG, PNG, WebP ou JSON.",
            );
          }
        });
      }
    });
  }

  const chaves = [
    ...(Array.isArray(valor.campos)
      ? valor.campos.flatMap((campo) =>
          objeto(campo) && typeof campo.chave === "string" ? [campo.chave] : [],
        )
      : []),
    ...(Array.isArray(valor.anexos)
      ? valor.anexos.flatMap((anexo) =>
          objeto(anexo) && typeof anexo.chave === "string" ? [anexo.chave] : [],
        )
      : []),
  ];
  const vistas = new Set<string>();
  chaves.forEach((chave) => {
    if (vistas.has(chave)) {
      problema(
        problemas,
        "campos",
        "chave_duplicada",
        `A chave “${chave}” aparece mais de uma vez.`,
      );
    }
    vistas.add(chave);
  });

  if (problemas.some((item) => item.severidade === "erro")) {
    return { valido: false, problemas };
  }
  return { valido: true, definicao: valor as DefinicaoFormulario, problemas };
}

function urlValida(valor: string) {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Valida e normaliza um rascunho ou envio final. */
export function validarEnvioFormulario(
  definicao: DefinicaoFormulario,
  entrada: unknown,
  anexos: readonly AnexoFormulario[],
  modo: ModoValidacaoEnvio,
): ResultadoValidacaoEnvio {
  const bruto = objeto(entrada) ? entrada : {};
  const valores: ValoresFormulario = {};
  const errosCampos: Record<string, string> = {};
  const errosAnexos: Record<string, string> = {};
  const errosGerais: string[] = [];

  for (const campo of definicao.campos) {
    const original = bruto[campo.chave];
    const valor = typeof original === "string" ? original.trim() : "";
    valores[campo.chave] = valor;

    if (modo === "envio" && campo.obrigatorio && !valor) {
      errosCampos[campo.chave] = `Preencha “${campo.rotulo}”.`;
      continue;
    }
    if (!valor) continue;
    if (modo === "envio" && campo.minimoCaracteres && valor.length < campo.minimoCaracteres) {
      errosCampos[campo.chave] = `Escreva ao menos ${campo.minimoCaracteres} caracteres.`;
      continue;
    }
    if (valor.length > campo.maximoCaracteres) {
      errosCampos[campo.chave] = `Use no máximo ${campo.maximoCaracteres} caracteres.`;
      continue;
    }
    if (campo.tipo === "email" && !EMAIL.test(valor)) {
      errosCampos[campo.chave] = "Revise este endereço de e-mail.";
      continue;
    }
    if (campo.tipo === "url" && !urlValida(valor)) {
      errosCampos[campo.chave] = "Use um link completo começando com http:// ou https://.";
      continue;
    }
    if (campo.tipo === "select" && !campo.opcoes.some((opcao) => opcao.valor === valor)) {
      errosCampos[campo.chave] = "Escolha uma das opções disponíveis.";
    }
  }

  if (JSON.stringify(valores).length > MAXIMO_TOTAL_RESPOSTAS) {
    errosGerais.push("As respostas juntas ultrapassaram o limite do formulário.");
  }

  for (const campo of definicao.anexos) {
    const arquivos = anexos.filter((anexo) => anexo.campo === campo.chave);
    if (modo === "envio" && campo.obrigatorio && arquivos.length === 0) {
      errosAnexos[campo.chave] = `Envie “${campo.rotulo}”.`;
      continue;
    }
    if (arquivos.length > campo.maximoArquivos) {
      errosAnexos[campo.chave] = `Este campo aceita até ${campo.maximoArquivos} arquivo(s).`;
      continue;
    }
    if (
      arquivos.some(
        (arquivo) =>
          arquivo.bytes < 1 ||
          arquivo.bytes > campo.tamanhoMaximoBytes ||
          !campo.tiposAceitos.includes(arquivo.mime),
      )
    ) {
      errosAnexos[campo.chave] = "Um dos arquivos não atende aos limites deste campo.";
    }
  }

  return {
    valido:
      Object.keys(errosCampos).length === 0 &&
      Object.keys(errosAnexos).length === 0 &&
      errosGerais.length === 0,
    valores,
    errosCampos,
    errosAnexos,
    errosGerais,
  };
}

export function validarArquivoFormulario(
  campo: CampoAnexoFormulario,
  arquivo: Pick<File, "name" | "type" | "size">,
  quantidadeAtual: number,
): string | null {
  if (quantidadeAtual >= campo.maximoArquivos) {
    return `“${campo.rotulo}” já chegou ao limite de arquivos.`;
  }
  if (!campo.tiposAceitos.includes(arquivo.type.toLowerCase())) {
    return `“${arquivo.name}” está em um formato não aceito.`;
  }
  if (arquivo.size < 1 || arquivo.size > campo.tamanhoMaximoBytes) {
    const megabytes = Math.max(1, Math.round(campo.tamanhoMaximoBytes / 1024 / 1024));
    return `“${arquivo.name}” precisa ter até ${megabytes} MB.`;
  }
  return null;
}
