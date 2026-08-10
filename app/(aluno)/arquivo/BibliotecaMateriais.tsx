import Link from "next/link";

export type MaterialBiblioteca = {
  id: number;
  tag: string | null;
  titulo: string;
  desc: string | null;
  ordem: number;
  modo: "leitura" | "download";
};

type Props = {
  materiais: ReadonlyArray<MaterialBiblioteca>;
  idsComArquivo: ReadonlyArray<number>;
};

export function BibliotecaMateriais({ materiais, idsComArquivo }: Props) {
  const comArquivo = new Set(idsComArquivo);

  return (
    <main className="pagina-arquivo">
      <div className="breadcrumb">
        <Link href="/">Imersão</Link>
        <span aria-hidden="true">/</span>
        <span>Biblioteca de materiais</span>
      </div>

      <div className="arquivo-cabecalho">
        <span className="pill">Materiais complementares</span>
        <h1>Biblioteca de materiais</h1>
        <p className="sub">
          Encontre aqui guias, leituras e arquivos da imersão. Cada card informa se o material abre
          dentro da plataforma ou é baixado no seu dispositivo.
        </p>
      </div>

      {materiais.length === 0 ? (
        <div className="vazio card">Nenhum material foi publicado na biblioteca ainda.</div>
      ) : (
        <div className="grid arquivo-grid">
          {materiais.map((material) => (
            <article className="card arquivo-card" key={material.id}>
              {material.tag && <span className="pill">{material.tag}</span>}
              <h2>{material.titulo}</h2>
              {material.desc && <p className="muted">{material.desc}</p>}
              <span className="muted">
                {material.modo === "download"
                  ? "Arquivo para baixar"
                  : "Leitura dentro da plataforma"}
              </span>
              {comArquivo.has(material.id) ? (
                material.modo === "download" ? (
                  <a
                    className="btn btn-fantasma btn-mini"
                    href={`/api/download/${material.id}`}
                    aria-label={`Baixar ${material.titulo}`}
                  >
                    Baixar arquivo
                  </a>
                ) : (
                  <Link
                    className="btn btn-fantasma btn-mini"
                    href={`/material/${material.id}`}
                    aria-label={`Ler ${material.titulo} na plataforma`}
                  >
                    Ler na plataforma
                  </Link>
                )
              ) : (
                <span className="muted">Sem arquivo ativo</span>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
