import type {
  CampoAnexoFormulario,
  DefinicaoFormulario,
  EstadoFormulario,
  RegistroEnvioFormulario,
} from "./schema";

export type ContextoRuntimeFormulario = Readonly<
  Record<string, string | number | boolean | null | undefined>
>;

export type OperacaoFormulario = {
  definicao: DefinicaoFormulario;
  estado: EstadoFormulario;
  contexto?: ContextoRuntimeFormulario;
};

export type OperacaoAnexoFormulario = OperacaoFormulario & {
  campo: CampoAnexoFormulario;
  arquivo: File;
};

export type OperacaoRemocaoAnexo = OperacaoFormulario & {
  anexoId: string;
};

export type OperacaoRespostaFormulario = {
  definicao: DefinicaoFormulario;
  registroId: string;
  texto: string;
  autor: string;
  contexto?: ContextoRuntimeFormulario;
};

export type OperacaoRevisaoFormulario = {
  definicao: DefinicaoFormulario;
  registroId?: string;
  contexto?: ContextoRuntimeFormulario;
};

/**
 * Fronteira entre a interface e qualquer persistência.
 *
 * Uma implementação pode chamar as APIs atuais, Supabase, outra API ou apenas
 * memória. O renderizador não conhece tabelas, buckets nem rotas.
 */
export interface FormularioRuntimeAdapter {
  carregar(args: {
    definicao: DefinicaoFormulario;
    contexto?: ContextoRuntimeFormulario;
  }): Promise<EstadoFormulario>;
  enviar(args: OperacaoFormulario): Promise<EstadoFormulario>;
  adicionarAnexo?(args: OperacaoAnexoFormulario): Promise<EstadoFormulario>;
  removerAnexo?(args: OperacaoRemocaoAnexo): Promise<EstadoFormulario>;
  responder?(args: OperacaoRespostaFormulario): Promise<EstadoFormulario>;
  revisar?(args: OperacaoRevisaoFormulario): Promise<EstadoFormulario>;
}

export type ResolverRuntimeFormulario = (
  definicao: DefinicaoFormulario,
) => FormularioRuntimeAdapter | null | undefined;

export class ErroRuntimeFormulario extends Error {
  readonly codigo: string;
  readonly status?: number;

  constructor(mensagem: string, opcoes: { codigo?: string; status?: number } = {}) {
    super(mensagem);
    this.name = "ErroRuntimeFormulario";
    this.codigo = opcoes.codigo ?? "erro_runtime";
    this.status = opcoes.status;
  }
}

export function mensagemErroRuntime(erro: unknown, fallback: string) {
  return erro instanceof Error && erro.message ? erro.message : fallback;
}

export function ordenarHistorico(
  historico: readonly RegistroEnvioFormulario[],
): RegistroEnvioFormulario[] {
  return [...historico].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}
