import "server-only";
import sanitizeHtml from "sanitize-html";

/** Sanitiza o HTML do editor (dúvida do aluno e resposta do admin). */
export function sanitizaRico(html: string): string {
  const limpo = sanitizeHtml(String(html ?? "").slice(0, 20000), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "a",
      "code",
      "pre",
      "blockquote",
    ],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  }).trim();
  return limpo;
}

/** Versão texto puro, pra prévia em tabelas. */
export function textoPuro(html: string, max = 300): string {
  return sanitizeHtml(String(html ?? ""), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
