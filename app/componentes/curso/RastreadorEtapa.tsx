"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SemanaKey } from "@/lib/curso-atividades";

const TICK_SEGUNDOS = 5;
const FLUSH_A_CADA = 30;

export default function RastreadorEtapa({ semanaKey }: { semanaKey: SemanaKey }) {
  const pendentes = useRef(0);

  const enviar = useCallback(
    (payload: Record<string, unknown>, beacon = false) => {
      const url = `/api/curso/acessos/${semanaKey}`;
      const corpo = JSON.stringify(payload);
      if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([corpo], { type: "application/json" }));
        return;
      }
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corpo,
        keepalive: true,
      }).catch(() => undefined);
    },
    [semanaKey],
  );

  useEffect(() => {
    enviar({ acao: "abrir" });

    const despejar = (beacon: boolean) => {
      const segundos = pendentes.current;
      if (segundos < TICK_SEGUNDOS) return;
      pendentes.current = 0;
      enviar({ acao: "pulso", segundos }, beacon);
    };

    const relogio = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pendentes.current += TICK_SEGUNDOS;
      if (pendentes.current >= FLUSH_A_CADA) despejar(false);
    }, TICK_SEGUNDOS * 1000);

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") despejar(true);
    };
    const aoSair = () => despejar(true);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("pagehide", aoSair);

    return () => {
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("pagehide", aoSair);
      despejar(true);
    };
  }, [enviar]);

  return null;
}
