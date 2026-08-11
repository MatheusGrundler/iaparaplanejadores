"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import type { BlocoSemana, ConceitoSistema } from "@/lib/curso-conteudo";
import styles from "./ConteudoNativo.module.css";

type BlocoMapaConceitos = Extract<BlocoSemana, { type: "concept-map" }>;

function IconeConceito({ id }: { id: ConceitoSistema["id"] }) {
  const propriedades = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "agente") {
    return (
      <svg {...propriedades}>
        <circle cx="24" cy="24" r="8" />
        <circle cx="24" cy="7" r="3" />
        <circle cx="41" cy="24" r="3" />
        <circle cx="24" cy="41" r="3" />
        <circle cx="7" cy="24" r="3" />
        <path d="M24 10v6M38 24h-6M24 32v6M10 24h6" />
      </svg>
    );
  }

  if (id === "modelo") {
    return (
      <svg {...propriedades}>
        <path d="M24 6l3.6 10.4L38 20l-10.4 3.6L24 34l-3.6-10.4L10 20l10.4-3.6L24 6Z" />
        <path d="M38 32l1.8 5.2L45 39l-5.2 1.8L38 46l-1.8-5.2L31 39l5.2-1.8L38 32Z" />
        <path d="M9 5l1.4 4.1 4.1 1.4-4.1 1.4L9 16l-1.4-4.1-4.1-1.4 4.1-1.4L9 5Z" />
      </svg>
    );
  }

  if (id === "ambiente") {
    return (
      <svg {...propriedades}>
        <rect x="5" y="8" width="38" height="28" rx="4" />
        <path d="M5 16h38M12 12h1M18 12h1M24 12h1M15 42h18M20 36v6M28 36v6" />
        <path d="M13 23l4 4-4 4M22 31h10" />
      </svg>
    );
  }

  if (id === "skill") {
    return (
      <svg {...propriedades}>
        <rect x="9" y="5" width="30" height="38" rx="4" />
        <path d="M18 5.5h12V11H18zM16 20l2.5 2.5L23 18M27 21h6M16 30l2.5 2.5L23 28M27 31h6" />
      </svg>
    );
  }

  return (
    <svg {...propriedades}>
      <path d="M18 18l-5-5a6 6 0 0 0-8.5 8.5l7 7A6 6 0 0 0 20 20l-2-2Z" />
      <path d="M30 30l5 5a6 6 0 0 0 8.5-8.5l-7-7A6 6 0 0 0 28 28l2 2Z" />
      <path d="M17 31l14-14" />
    </svg>
  );
}

export default function MapaConceitos({ bloco }: { bloco: BlocoMapaConceitos }) {
  const [ativoId, setAtivoId] = useState<ConceitoSistema["id"]>(
    bloco.items[0]?.id ?? "agente",
  );
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);
  const ativo = bloco.items.find((item) => item.id === ativoId) ?? bloco.items[0];

  if (!ativo) return null;

  function selecionarPeloTeclado(event: KeyboardEvent<HTMLButtonElement>, indice: number) {
    let proximoIndice: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      proximoIndice = (indice + 1) % bloco.items.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      proximoIndice = (indice - 1 + bloco.items.length) % bloco.items.length;
    } else if (event.key === "Home") {
      proximoIndice = 0;
    } else if (event.key === "End") {
      proximoIndice = bloco.items.length - 1;
    }

    if (proximoIndice === null) return;
    event.preventDefault();
    setAtivoId(bloco.items[proximoIndice].id);
    botoes.current[proximoIndice]?.focus();
  }

  return (
    <section className={styles.conceitosMapa} aria-labelledby="conceitos-mapa-titulo">
      <header className={styles.conceitosCabecalho}>
        <div>
          <span>Mapa interativo</span>
          <h3 id="conceitos-mapa-titulo">{bloco.title}</h3>
        </div>
        <p>Passe o mouse, use as setas do teclado ou toque para explorar.</p>
      </header>

      <figure className={styles.conceitosImagem}>
        <Image
          src={bloco.image.src}
          alt={bloco.image.alt}
          width={bloco.image.width}
          height={bloco.image.height}
          sizes="(max-width: 680px) 100vw, (max-width: 1180px) 90vw, 1080px"
        />
      </figure>

      <div className={styles.conceitosTrilha} role="tablist" aria-label="Conceitos do agente">
        {bloco.items.map((item, indice) => {
          const selecionado = item.id === ativo.id;
          return (
            <button
              className={styles.conceitoBotao}
              id={`conceito-${item.id}-aba`}
              type="button"
              role="tab"
              aria-selected={selecionado}
              aria-controls={`conceito-${item.id}-painel`}
              tabIndex={selecionado ? 0 : -1}
              key={item.id}
              ref={(elemento) => {
                botoes.current[indice] = elemento;
              }}
              onClick={() => setAtivoId(item.id)}
              onFocus={() => setAtivoId(item.id)}
              onMouseEnter={() => setAtivoId(item.id)}
              onKeyDown={(event) => selecionarPeloTeclado(event, indice)}
            >
              <span className={styles.conceitoIcone}>
                <IconeConceito id={item.id} />
              </span>
              <span className={styles.conceitoBotaoTexto}>
                <strong>{item.nome}</strong>
                <small>{item.termo}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.conceitosPaineis}>
        {bloco.items.map((item) => (
          <article
            className={styles.conceitoPainel}
            id={`conceito-${item.id}-painel`}
            role="tabpanel"
            aria-labelledby={`conceito-${item.id}-aba`}
            tabIndex={0}
            hidden={item.id !== ativo.id}
            key={item.id}
          >
            <header className={styles.conceitoPainelCabecalho}>
              <span className={styles.conceitoIconeGrande}>
                <IconeConceito id={item.id} />
              </span>
              <div>
                <span>Termo técnico: {item.termo}</span>
                <h4>{item.nome}</h4>
              </div>
            </header>

            <dl className={styles.conceitoDefinicoes}>
              <div>
                <dt>Pense assim</dt>
                <dd>{item.analogia}</dd>
              </div>
              <div>
                <dt>Em uma frase</dt>
                <dd>{item.resumo}</dd>
              </div>
              <div>
                <dt>No escritório</dt>
                <dd>{item.exemplo}</dd>
              </div>
            </dl>

            {item.nota && <p className={styles.conceitoNota}>{item.nota}</p>}
          </article>
        ))}
      </div>

      <aside className={styles.conceitosConexao} aria-label="Como os conceitos se conectam">
        <span>Como tudo se conecta</span>
        <ol>
          {bloco.connection.map((passo, indice) => (
            <li key={passo}>
              <strong>{passo}</strong>
              {indice < bloco.connection.length - 1 && <span aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
