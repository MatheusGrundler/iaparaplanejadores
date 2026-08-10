const EXTENSOES_LEITURA = new Set(["html", "pdf"]);

export function extensaoDoArquivo(nomeOuCaminho: string) {
  return nomeOuCaminho.split(".").pop()?.toLowerCase() ?? "";
}

export function validarArquivoParaLeitura(nomeOuCaminho: string) {
  if (!EXTENSOES_LEITURA.has(extensaoDoArquivo(nomeOuCaminho))) {
    throw new Error(
      "Leitura na plataforma aceita apenas HTML ou PDF. Use o modo Download para este arquivo.",
    );
  }
}

export type AdaptadorRemocaoMaterial = {
  listarObjetos(materialId: number): Promise<ReadonlyArray<string>>;
  excluirMetadados(materialId: number): Promise<void>;
  removerObjetos(caminhos: ReadonlyArray<string>): Promise<void>;
};

export async function removerMaterialComSeguranca(
  materialId: number,
  adaptador: AdaptadorRemocaoMaterial,
) {
  const caminhos = await adaptador.listarObjetos(materialId);
  await adaptador.excluirMetadados(materialId);

  if (caminhos.length === 0) return { limpezaStorageFalhou: false };

  try {
    await adaptador.removerObjetos(caminhos);
    return { limpezaStorageFalhou: false };
  } catch {
    // O material já não está visível. O objeto privado órfão pode ser limpo
    // posteriormente sem quebrar a integridade da biblioteca.
    return { limpezaStorageFalhou: true };
  }
}
