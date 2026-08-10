import {
  estadoVazio,
  formularioBloqueado,
  type AnexoFormulario,
  type DefinicaoFormulario,
  type EstadoFormulario,
  type RegistroEnvioFormulario,
} from "./schema";
import {
  ErroRuntimeFormulario,
  ordenarHistorico,
  type ContextoRuntimeFormulario,
  type FormularioRuntimeAdapter,
} from "./runtime";
import { validarArquivoFormulario, validarEnvioFormulario } from "./validacao";

type OpcoesAdaptadorMemoria = {
  agora?: () => Date;
  gerarId?: () => string;
};

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function idAleatorio() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function chaveDaSessao(definicao: DefinicaoFormulario, contexto?: ContextoRuntimeFormulario) {
  const explicita = contexto?.chaveSessao;
  if (typeof explicita === "string" && explicita) return `${definicao.codigo}:${explicita}`;
  const serializado = Object.entries(contexto ?? {})
    .filter(([, valor]) => valor !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valor]) => `${chave}=${String(valor)}`)
    .join("&");
  return `${definicao.codigo}:${serializado || "padrao"}`;
}

/**
 * Adapter sem persistência externa, útil para prévias, testes e Storybook.
 * O estado dura enquanto a instância existir.
 */
export function criarAdaptadorFormularioEmMemoria(
  opcoes: OpcoesAdaptadorMemoria = {},
): FormularioRuntimeAdapter {
  const estados = new Map<string, EstadoFormulario>();
  const agora = opcoes.agora ?? (() => new Date());
  const gerarId = opcoes.gerarId ?? idAleatorio;

  function ler(definicao: DefinicaoFormulario, contexto?: ContextoRuntimeFormulario) {
    return clonar(estados.get(chaveDaSessao(definicao, contexto)) ?? estadoVazio(definicao));
  }

  function gravar(
    definicao: DefinicaoFormulario,
    estado: EstadoFormulario,
    contexto?: ContextoRuntimeFormulario,
  ) {
    estados.set(chaveDaSessao(definicao, contexto), clonar(estado));
    return clonar(estado);
  }

  return {
    async carregar({ definicao, contexto }) {
      return ler(definicao, contexto);
    },

    async salvarRascunho({ definicao, estado, contexto }) {
      if (definicao.workflow.tipo !== "quest") {
        throw new ErroRuntimeFormulario("Este formulário não usa rascunho automático.", {
          codigo: "rascunho_indisponivel",
        });
      }
      if (formularioBloqueado(definicao, estado)) {
        throw new ErroRuntimeFormulario("Esta Quest já foi revisada.", {
          codigo: "formulario_bloqueado",
          status: 409,
        });
      }
      const validacao = validarEnvioFormulario(
        definicao,
        estado.atual.valores,
        estado.atual.anexos,
        "rascunho",
      );
      if (!validacao.valido) {
        throw new ErroRuntimeFormulario(
          Object.values(validacao.errosCampos)[0] ??
            validacao.errosGerais[0] ??
            "Rascunho inválido.",
          { codigo: "rascunho_invalido" },
        );
      }
      const instante = agora().toISOString();
      return gravar(
        definicao,
        {
          ...estado,
          atual: {
            ...estado.atual,
            id: estado.atual.id ?? gerarId(),
            status: estado.atual.status === "enviado" ? "enviado" : "rascunho",
            valores: validacao.valores,
            atualizadoEm: instante,
          },
        },
        contexto,
      );
    },

    async enviar({ definicao, estado, contexto }) {
      if (formularioBloqueado(definicao, estado)) {
        throw new ErroRuntimeFormulario("Esta Quest já foi revisada.", {
          codigo: "formulario_bloqueado",
          status: 409,
        });
      }
      const validacao = validarEnvioFormulario(
        definicao,
        estado.atual.valores,
        estado.atual.anexos,
        "envio",
      );
      if (!validacao.valido) {
        throw new ErroRuntimeFormulario(
          Object.values(validacao.errosCampos)[0] ??
            Object.values(validacao.errosAnexos)[0] ??
            validacao.errosGerais[0] ??
            "Revise o formulário.",
          { codigo: "envio_invalido", status: 400 },
        );
      }

      const instante = agora().toISOString();
      const id = estado.atual.id ?? gerarId();
      if (definicao.workflow.tipo === "quest") {
        return gravar(
          definicao,
          {
            ...estado,
            atual: {
              ...estado.atual,
              id,
              status: "enviado",
              valores: validacao.valores,
              atualizadoEm: instante,
            },
          },
          contexto,
        );
      }

      const registro: RegistroEnvioFormulario = {
        id,
        codigoFormulario: definicao.codigo,
        versaoFormulario: definicao.versao,
        status: "aberto",
        valores: validacao.valores,
        anexos: estado.atual.anexos,
        criadoEm: instante,
        atualizadoEm: instante,
      };
      return gravar(
        definicao,
        {
          atual: estadoVazio(definicao).atual,
          historico: ordenarHistorico([registro, ...estado.historico]),
        },
        contexto,
      );
    },

    async adicionarAnexo({ definicao, estado, campo, arquivo, contexto }) {
      if (formularioBloqueado(definicao, estado)) {
        throw new ErroRuntimeFormulario("Este formulário está bloqueado.", {
          codigo: "formulario_bloqueado",
          status: 409,
        });
      }
      const quantidade = estado.atual.anexos.filter((item) => item.campo === campo.chave).length;
      const erro = validarArquivoFormulario(campo, arquivo, quantidade);
      if (erro)
        throw new ErroRuntimeFormulario(erro, {
          codigo: "anexo_invalido",
          status: 400,
        });
      const anexo: AnexoFormulario = {
        id: gerarId(),
        campo: campo.chave,
        nome: arquivo.name,
        mime: arquivo.type.toLowerCase(),
        bytes: arquivo.size,
        url: null,
      };
      return gravar(
        definicao,
        {
          ...estado,
          atual: {
            ...estado.atual,
            id: estado.atual.id ?? gerarId(),
            status: estado.atual.status === "novo" ? "rascunho" : estado.atual.status,
            anexos: [...estado.atual.anexos, anexo],
            atualizadoEm: agora().toISOString(),
          },
        },
        contexto,
      );
    },

    async removerAnexo({ definicao, estado, anexoId, contexto }) {
      if (formularioBloqueado(definicao, estado)) {
        throw new ErroRuntimeFormulario("Este formulário está bloqueado.", {
          codigo: "formulario_bloqueado",
          status: 409,
        });
      }
      return gravar(
        definicao,
        {
          ...estado,
          atual: {
            ...estado.atual,
            anexos: estado.atual.anexos.filter((item) => item.id !== anexoId),
            atualizadoEm: agora().toISOString(),
          },
        },
        contexto,
      );
    },

    async responder({ definicao, registroId, texto, autor, contexto }) {
      if (definicao.workflow.tipo !== "duvida") {
        throw new ErroRuntimeFormulario("Somente dúvidas recebem resposta.", {
          codigo: "resposta_indisponivel",
        });
      }
      const atual = ler(definicao, contexto);
      const instante = agora().toISOString();
      const historico = atual.historico.map((registro) =>
        registro.id === registroId
          ? {
              ...registro,
              status: "respondido" as const,
              resposta: { texto: texto.trim(), autor, respondidaEm: instante },
              atualizadoEm: instante,
            }
          : registro,
      );
      if (!historico.some((registro) => registro.id === registroId)) {
        throw new ErroRuntimeFormulario("Dúvida não encontrada.", {
          codigo: "registro_nao_encontrado",
          status: 404,
        });
      }
      return gravar(definicao, { ...atual, historico }, contexto);
    },

    async revisar({ definicao, registroId, contexto }) {
      if (definicao.workflow.tipo !== "quest") {
        throw new ErroRuntimeFormulario("Somente Quests passam por revisão.", {
          codigo: "revisao_indisponivel",
        });
      }
      const atual = ler(definicao, contexto);
      if (registroId && atual.atual.id !== registroId) {
        throw new ErroRuntimeFormulario("Quest não encontrada.", {
          codigo: "registro_nao_encontrado",
          status: 404,
        });
      }
      return gravar(
        definicao,
        {
          ...atual,
          atual: {
            ...atual.atual,
            status: "revisado",
            atualizadoEm: agora().toISOString(),
          },
        },
        contexto,
      );
    },
  };
}
