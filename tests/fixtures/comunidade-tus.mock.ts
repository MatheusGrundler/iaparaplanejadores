import { runtimeComunidade } from "./comunidade-runtime.mock";

type OpcoesTus = {
  onProgress?: (enviados: number, total: number) => void;
  onShouldRetry?: (erro: Error, tentativa: number, opcoes: OpcoesTus) => boolean;
  onSuccess?: () => void;
  onError?: (erro: Error) => void;
  [chave: string]: unknown;
};

export const defaultOptions = {
  onShouldRetry: () => runtimeComunidade().tusDeveRepetir ?? true,
};

export class Upload {
  private readonly arquivo: File;
  private readonly opcoes: OpcoesTus;

  constructor(arquivo: File, opcoes: OpcoesTus) {
    this.arquivo = arquivo;
    this.opcoes = opcoes;
    runtimeComunidade().tusOpcoes = opcoes;
  }

  start() {
    const runtime = runtimeComunidade();
    runtime.tusInicios = (runtime.tusInicios ?? 0) + 1;
    this.opcoes.onProgress?.(Math.floor(this.arquivo.size / 2), this.arquivo.size);
    if (runtime.tusSimularRetry) {
      this.opcoes.onShouldRetry?.(new Error("oscilação"), 1, this.opcoes);
    }
    if (runtime.tusFalha) {
      this.opcoes.onError?.(runtime.tusFalha);
      return;
    }
    this.opcoes.onProgress?.(this.arquivo.size, this.arquivo.size);
    this.opcoes.onSuccess?.();
  }
}
