import type { ContextoRuntimeFormulario } from "./runtime";
import {
  formularioBloqueado,
  type DefinicaoFormulario,
  type EstadoAtualFormulario,
  type EstadoFormulario,
  type StatusEnvioFormulario,
  type ValoresFormulario,
} from "./schema";

const PREFIXO_RASCUNHO_LOCAL = "ia-planejadores:formulario:rascunho:v1";

export type ArmazenamentoRascunhoLocal = {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
};

export type RascunhoLocalFormulario = {
  schemaVersion: 1;
  codigo: string;
  versao: number;
  valores: ValoresFormulario;
  base: Pick<EstadoAtualFormulario, "status" | "valores" | "atualizadoEm">;
  salvoEm: string;
};

const STATUS_FORMULARIO = new Set<StatusEnvioFormulario>([
  "novo",
  "rascunho",
  "enviado",
  "revisado",
  "aberto",
  "respondido",
]);

function objeto(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function escopoDoContexto(contexto?: ContextoRuntimeFormulario) {
  const chaveExplicita = contexto?.chaveSessao;
  if (typeof chaveExplicita === "string" && chaveExplicita) return chaveExplicita;

  return (
    Object.entries(contexto ?? {})
      .filter(([, valor]) => valor !== undefined)
      .sort(([chaveA], [chaveB]) => chaveA.localeCompare(chaveB))
      .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`)
      .join("&") || "padrao"
  );
}

function valoresConhecidos(
  definicao: DefinicaoFormulario,
  valor: unknown,
): ValoresFormulario | null {
  if (!objeto(valor)) return null;
  const resultado: ValoresFormulario = {};
  for (const campo of definicao.campos) {
    const conteudo = valor[campo.chave];
    if (typeof conteudo !== "string") return null;
    resultado[campo.chave] = conteudo;
  }
  return resultado;
}

function removerComSeguranca(
  armazenamento: ArmazenamentoRascunhoLocal,
  chave: string,
) {
  try {
    armazenamento.removeItem(chave);
  } catch {
    // O formulário continua funcionando quando o navegador bloqueia o storage.
  }
}

export function chaveRascunhoLocal(
  definicao: DefinicaoFormulario,
  contexto?: ContextoRuntimeFormulario,
) {
  return [
    PREFIXO_RASCUNHO_LOCAL,
    encodeURIComponent(definicao.codigo),
    `v${definicao.versao}`,
    encodeURIComponent(escopoDoContexto(contexto)),
  ].join(":");
}

export function lerRascunhoLocal(
  armazenamento: ArmazenamentoRascunhoLocal,
  definicao: DefinicaoFormulario,
  contexto?: ContextoRuntimeFormulario,
): RascunhoLocalFormulario | null {
  const chave = chaveRascunhoLocal(definicao, contexto);
  try {
    const serializado = armazenamento.getItem(chave);
    if (!serializado) return null;
    const registro: unknown = JSON.parse(serializado);
    if (
      !objeto(registro) ||
      registro.schemaVersion !== 1 ||
      registro.codigo !== definicao.codigo ||
      registro.versao !== definicao.versao ||
      typeof registro.salvoEm !== "string"
    ) {
      removerComSeguranca(armazenamento, chave);
      return null;
    }
    const valores = valoresConhecidos(definicao, registro.valores);
    const base = objeto(registro.base) ? registro.base : null;
    const valoresBase = valoresConhecidos(definicao, base?.valores);
    if (
      !valores ||
      !base ||
      typeof base.status !== "string" ||
      !STATUS_FORMULARIO.has(base.status as StatusEnvioFormulario) ||
      !valoresBase ||
      (base.atualizadoEm !== undefined && typeof base.atualizadoEm !== "string")
    ) {
      removerComSeguranca(armazenamento, chave);
      return null;
    }
    return {
      schemaVersion: 1,
      codigo: definicao.codigo,
      versao: definicao.versao,
      valores,
      base: {
        status: base.status as StatusEnvioFormulario,
        valores: valoresBase,
        atualizadoEm: base.atualizadoEm as string | undefined,
      },
      salvoEm: registro.salvoEm,
    };
  } catch {
    removerComSeguranca(armazenamento, chave);
    return null;
  }
}

export function salvarRascunhoLocal(
  armazenamento: ArmazenamentoRascunhoLocal,
  definicao: DefinicaoFormulario,
  valores: ValoresFormulario,
  base: Pick<EstadoAtualFormulario, "status" | "valores" | "atualizadoEm">,
  contexto?: ContextoRuntimeFormulario,
  agora = new Date(),
) {
  const normalizados = valoresConhecidos(definicao, valores);
  const baseNormalizada = valoresConhecidos(definicao, base.valores);
  if (!normalizados || !baseNormalizada) return;
  const registro: RascunhoLocalFormulario = {
    schemaVersion: 1,
    codigo: definicao.codigo,
    versao: definicao.versao,
    valores: normalizados,
    base: {
      status: base.status,
      valores: baseNormalizada,
      atualizadoEm: base.atualizadoEm,
    },
    salvoEm: agora.toISOString(),
  };
  try {
    armazenamento.setItem(chaveRascunhoLocal(definicao, contexto), JSON.stringify(registro));
  } catch {
    // Persistência local é uma conveniência e nunca deve bloquear o preenchimento.
  }
}

export function aplicarRascunhoLocalAoEstado(
  definicao: DefinicaoFormulario,
  base: EstadoFormulario,
  rascunho: RascunhoLocalFormulario,
): { estado: EstadoFormulario; aplicado: boolean } {
  if (formularioBloqueado(definicao, base)) return { estado: base, aplicado: false };

  const familiaStatus = (status: StatusEnvioFormulario) =>
    status === "novo" || status === "rascunho" ? "editavel" : status;
  const mesmaBase = definicao.campos.every(
    (campo) => base.atual.valores[campo.chave] === rascunho.base.valores[campo.chave],
  );
  if (!mesmaBase || familiaStatus(base.atual.status) !== familiaStatus(rascunho.base.status)) {
    return { estado: base, aplicado: false };
  }

  return {
    aplicado: true,
    estado: {
      ...base,
      atual: {
        ...base.atual,
        status: definicao.workflow.tipo === "quest" ? "rascunho" : base.atual.status,
        valores: { ...base.atual.valores, ...rascunho.valores },
      },
    },
  };
}

export function removerRascunhoLocal(
  armazenamento: ArmazenamentoRascunhoLocal,
  definicao: DefinicaoFormulario,
  contexto?: ContextoRuntimeFormulario,
) {
  removerComSeguranca(armazenamento, chaveRascunhoLocal(definicao, contexto));
}
