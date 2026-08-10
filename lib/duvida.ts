/** Regras puras das dúvidas ricas (anexos e limites). */

export const LIMITES_ANEXOS = {
  imagens: 10,
  imagemBytes: 10 * 1024 * 1024, // 10 MB
  videos: 5,
  videoBytes: 100 * 1024 * 1024, // 100 MB
} as const;

export type TipoAnexo = "imagem" | "video";

export function tipoDoMime(mime: string): TipoAnexo | null {
  if (/^image\//.test(mime)) return "imagem";
  if (/^video\//.test(mime)) return "video";
  return null;
}

/** Devolve a mensagem de erro, ou null se o anexo cabe nos limites. */
export function validaNovoAnexo(
  existentes: ReadonlyArray<{ tipo: string }>,
  tipo: TipoAnexo,
  bytes: number,
): string | null {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Arquivo vazio ou inválido.";
  const imagens = existentes.filter((a) => a.tipo === "imagem").length;
  const videos = existentes.filter((a) => a.tipo === "video").length;
  if (tipo === "imagem") {
    if (bytes > LIMITES_ANEXOS.imagemBytes) return "Imagem acima de 10 MB.";
    if (imagens >= LIMITES_ANEXOS.imagens) return "Limite de 10 imagens por dúvida.";
  } else {
    if (bytes > LIMITES_ANEXOS.videoBytes) return "Vídeo acima de 100 MB.";
    if (videos >= LIMITES_ANEXOS.videos) return "Limite de 5 vídeos por dúvida.";
  }
  return null;
}

export function nomeSeguro(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "arquivo";
}
