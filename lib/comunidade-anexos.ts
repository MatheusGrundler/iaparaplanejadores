export const BUCKET_COMUNIDADE = "comunidade-anexos";
export const MAX_ANEXOS_COMUNIDADE = 10;
export const MAX_BYTES_COMUNIDADE = 200 * 1024 * 1024;

export function formatarBytesComunidade(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export type TipoAnexoComunidade = "imagem" | "video" | "audio" | "documento";

type RegraMime = {
  tipo: TipoAnexoComunidade;
  extensao: string;
  maxBytes: number;
};

const MB = 1024 * 1024;

export const REGRAS_MIME_COMUNIDADE = {
  "image/jpeg": { tipo: "imagem", extensao: "jpg", maxBytes: 10 * MB },
  "image/png": { tipo: "imagem", extensao: "png", maxBytes: 10 * MB },
  "image/webp": { tipo: "imagem", extensao: "webp", maxBytes: 10 * MB },
  "image/gif": { tipo: "imagem", extensao: "gif", maxBytes: 10 * MB },
  "video/mp4": { tipo: "video", extensao: "mp4", maxBytes: 100 * MB },
  "video/webm": { tipo: "video", extensao: "webm", maxBytes: 100 * MB },
  "video/quicktime": { tipo: "video", extensao: "mov", maxBytes: 100 * MB },
  "audio/mpeg": { tipo: "audio", extensao: "mp3", maxBytes: 50 * MB },
  "audio/mp4": { tipo: "audio", extensao: "m4a", maxBytes: 50 * MB },
  "audio/ogg": { tipo: "audio", extensao: "ogg", maxBytes: 50 * MB },
  "audio/wav": { tipo: "audio", extensao: "wav", maxBytes: 50 * MB },
  "audio/webm": { tipo: "audio", extensao: "webm", maxBytes: 50 * MB },
  "application/pdf": { tipo: "documento", extensao: "pdf", maxBytes: 25 * MB },
  "text/plain": { tipo: "documento", extensao: "txt", maxBytes: 25 * MB },
  "text/csv": { tipo: "documento", extensao: "csv", maxBytes: 25 * MB },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    tipo: "documento",
    extensao: "docx",
    maxBytes: 25 * MB,
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    tipo: "documento",
    extensao: "xlsx",
    maxBytes: 25 * MB,
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    tipo: "documento",
    extensao: "pptx",
    maxBytes: 25 * MB,
  },
} as const satisfies Record<string, RegraMime>;

export type MimeComunidade = keyof typeof REGRAS_MIME_COMUNIDADE;

const MIME_POR_EXTENSAO: Record<string, MimeComunidade> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALIASES_MIME: Record<string, MimeComunidade> = {
  "image/jpg": "image/jpeg",
  "audio/mp3": "audio/mpeg",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/x-pn-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "application/csv": "text/csv",
  "text/comma-separated-values": "text/csv",
  "video/mov": "video/quicktime",
  "video/x-m4v": "video/mp4",
};

export function normalizarMime(valor: unknown): string {
  return String(valor ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

export function regraDoMime(valor: unknown): RegraMime | null {
  const mime = normalizarMime(valor) as MimeComunidade;
  return REGRAS_MIME_COMUNIDADE[mime] ?? null;
}

export function resolverMimeComunidade(
  mimeValor: unknown,
  nomeValor: unknown,
): MimeComunidade | null {
  const declarado = normalizarMime(mimeValor);
  if (declarado in REGRAS_MIME_COMUNIDADE) return declarado as MimeComunidade;
  if (ALIASES_MIME[declarado]) return ALIASES_MIME[declarado];

  const extensao = String(nomeValor ?? "")
    .trim()
    .toLowerCase()
    .split(".")
    .pop();
  const podeInferir = !declarado || declarado === "application/octet-stream";
  if (!podeInferir || !extensao) {
    if (declarado === "application/vnd.ms-excel" && extensao === "csv") return "text/csv";
    return null;
  }
  return MIME_POR_EXTENSAO[extensao] ?? null;
}

export function validarNovoAnexoComunidade(
  mimeValor: unknown,
  bytesValor: unknown,
  nomeValor?: unknown,
): { mime: MimeComunidade; bytes: number; regra: RegraMime; erro?: never } | { erro: string } {
  const mime = resolverMimeComunidade(mimeValor, nomeValor);
  if (!mime) return { erro: "Esse formato de arquivo não é aceito." };
  const regra = REGRAS_MIME_COMUNIDADE[mime];

  const bytes = Number(bytesValor);
  if (!Number.isSafeInteger(bytes) || bytes < 1) {
    return { erro: "O arquivo está vazio ou tem tamanho inválido." };
  }
  if (bytes > regra.maxBytes) {
    const limiteMb = Math.round(regra.maxBytes / MB);
    return { erro: `Arquivos desse tipo podem ter até ${limiteMb} MB.` };
  }
  return { mime, bytes, regra };
}

export function nomeOriginalSeguro(valor: unknown): string {
  const nome = String(valor ?? "arquivo")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
    .trim();
  return nome.slice(0, 255) || "arquivo";
}

export function caminhoAnexoComunidade(
  userId: string,
  postId: number,
  anexoId: string,
  extensao: string,
): string {
  return `${userId}/${postId}/${anexoId}.${extensao}`;
}

function ascii(bytes: Uint8Array, inicio: number, fim: number): string {
  return String.fromCharCode(...bytes.slice(inicio, fim));
}

function comecaCom(bytes: Uint8Array, prefixo: readonly number[]) {
  return prefixo.every((byte, indice) => bytes[indice] === byte);
}

/**
 * Confere a assinatura do começo do arquivo. TXT/CSV não têm magic number;
 * nesses dois casos exigimos UTF-8 válido e rejeitamos bytes NUL.
 */
export function assinaturaComunidadeValida(mimeValor: unknown, bytes: Uint8Array): boolean {
  const mime = normalizarMime(mimeValor);
  if (mime === "image/jpeg") return comecaCom(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") {
    return comecaCom(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mime === "image/webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
  if (mime === "image/gif") {
    const assinatura = ascii(bytes, 0, 6);
    return assinatura === "GIF87a" || assinatura === "GIF89a";
  }
  if (mime === "video/mp4" || mime === "audio/mp4") return ascii(bytes, 4, 8) === "ftyp";
  if (mime === "video/quicktime") {
    return ascii(bytes, 4, 8) === "ftyp" && ascii(bytes, 8, 12) === "qt  ";
  }
  if (mime === "video/webm" || mime === "audio/webm") {
    return comecaCom(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  }
  if (mime === "audio/mpeg") {
    return ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  }
  if (mime === "audio/ogg") return ascii(bytes, 0, 4) === "OggS";
  if (mime === "audio/wav") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE";
  if (mime === "application/pdf") return ascii(bytes, 0, 5) === "%PDF-";
  if (mime.startsWith("application/vnd.openxmlformats-officedocument.")) {
    return comecaCom(bytes, [0x50, 0x4b, 0x03, 0x04]);
  }
  if (mime === "text/plain" || mime === "text/csv") {
    if (bytes.includes(0)) return false;
    try {
      // `stream: true` tolera apenas um code point cortado exatamente no fim
      // do Range, sem liberar sequências inválidas no restante do cabeçalho.
      new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: true });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
