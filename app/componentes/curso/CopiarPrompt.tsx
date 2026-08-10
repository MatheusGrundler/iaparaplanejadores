"use client";

import { useState } from "react";

export default function CopiarPrompt({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <button className="btn btn-fantasma btn-mini prompt-copiar" type="button" onClick={copiar}>
      {copiado ? "Copiado" : "Copiar prompt"}
    </button>
  );
}
