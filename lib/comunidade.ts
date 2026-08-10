import "server-only";

import { sanitizaRico, textoPuro } from "@/lib/sanitiza";

export const LIMITE_HTML_COMUNIDADE = 50_000;
export const LIMITE_TEXTO_COMUNIDADE = 6_000;

export type ConteudoComunidade = {
  html: string | null;
  texto: string;
};

export function prepararConteudoComunidade(
  valor: unknown,
): { conteudo: ConteudoComunidade; erro?: never } | { conteudo?: never; erro: string } {
  if (typeof valor !== "string") return { erro: "Conteúdo inválido." };
  if (valor.length > LIMITE_HTML_COMUNIDADE) {
    return { erro: "O texto ficou longo demais. Reduza para publicar." };
  }

  const html = sanitizaRico(valor, LIMITE_HTML_COMUNIDADE);
  if (html.length > LIMITE_HTML_COMUNIDADE) {
    return { erro: "O texto ficou longo demais. Reduza para publicar." };
  }
  const texto = textoPuro(html, LIMITE_TEXTO_COMUNIDADE + 1);
  if (texto.length > LIMITE_TEXTO_COMUNIDADE) {
    return { erro: "O texto pode ter até 6.000 caracteres." };
  }

  // Marcação vazia (`<p></p>`) não conta como conteúdo. Isso permite que o
  // mesmo fluxo crie uma publicação composta somente por anexos.
  return { conteudo: { html: texto ? html : null, texto } };
}
