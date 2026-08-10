"use client";

import { useEffect } from "react";

type Props = {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
};

export default function Modal({ aberto, titulo, aoFechar, children }: Props) {
  useEffect(() => {
    if (!aberto) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className="modal-fundo"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="modal-caixa">
        <div className="modal-topo">
          <strong>{titulo}</strong>
          <button className="btn btn-fantasma btn-mini" onClick={aoFechar}>
            Fechar
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>
  );
}
