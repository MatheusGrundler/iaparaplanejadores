import type { SemanaKey } from "@/lib/curso-atividades";
import {
  estadoVazio,
  type AnexoFormulario,
  type DefinicaoFormulario,
  type EstadoFormulario,
  type RegistroEnvioFormulario,
  type StatusEnvioFormulario,
  type ValoresFormulario,
} from "./schema";
import { ErroRuntimeFormulario, ordenarHistorico, type FormularioRuntimeAdapter } from "./runtime";

type Fetcher = typeof fetch;

type RespostaApi = Record<string, unknown> & {
  ok?: boolean;
  erro?: string;
};

async function jsonDaResposta(resposta: Response): Promise<RespostaApi> {
  const corpo = (await resposta.json().catch(() => null)) as RespostaApi | null;
  if (!resposta.ok || !corpo?.ok) {
    throw new ErroRuntimeFormulario(corpo?.erro || "Não consegui concluir esta ação agora.", {
      codigo: "api_atual",
      status: resposta.status,
    });
  }
  return corpo;
}

function statusQuest(status: string | null | undefined): StatusEnvioFormulario {
  if (status === "revisada" || status === "revisado") return "revisado";
  if (status === "enviada" || status === "enviado") return "enviado";
  if (status === "rascunho") return "rascunho";
  return "novo";
}

type ConfiguracaoQuestAtual = {
  atividadeKey: string;
  respostasIniciais?: ValoresFormulario;
  statusInicial?: string | null;
  anexosIniciais?: readonly AnexoFormulario[];
  respostaIdInicial?: string;
  fetcher?: Fetcher;
};

/** Faz o novo renderizador conversar com as rotas atuais de Quest. */
export function criarAdaptadorQuestAtual(
  configuracao: ConfiguracaoQuestAtual,
): FormularioRuntimeAdapter {
  const fetcher = configuracao.fetcher ?? fetch;
  const endpoint = `/api/curso/atividades/${encodeURIComponent(configuracao.atividadeKey)}`;
  const inicial = {
    atual: {
      id: configuracao.respostaIdInicial,
      status: statusQuest(configuracao.statusInicial),
      valores: configuracao.respostasIniciais ?? {},
      anexos: configuracao.anexosIniciais ?? [],
    },
    historico: [],
  } satisfies EstadoFormulario;

  async function salvar(estado: EstadoFormulario, enviar: boolean) {
    const resposta = await fetcher(endpoint, {
      method: enviar ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respostas: estado.atual.valores }),
    });
    const corpo = await jsonDaResposta(resposta);
    const atividade =
      corpo.atividade && typeof corpo.atividade === "object"
        ? (corpo.atividade as Record<string, unknown>)
        : {};
    return {
      ...estado,
      atual: {
        ...estado.atual,
        id: typeof atividade.id === "string" ? atividade.id : estado.atual.id,
        status: statusQuest(
          typeof atividade.status === "string" ? atividade.status : enviar ? "enviada" : "rascunho",
        ),
        atualizadoEm:
          typeof atividade.atualizado_em === "string"
            ? atividade.atualizado_em
            : new Date().toISOString(),
      },
    } satisfies EstadoFormulario;
  }

  return {
    async carregar({ definicao }) {
      const vazio = estadoVazio(definicao);
      return structuredClone({
        ...inicial,
        atual: {
          ...inicial.atual,
          valores: { ...vazio.atual.valores, ...inicial.atual.valores },
        },
      });
    },
    async salvarRascunho({ estado }) {
      return salvar(estado, false);
    },
    async enviar({ estado }) {
      return salvar(estado, true);
    },
    async adicionarAnexo({ estado, campo, arquivo }) {
      const preparo = await jsonDaResposta(
        await fetcher(`${endpoint}/anexos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campo: campo.chave,
            nome: arquivo.name,
            mime: arquivo.type,
            bytes: arquivo.size,
          }),
        }),
      );
      if (typeof preparo.uploadUrl !== "string" || typeof preparo.anexoId !== "string") {
        throw new ErroRuntimeFormulario("Não consegui preparar o arquivo.", {
          codigo: "upload_incompleto",
        });
      }
      const upload = await fetcher(preparo.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type, "x-upsert": "false" },
        body: arquivo,
      });
      if (!upload.ok) {
        throw new ErroRuntimeFormulario("O arquivo não terminou de subir.", {
          codigo: "falha_upload",
          status: upload.status,
        });
      }
      const confirmacao = await jsonDaResposta(
        await fetcher(`${endpoint}/anexos`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anexoId: preparo.anexoId }),
        }),
      );
      const anexo = confirmacao.anexo as AnexoFormulario | undefined;
      if (!anexo?.id) {
        throw new ErroRuntimeFormulario("Não consegui confirmar o arquivo.", {
          codigo: "confirmacao_incompleta",
        });
      }
      return {
        ...estado,
        atual: {
          ...estado.atual,
          status: estado.atual.status === "novo" ? "rascunho" : estado.atual.status,
          anexos: [...estado.atual.anexos, anexo],
        },
      };
    },
    async removerAnexo({ estado, anexoId }) {
      await jsonDaResposta(
        await fetcher(`${endpoint}/anexos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anexoId }),
        }),
      );
      return {
        ...estado,
        atual: {
          ...estado.atual,
          anexos: estado.atual.anexos.filter((anexo) => anexo.id !== anexoId),
        },
      };
    },
  };
}

