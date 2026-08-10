export function destinoDoMaterial(materialId: number, modo: string) {
  if (modo === "download") {
    return { tipo: "download" as const, caminho: `/api/download/${materialId}` };
  }
  if (modo === "leitura") return { tipo: "leitura" as const };
  return { tipo: "invalido" as const };
}

export function mensagemVeioDoMaterial(
  evento: Pick<MessageEvent, "origin" | "source">,
  janelaDoIframe: Window | null | undefined,
) {
  return evento.source === janelaDoIframe && evento.origin === "null";
}

export const OPCOES_DOWNLOAD_ASSINADO = { download: true } as const;
