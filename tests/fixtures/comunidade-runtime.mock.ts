export type IdentidadeMock = {
  userId: string;
  email: string;
  admin: boolean;
};

export type RuntimeComunidadeMock = {
  acesso?: boolean;
  identity?: IdentidadeMock | null;
  db?: unknown;
  contexto?: unknown;
  validarObjeto?: () => Promise<{ valido: true } | { valido: false; erroTecnico: boolean }>;
  editor?: unknown;
  editorOptions?: unknown;
  tusDeveRepetir?: boolean;
  tusSimularRetry?: boolean;
  tusFalha?: Error;
  tusInicios?: number;
  tusOpcoes?: Record<string, unknown>;
  refreshes?: number;
  revalidacoes?: string[];
  eventos?: Array<{ email: string; tipo: string; ref?: number }>;
  limpezas?: number;
  descarteAnexo?: "removido" | "ausente" | "erro";
  descarteRascunho?: boolean;
};

const CHAVE = "__COMUNIDADE_TEST_RUNTIME__";

function escopoGlobal() {
  return globalThis as typeof globalThis & { [CHAVE]?: RuntimeComunidadeMock };
}

export function definirRuntimeComunidade(runtime: RuntimeComunidadeMock) {
  escopoGlobal()[CHAVE] = runtime;
}

export function runtimeComunidade(): RuntimeComunidadeMock {
  const runtime = escopoGlobal()[CHAVE];
  if (!runtime) throw new Error("Runtime de teste da comunidade não foi configurado.");
  return runtime;
}

export async function canAccessMemberArea() {
  return runtimeComunidade().acesso ?? true;
}

export async function getMemberIdentity() {
  return runtimeComunidade().identity ?? null;
}

export async function logEvento(email: string, tipo: string, ref?: number) {
  const runtime = runtimeComunidade();
  runtime.eventos ??= [];
  runtime.eventos.push({ email, tipo, ref });
}

export function adminClient() {
  return runtimeComunidade().db;
}

export function privilegedDatabase() {
  return runtimeComunidade().db;
}

export async function contextoPublicacaoEditavel() {
  return runtimeComunidade().contexto;
}

export function contextoFalhou(contexto: unknown): contexto is { status: number; erro: string } {
  return Boolean(contexto && typeof contexto === "object" && "status" in contexto);
}

export async function validarObjetoComunidade() {
  return runtimeComunidade().validarObjeto?.() ?? { valido: true as const };
}

export async function limparRascunhosExpiradosComunidade() {
  const runtime = runtimeComunidade();
  runtime.limpezas = (runtime.limpezas ?? 0) + 1;
}

export async function descartarAnexoComunidade() {
  return runtimeComunidade().descarteAnexo ?? "removido";
}

export async function descartarRascunhoComunidade() {
  return runtimeComunidade().descarteRascunho ?? true;
}

export function revalidatePath(path: string) {
  const runtime = runtimeComunidade();
  runtime.revalidacoes ??= [];
  runtime.revalidacoes.push(path);
}

export function useRouter() {
  return {
    refresh() {
      const runtime = runtimeComunidade();
      runtime.refreshes = (runtime.refreshes ?? 0) + 1;
    },
  };
}

export type MemberIdentity = IdentidadeMock;
export type PrivilegedDatabase = never;