export type DuvidaAtual = {
  id: string;
  pergunta: string;
  respostas?: ValoresFormulario;
  status: string;
  resposta: string | null;
  criada_em: string;
  respondida_em: string | null;
};

type ConfiguracaoDuvidaAtual = {
  semanaKey: SemanaKey;
  iniciais?: readonly DuvidaAtual[];
  fetcher?: Fetcher;
};

function registroDaDuvida(
  definicao: DefinicaoFormulario,
  duvida: DuvidaAtual,
): RegistroEnvioFormulario {
  return {
    id: duvida.id,
    codigoFormulario: definicao.codigo,
    versaoFormulario: definicao.versao,
    status: duvida.resposta ? "respondido" : "aberto",
    valores: duvida.respostas ?? { pergunta: duvida.pergunta },
    anexos: [],
    criadoEm: duvida.criada_em,
    atualizadoEm: duvida.respondida_em ?? duvida.criada_em,
    resposta:
      duvida.resposta && duvida.respondida_em
        ? {
            texto: duvida.resposta,
            autor:
              definicao.workflow.tipo === "duvida"
                ? definicao.workflow.resposta.rotuloAutor
                : "Resposta",
            respondidaEm: duvida.respondida_em,
          }
        : undefined,
  };
}

/** Faz o novo renderizador conversar com a rota atual de dúvidas da etapa. */
export function criarAdaptadorDuvidaAtual(
  configuracao: ConfiguracaoDuvidaAtual,
): FormularioRuntimeAdapter {
  const fetcher = configuracao.fetcher ?? fetch;
  return {
    async carregar({ definicao }) {
      return {
        atual: estadoVazio(definicao).atual,
        historico: ordenarHistorico(
          (configuracao.iniciais ?? []).map((duvida) => registroDaDuvida(definicao, duvida)),
        ),
      };
    },
    async enviar({ definicao, estado }) {
      const resposta = await jsonDaResposta(
        await fetcher("/api/curso/duvidas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semanaKey: configuracao.semanaKey,
            codigo: definicao.codigo,
            pergunta: estado.atual.valores.pergunta ?? "",
            respostas: estado.atual.valores,
          }),
        }),
      );
      const duvida = resposta.duvida as DuvidaAtual | undefined;
      if (!duvida?.id) {
        throw new ErroRuntimeFormulario(
          "A dúvida foi enviada, mas a confirmação veio incompleta.",
          {
            codigo: "confirmacao_incompleta",
          },
        );
      }
      return {
        atual: estadoVazio(definicao).atual,
        historico: ordenarHistorico([registroDaDuvida(definicao, duvida), ...estado.historico]),
      };
    },
  };
}
