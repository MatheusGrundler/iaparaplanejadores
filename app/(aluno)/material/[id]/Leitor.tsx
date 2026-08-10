"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DuvidaModal from "@/app/componentes/DuvidaModal";
import { mensagemVeioDoMaterial } from "@/lib/materiais";

/**
 * Leitor de material dentro do app.
 * - Mostra o HTML/PDF no iframe (servido por /api/material/[id], sem download).
 * - Soma tempo de tela enquanto a aba está visível (pulsos de até 30 s).
 * - Registra o status do aluno: li / li e entendi / tenho dúvidas (com texto).
 */

const TICK_SEGUNDOS = 5;
const FLUSH_A_CADA = 30;

type Props = {
  id: number;
  titulo: string;
  statusInicial: string | null;
};

export default function Leitor({ id, titulo, statusInicial }: Props) {
  const [status, setStatus] = useState<string | null>(statusInicial);
  const [caixaDuvida, setCaixaDuvida] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const pendentes = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const enviar = useCallback(
    (payload: Record<string, unknown>, beacon = false) => {
      const corpo = JSON.stringify(payload);
      const url = `/api/leitura/${id}`;
      if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([corpo], { type: "application/json" }));
        return Promise.resolve(null);
      }
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corpo,
        keepalive: true,
      }).catch(() => null);
    },
    [id],
  );

  useEffect(() => {
    enviar({ acao: "abrir" });

    // Materiais interativos (ex.: canvas da Semana 0) mandam as respostas
    // via postMessage; daqui elas seguem pro registro de leitura.
    const aoMensagem = (e: MessageEvent) => {
      // Com a origem isolada, o material roda num origin opaco (`null`). A
      // referência da janela garante que só o iframe deste leitor é aceito.
      if (!mensagemVeioDoMaterial(e, iframeRef.current?.contentWindow)) return;
      const d = e.data as { iappRespostas?: unknown } | null;
      if (
        d &&
        typeof d === "object" &&
        d.iappRespostas &&
        typeof d.iappRespostas === "object" &&
        !Array.isArray(d.iappRespostas)
      ) {
        enviar({ acao: "respostas", respostas: d.iappRespostas });
      }
    };
    window.addEventListener("message", aoMensagem);

    const despeja = (beacon: boolean) => {
      const segundos = pendentes.current;
      if (segundos < TICK_SEGUNDOS) return;
      pendentes.current = 0;
      enviar({ acao: "pulso", segundos }, beacon);
    };

    const relogio = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        pendentes.current += TICK_SEGUNDOS;
        if (pendentes.current >= FLUSH_A_CADA) despeja(false);
      }
    }, TICK_SEGUNDOS * 1000);

    const aoEsconder = () => {
      if (document.visibilityState === "hidden") despeja(true);
    };
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", () => despeja(true));

    return () => {
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("message", aoMensagem);
      despeja(true);
    };
  }, [enviar]);

  async function marcar(novo: "lido" | "entendido") {
    setSalvando(true);
    setAviso(null);
    const resposta = await enviar({ acao: "status", status: novo });
    setSalvando(false);
    if (resposta && "ok" in resposta && resposta.ok) {
      setStatus(novo);
      setAviso("Registrado. Pode mudar quando quiser.");
    } else {
      setAviso("Não consegui salvar agora. Tenta de novo em instantes?");
    }
  }

  const rotulo =
    status === "lido"
      ? "Lido"
      : status === "entendido"
        ? "Entendido"
        : status === "duvida"
          ? "Com dúvidas"
          : null;

  return (
    <main className="leitor-cheio">
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          marginBottom: 10,
          padding: "10px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link href="/arquivo" className="btn btn-fantasma btn-mini">
            ← Materiais
          </Link>
          <strong>{titulo}</strong>
          {rotulo && <span className="pill">{rotulo}</span>}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span className="muted" style={{ fontSize: ".85rem" }}>
            Terminou?
          </span>
          <button className="btn btn-mini" disabled={salvando} onClick={() => marcar("lido")}>
            Li
          </button>
          <button className="btn btn-mini" disabled={salvando} onClick={() => marcar("entendido")}>
            Li e entendi
          </button>
          <button
            className="btn btn-fantasma btn-mini"
            disabled={salvando}
            onClick={() => setCaixaDuvida(true)}
          >
            Tenho dúvidas
          </button>
        </div>
      </div>

      <DuvidaModal
        downloadId={id}
        aberto={caixaDuvida}
        aoFechar={() => setCaixaDuvida(false)}
        aoRegistrar={() => {
          setStatus("duvida");
          setAviso("Dúvida enviada pro Matheus. Ela pode virar tema da próxima live.");
        }}
      />

      {aviso && (
        <p className="muted" role="status" style={{ margin: "0 0 12px" }}>
          {aviso}
        </p>
      )}

      <iframe
        ref={iframeRef}
        src={`/api/material/${id}`}
        title={titulo}
        sandbox="allow-scripts allow-popups"
        style={{
          width: "100%",
          height: "calc(100vh - 170px)",
          minHeight: 480,
          border: "1px solid #2D333D",
          borderRadius: 12,
          background: "#F4F7EE",
        }}
      />
    </main>
  );
}
