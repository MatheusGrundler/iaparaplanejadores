"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import EditorRico from "./EditorRico";
import { LIMITES_ANEXOS, tipoDoMime, validaNovoAnexo } from "@/lib/duvida";

/**
 * Modal do aluno: dúvida com texto formatado + anexos (10 imagens de até
 * 10 MB, 5 vídeos de até 100 MB). Upload vai direto pro Storage com URL
 * assinada. Mostra a resposta do Matheus quando existir.
 */

type Anexo = {
  id?: number;
  path: string;
  tipo: string;
  nome: string;
  url?: string;
};

type Props = {
  downloadId: number;
  aberto: boolean;
  aoFechar: () => void;
  aoRegistrar: () => void;
};

export default function DuvidaModal({ downloadId, aberto, aoFechar, aoRegistrar }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [html, setHtml] = useState("");
  const htmlRef = useRef("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [resposta, setResposta] = useState<string>("");
  const [subindo, setSubindo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const base = `/api/duvida/${downloadId}`;

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(base, { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setHtml(d.duvidaHtml || "");
        htmlRef.current = d.duvidaHtml || "";
        setAnexos(d.anexos || []);
        setResposta(d.respostaHtml || "");
      }
    } catch {
      setAviso("Não consegui carregar a dúvida agora.");
    }
    setCarregando(false);
  }, [base]);

  useEffect(() => {
    if (aberto) {
      setAviso(null);
      carregar();
    }
  }, [aberto, carregar]);

  async function anexar(arquivos: FileList | null) {
    if (!arquivos) return;
    for (const arquivo of Array.from(arquivos)) {
      const tipo = tipoDoMime(arquivo.type);
      if (!tipo) {
        setAviso(`"${arquivo.name}": só imagens e vídeos.`);
        continue;
      }
      const problema = validaNovoAnexo(anexos, tipo, arquivo.size);
      if (problema) {
        setAviso(`"${arquivo.name}": ${problema}`);
        continue;
      }
      setAviso(null);
      setSubindo(arquivo.name);
      try {
        const pedido = await fetch(`${base}/anexo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: arquivo.name,
            mime: arquivo.type,
            bytes: arquivo.size,
          }),
        }).then((r) => r.json());
        if (!pedido.ok) throw new Error(pedido.erro || "falha ao preparar");

        const upload = await fetch(pedido.url, {
          method: "PUT",
          headers: { "Content-Type": arquivo.type, "x-upsert": "false" },
          body: arquivo,
        });
        if (!upload.ok) throw new Error("falha no upload");

        const confirma = await fetch(`${base}/anexo`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pedido.path,
            mime: arquivo.type,
            bytes: arquivo.size,
          }),
        }).then((r) => r.json());
        if (!confirma.ok) throw new Error(confirma.erro || "falha ao confirmar");

        setAnexos((atual) => [...atual, { path: pedido.path, tipo, nome: arquivo.name }]);
      } catch (e) {
        setAviso(`"${arquivo.name}": ${e instanceof Error ? e.message : "falha no envio"}`);
      }
      setSubindo(null);
    }
    if (arquivoRef.current) arquivoRef.current.value = "";
  }

  async function removerAnexo(path: string) {
    const r = await fetch(`${base}/anexo`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    })
      .then((x) => x.json())
      .catch(() => ({ ok: false }));
    if (r.ok) setAnexos((atual) => atual.filter((a) => a.path !== path));
  }

  async function enviar() {
    const conteudo = htmlRef.current.trim();
    const vazio = !conteudo || conteudo === "<p></p>";
    if (vazio && anexos.length === 0) {
      setAviso("Escreve a dúvida ou anexa alguma coisa antes de enviar.");
      return;
    }
    setEnviando(true);
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: conteudo }),
    })
      .then((x) => x.json())
      .catch(() => ({ ok: false }));
    setEnviando(false);
    if (r.ok) {
      aoRegistrar();
      aoFechar();
    } else {
      setAviso("Não consegui enviar agora. Tenta de novo em instantes.");
    }
  }

  const imagens = anexos.filter((a) => a.tipo === "imagem").length;
  const videos = anexos.filter((a) => a.tipo === "video").length;

  return (
    <Modal aberto={aberto} titulo="Sua dúvida" aoFechar={aoFechar}>
      {carregando ? (
        <p className="muted">Carregando…</p>
      ) : (
        <>
          {resposta && (
            <div className="duvida-resposta">
              <div className="muted" style={{ fontSize: ".8rem", marginBottom: 6 }}>
                Resposta do Matheus
              </div>
              <div className="duvida-html" dangerouslySetInnerHTML={{ __html: resposta }} />
            </div>
          )}

          <p className="muted" style={{ margin: "0 0 8px" }}>
            Escreve do seu jeito. Vai direto pro Matheus e pode virar tema da próxima live de
            dúvidas.
          </p>
          <EditorRico
            inicial={html}
            placeholder="Qual é a sua dúvida?"
            aoMudar={(h) => {
              htmlRef.current = h;
            }}
          />

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-fantasma btn-mini"
                disabled={Boolean(subindo)}
                onClick={() => arquivoRef.current?.click()}
              >
                {subindo ? `Enviando ${subindo}…` : "Anexar imagem ou vídeo"}
              </button>
              <span className="muted" style={{ fontSize: ".8rem" }}>
                {imagens}/{LIMITES_ANEXOS.imagens} imagens (10 MB cada) · {videos}/
                {LIMITES_ANEXOS.videos} vídeos (100 MB cada)
              </span>
            </div>
            <input
              ref={arquivoRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => anexar(e.target.files)}
            />
            {anexos.length > 0 && (
              <ul className="anexo-lista">
                {anexos.map((a) => (
                  <li key={a.path}>
                    <span className="pill">{a.tipo}</span> {a.nome}
                    <button
                      type="button"
                      className="btn btn-fantasma btn-mini"
                      onClick={() => removerAnexo(a.path)}
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {aviso && (
            <p className="muted" role="status" style={{ color: "var(--terra, #C2683B)" }}>
              {aviso}
            </p>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              className="btn btn-mini"
              disabled={enviando || Boolean(subindo)}
              onClick={enviar}
            >
              {enviando ? "Enviando…" : "Enviar dúvida"}
            </button>
            <button className="btn btn-fantasma btn-mini" onClick={aoFechar}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
