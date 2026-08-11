"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/app/componentes/Modal";
import EditorRico from "@/app/componentes/EditorRico";

/** Painel do admin: vê a dúvida rica (com anexos) e responde com editor. */

type Anexo = {
  id?: number;
  path: string;
  tipo: string;
  nome: string;
  url?: string;
};

type Props = {
  downloadId: number;
  alunoEmail: string;
  alunoNome: string;
  respondida: boolean;
};

export default function DuvidaAdmin({ downloadId, alunoEmail, alunoNome, respondida }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [duvidaHtml, setDuvidaHtml] = useState("");
  const [respostaAtual, setRespostaAtual] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const respostaRef = useRef("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/duvida/${downloadId}?aluno=${encodeURIComponent(alunoEmail)}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (d.ok) {
        setDuvidaHtml(d.duvidaHtml || "");
        setRespostaAtual(d.respostaHtml || "");
        respostaRef.current = d.respostaHtml || "";
        setAnexos(d.anexos || []);
      }
    } catch {
      setAviso("Não consegui carregar a dúvida.");
    }
    setCarregando(false);
  }, [downloadId, alunoEmail]);

  useEffect(() => {
    if (aberto) {
      setAviso(null);
      carregar();
    }
  }, [aberto, carregar]);

  async function responder() {
    const html = respostaRef.current.trim();
    if (!html || html === "<p></p>") {
      setAviso("Escreve a resposta antes de enviar.");
      return;
    }
    setSalvando(true);
    const r = await fetch(`/api/duvida/${downloadId}/responder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aluno: alunoEmail, html }),
    })
      .then((x) => x.json())
      .catch(() => ({ ok: false }));
    setSalvando(false);
    if (r.ok) {
      setAviso("Resposta salva. O aluno vê ao abrir a dúvida no material.");
      setRespostaAtual(html);
    } else {
      setAviso(r.erro || "Falha ao salvar a resposta.");
    }
  }

  return (
    <>
      <button className="btn btn-fantasma btn-mini" onClick={() => setAberto(true)}>
        {respondida ? "Ver conversa" : "Abrir dúvida"}
      </button>
      <Modal aberto={aberto} titulo={`Dúvida de ${alunoNome}`} aoFechar={() => setAberto(false)}>
        {carregando ? (
          <p className="muted">Carregando…</p>
        ) : (
          <>
            {duvidaHtml ? (
              <div className="duvida-html" dangerouslySetInnerHTML={{ __html: duvidaHtml }} />
            ) : (
              <p className="muted">Sem texto; só o registro do status (ou anexos abaixo).</p>
            )}

            {anexos.length > 0 && (
              <div className="anexo-galeria">
                {anexos.map((a) =>
                  a.tipo === "imagem" ? (
                    <a key={a.path} href={a.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.nome} />
                    </a>
                  ) : (
                    <video key={a.path} src={a.url} controls preload="metadata" />
                  ),
                )}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <div className="muted" style={{ fontSize: ".875rem", marginBottom: 6 }}>
                {respostaAtual ? "Sua resposta (editar reenvia)" : "Sua resposta"}
              </div>
              <EditorRico
                inicial={respostaAtual}
                placeholder="Responde aqui. O aluno vê dentro do material."
                aoMudar={(h) => {
                  respostaRef.current = h;
                }}
              />
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <button className="btn btn-mini" disabled={salvando} onClick={responder}>
                  {salvando ? "Salvando…" : "Responder"}
                </button>
                {aviso && (
                  <span className="muted" role="status">
                    {aviso}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
