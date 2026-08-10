import type { DefinicaoFormulario } from "./schema";
import { validarDefinicaoFormulario, type ProblemaDefinicaoFormulario } from "./validacao";

export class DefinicaoFormularioInvalidaError extends Error {
  readonly problemas: readonly ProblemaDefinicaoFormulario[];

  constructor(codigo: string, problemas: readonly ProblemaDefinicaoFormulario[]) {
    super(
      `Definição inválida para “${codigo}”: ${problemas.map((item) => item.mensagem).join("; ")}`,
    );
    this.name = "DefinicaoFormularioInvalidaError";
    this.problemas = problemas;
  }
}

export class FormularioNaoEncontradoError extends Error {
  constructor(codigo: string, versao?: number) {
    super(
      versao
        ? `Formulário “${codigo}” na versão ${versao} não encontrado.`
        : `Formulário publicado “${codigo}” não encontrado.`,
    );
    this.name = "FormularioNaoEncontradoError";
  }
}

function congelar<T>(valor: T): T {
  if (!valor || typeof valor !== "object" || Object.isFrozen(valor)) return valor;
  Object.freeze(valor);
  Object.values(valor as Record<string, unknown>).forEach(congelar);
  return valor;
}

/** Registro em código com suporte a múltiplas versões do mesmo formulário. */
export class RegistroFormularios {
  readonly #formularios = new Map<string, Map<number, DefinicaoFormulario>>();

  constructor(definicoes: readonly DefinicaoFormulario[] = []) {
    definicoes.forEach((definicao) => this.registrar(definicao));
  }

  registrar(definicao: DefinicaoFormulario): this {
    const resultado = validarDefinicaoFormulario(definicao);
    if (!resultado.valido) {
      throw new DefinicaoFormularioInvalidaError(
        definicao.codigo || "sem-codigo",
        resultado.problemas,
      );
    }

    const versoes =
      this.#formularios.get(definicao.codigo) ?? new Map<number, DefinicaoFormulario>();
    if (versoes.has(definicao.versao)) {
      throw new Error(
        `O formulário “${definicao.codigo}” versão ${definicao.versao} já foi registrado.`,
      );
    }
    versoes.set(definicao.versao, congelar(structuredClone(definicao)));
    this.#formularios.set(definicao.codigo, versoes);
    return this;
  }

  buscar(
    codigo: string,
    opcoes: { versao?: number; incluirNaoPublicados?: boolean } = {},
  ): DefinicaoFormulario | null {
    const versoes = this.#formularios.get(codigo);
    if (!versoes) return null;
    if (opcoes.versao !== undefined) {
      const exata = versoes.get(opcoes.versao) ?? null;
      if (!exata) return null;
      return opcoes.incluirNaoPublicados || exata.publicacao === "publicado" ? exata : null;
    }

    return (
      [...versoes.values()]
        .filter((item) => opcoes.incluirNaoPublicados || item.publicacao === "publicado")
        .sort((a, b) => b.versao - a.versao)[0] ?? null
    );
  }

  obter(
    codigo: string,
    opcoes: { versao?: number; incluirNaoPublicados?: boolean } = {},
  ): DefinicaoFormulario {
    const definicao = this.buscar(codigo, opcoes);
    if (!definicao) throw new FormularioNaoEncontradoError(codigo, opcoes.versao);
    return definicao;
  }

  listar(opcoes: { incluirNaoPublicados?: boolean; todasAsVersoes?: boolean } = {}) {
    const resultado: DefinicaoFormulario[] = [];
    for (const codigo of [...this.#formularios.keys()].sort()) {
      const versoes = this.#formularios.get(codigo);
      if (!versoes) continue;
      if (opcoes.todasAsVersoes) {
        resultado.push(
          ...[...versoes.values()]
            .filter((item) => opcoes.incluirNaoPublicados || item.publicacao === "publicado")
            .sort((a, b) => b.versao - a.versao),
        );
      } else {
        const atual = this.buscar(codigo, opcoes);
        if (atual) resultado.push(atual);
      }
    }
    return resultado;
  }
}
