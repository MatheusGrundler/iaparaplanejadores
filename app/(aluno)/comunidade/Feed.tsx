import sanitizeHtml from "sanitize-html";
import { formatarBytesComunidade } from "@/lib/comunidade-anexos";
import styles from "./comunidade.module.css";

type TipoAnexo = "imagem" | "video" | "audio" | "documento";

export type AnexoPronto = {
  id: string;
  post_id: number;
  file: string;
  nome_original: string;
  tipo: TipoAnexo;
  mime: string;
  bytes: number;
  status: "pronto";
  url: string;
  downloadUrl?: string;
};

export function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function htmlSeguro(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "br", "strong", "em", "s", "blockquote", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

export function AnexoNoFeed({ anexo }: { anexo: AnexoPronto }) {
  if (anexo.tipo === "imagem") {
    return (
      // A origem é uma URL privada e temporária gerada no servidor.
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.imagemFeed} src={anexo.url} alt={anexo.nome_original} loading="lazy" />
    );
  }

  if (anexo.tipo === "video") {
    return (
      <video
        className={styles.midiaFeed}
        src={anexo.url}
        aria-label={anexo.nome_original}
        controls
        preload="metadata"
      />
    );
  }

  if (anexo.tipo === "audio") {
    return (
      <audio
        className={styles.audioFeed}
        src={anexo.url}
        aria-label={anexo.nome_original}
        controls
        preload="metadata"
      />
    );
  }

  return (
    <div className={styles.documentoFeed}>
      <div>
        <strong>{anexo.nome_original}</strong>
        <span>Documento · {formatarBytesComunidade(anexo.bytes)}</span>
      </div>
      <div className={styles.documentoAcoes}>
        <a href={anexo.url} target="_blank" rel="noreferrer">
          Abrir
        </a>
        <a href={anexo.downloadUrl ?? anexo.url} download={anexo.nome_original}>
          Baixar
        </a>
      </div>
    </div>
  );
}
