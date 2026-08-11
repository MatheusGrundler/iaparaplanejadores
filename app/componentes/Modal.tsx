"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
  amplo?: boolean;
};

const SELETOR_FOCAVEL = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function Modal({ aberto, titulo, aoFechar, children, amplo = false }: Props) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const aoFecharRef = useRef(aoFechar);
  const tituloId = useId();

  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    if (!aberto) return;
    focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        aoFecharRef.current();
        return;
      }
      if (e.key !== "Tab" || !caixaRef.current) return;
      const focaveis = Array.from(
        caixaRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL),
      ).filter((elemento) => !elemento.hasAttribute("hidden"));
      if (!focaveis.length) {
        e.preventDefault();
        caixaRef.current.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!caixaRef.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primeiro).focus();
      } else if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTecla);
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const primeiro = caixaRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL);
      (primeiro ?? caixaRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = overflowAnterior;
      focoAnterior.current?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="modal-fundo"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
    >
      <div
        className={`modal-caixa${amplo ? " modal-caixa-ampla" : ""}`}
        ref={caixaRef}
        tabIndex={-1}
      >
        <div className="modal-topo">
          <strong id={tituloId}>{titulo}</strong>
          <button className="btn btn-fantasma btn-mini" type="button" onClick={aoFechar}>
            Fechar
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>
  );
}
