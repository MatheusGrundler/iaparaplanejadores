export const EXPIRACAO_URL_COMUNIDADE = 6 * 60 * 60;
export const TAMANHO_LOTE_ASSINATURA = 100;

type AnexoAssinavel = {
  file: string;
  nome_original: string;
  tipo: "imagem" | "video" | "audio" | "documento";
};

type ResultadoAssinatura = {
  data: Array<{
    error: string | null;
    path: string | null;
    signedUrl: string | null;
  }> | null;
  error: { message?: string } | null;
};

type AnexoAssinado<T> = T & {
  url: string;
  downloadUrl?: string;
};

function emLotes<T>(itens: T[], tamanho: number) {
  const lotes: T[][] = [];
  for (let inicio = 0; inicio < itens.length; inicio += tamanho) {
    lotes.push(itens.slice(inicio, inicio + tamanho));
  }
  return lotes;
}

export function urlParaDownload(urlAssinada: string, nome: string) {
  const url = new URL(urlAssinada);
  url.searchParams.set("download", nome);
  return url.toString();
}

export async function assinarAnexosComunidade<T extends AnexoAssinavel>(
  anexos: T[],
  criarUrls: (paths: string[], expiresIn: number) => Promise<ResultadoAssinatura>,
): Promise<{ anexos: AnexoAssinado<T>[]; houveErro: boolean }> {
  if (anexos.length === 0) return { anexos: [], houveErro: false };

  const resultados = await Promise.all(
    emLotes(anexos, TAMANHO_LOTE_ASSINATURA).map((lote) =>
      criarUrls(
        lote.map((anexo) => anexo.file),
        EXPIRACAO_URL_COMUNIDADE,
      ),
    ),
  );

  let houveErro = false;
  const urls = new Map<string, string>();
  for (const resultado of resultados) {
    if (resultado.error || !resultado.data) {
      houveErro = true;
      continue;
    }
    for (const item of resultado.data) {
      if (item.error || !item.path || !item.signedUrl) {
        houveErro = true;
        continue;
      }
      urls.set(item.path, item.signedUrl);
    }
  }

  const assinados: AnexoAssinado<T>[] = [];
  for (const anexo of anexos) {
    const url = urls.get(anexo.file);
    if (!url) {
      houveErro = true;
      continue;
    }
    assinados.push({
      ...anexo,
      url,
      downloadUrl:
        anexo.tipo === "documento" ? urlParaDownload(url, anexo.nome_original) : undefined,
    });
  }
  return { anexos: assinados, houveErro };
}
