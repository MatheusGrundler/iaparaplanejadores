import "server-only";

import {
  assinaturaComunidadeValida,
  BUCKET_COMUNIDADE,
  normalizarMime,
} from "@/lib/comunidade-anexos";
import type { PrivilegedDatabase } from "@/lib/supabase/admin";

const CABECALHO_MAX_BYTES = 4096;
const CAUDA_ZIP_MAX_BYTES = 65_557;
const DIRETORIO_CENTRAL_MAX_BYTES = 2 * 1024 * 1024;

function inteiro16(bytes: Uint8Array, indice: number) {
  return bytes[indice] | (bytes[indice + 1] << 8);
}

function inteiro32(bytes: Uint8Array, indice: number) {
  return (
    (bytes[indice] |
      (bytes[indice + 1] << 8) |
      (bytes[indice + 2] << 16) |
      (bytes[indice + 3] << 24)) >>>
    0
  );
}

async function lerIntervaloDoObjeto(
  url: string,
  inicio: number,
  fim: number,
): Promise<Uint8Array | null> {
  const maximo = fim - inicio + 1;
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      cache: "no-store",
      headers: { Range: `bytes=${inicio}-${fim}` },
    });
  } catch {
    return null;
  }
  if (![200, 206].includes(resposta.status) || !resposta.body) return null;
  // Uma resposta 200 a um Range que começa no meio do arquivo contém bytes
  // errados para esse intervalo. Cancelamos cedo, sem baixar o objeto inteiro.
  if (inicio > 0 && resposta.status !== 206) {
    await resposta.body.cancel().catch(() => undefined);
    return null;
  }

  const reader = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maximo) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      const restante = maximo - total;
      const parte = value.slice(0, restante);
      partes.push(parte);
      total += parte.length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const bytes = new Uint8Array(total);
  let cursor = 0;
  for (const parte of partes) {
    bytes.set(parte, cursor);
    cursor += parte.length;
  }
  return bytes;
}

function indiceAssinaturaReversa(bytes: Uint8Array, assinatura: readonly number[]) {
  for (let indice = bytes.length - assinatura.length; indice >= 0; indice -= 1) {
    if (assinatura.every((byte, deslocamento) => bytes[indice + deslocamento] === byte)) {
      return indice;
    }
  }
  return -1;
}

function nomesDiretorioCentral(bytes: Uint8Array): Set<string> | null {
  const nomes = new Set<string>();
  let cursor = 0;
  while (cursor < bytes.length) {
    if (
      cursor + 46 > bytes.length ||
      bytes[cursor] !== 0x50 ||
      bytes[cursor + 1] !== 0x4b ||
      bytes[cursor + 2] !== 0x01 ||
      bytes[cursor + 3] !== 0x02
    ) {
      return null;
    }
    const tamanhoNome = inteiro16(bytes, cursor + 28);
    const tamanhoExtra = inteiro16(bytes, cursor + 30);
    const tamanhoComentario = inteiro16(bytes, cursor + 32);
    const fimEntrada = cursor + 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
    if (tamanhoNome === 0 || fimEntrada > bytes.length) return null;

    const nome = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + tamanhoNome));
    if (nome.startsWith("/") || nome.includes("\\") || nome.split("/").includes("..")) {
      return null;
    }
    nomes.add(nome);
    cursor = fimEntrada;
  }
  return nomes;
}

async function validarEstruturaOoxml(
  url: string,
  tamanhoObjeto: number,
  mime: string,
): Promise<boolean | null> {
  const inicioCauda = Math.max(0, tamanhoObjeto - CAUDA_ZIP_MAX_BYTES);
  const cauda = await lerIntervaloDoObjeto(url, inicioCauda, tamanhoObjeto - 1);
  if (!cauda) return null;

  const eocd = indiceAssinaturaReversa(cauda, [0x50, 0x4b, 0x05, 0x06]);
  if (eocd < 0 || eocd + 22 > cauda.length) return false;
  const disco = inteiro16(cauda, eocd + 4);
  const discoDiretorio = inteiro16(cauda, eocd + 6);
  const entradasNoDisco = inteiro16(cauda, eocd + 8);
  const entradas = inteiro16(cauda, eocd + 10);
  const tamanhoDiretorio = inteiro32(cauda, eocd + 12);
  const inicioDiretorio = inteiro32(cauda, eocd + 16);
  const tamanhoComentario = inteiro16(cauda, eocd + 20);
  if (
    disco !== 0 ||
    discoDiretorio !== 0 ||
    entradas === 0 ||
    entradas !== entradasNoDisco ||
    tamanhoDiretorio === 0 ||
    tamanhoDiretorio > DIRETORIO_CENTRAL_MAX_BYTES ||
    inicioDiretorio + tamanhoDiretorio > tamanhoObjeto ||
    eocd + 22 + tamanhoComentario > cauda.length
  ) {
    return false;
  }

  const fimDiretorio = inicioDiretorio + tamanhoDiretorio;
  const diretorio =
    inicioDiretorio >= inicioCauda && fimDiretorio <= inicioCauda + cauda.length
      ? cauda.slice(inicioDiretorio - inicioCauda, fimDiretorio - inicioCauda)
      : await lerIntervaloDoObjeto(url, inicioDiretorio, fimDiretorio - 1);
  if (!diretorio) return null;
  const nomes = nomesDiretorioCentral(diretorio);
  if (!nomes || nomes.size !== entradas || !nomes.has("[Content_Types].xml")) return false;

  const raiz = mime.includes("wordprocessingml")
    ? "word/"
    : mime.includes("spreadsheetml")
      ? "xl/"
      : "ppt/";
  return [...nomes].some((nome) => nome.startsWith(raiz) && nome.length > raiz.length);
}

export async function validarObjetoComunidade(
  db: PrivilegedDatabase,
  caminho: string,
  mimeEsperado: string,
  bytesEsperados: number,
): Promise<{ valido: true; erroTecnico: false } | { valido: false; erroTecnico: boolean }> {
  const { data: info, error } = await db.storage.from(BUCKET_COMUNIDADE).info(caminho);
  if (error || !info) {
    console.error("Falha ao obter metadados do anexo da comunidade:", error?.message);
    return { valido: false, erroTecnico: true };
  }

  const tamanho = Number(info.size ?? info.metadata?.size);
  const mime = normalizarMime(info.contentType ?? info.metadata?.mimetype);
  if (tamanho !== bytesEsperados || mime !== normalizarMime(mimeEsperado)) {
    return { valido: false, erroTecnico: false };
  }

  const { data: assinado, error: assinaturaError } = await db.storage
    .from(BUCKET_COMUNIDADE)
    .createSignedUrl(caminho, 60);
  if (assinaturaError || !assinado) return { valido: false, erroTecnico: true };

  const cabecalho = await lerIntervaloDoObjeto(
    assinado.signedUrl,
    0,
    Math.min(CABECALHO_MAX_BYTES, tamanho) - 1,
  );
  if (!cabecalho) return { valido: false, erroTecnico: true };
  if (!assinaturaComunidadeValida(mimeEsperado, cabecalho)) {
    return { valido: false, erroTecnico: false };
  }
  if (mime.startsWith("application/vnd.openxmlformats-officedocument.")) {
    const estruturaValida = await validarEstruturaOoxml(assinado.signedUrl, tamanho, mime);
    if (estruturaValida === null) return { valido: false, erroTecnico: true };
    if (!estruturaValida) return { valido: false, erroTecnico: false };
  }
  return {
    valido: true,
    erroTecnico: false,
  };
}
