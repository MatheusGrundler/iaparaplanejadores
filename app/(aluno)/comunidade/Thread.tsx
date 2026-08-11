"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./comunidade.module.css";

export type Resposta = {
  id: number;
  post_id: number;
  parent_id: number | null;
  autor: string;
  conteudo_html: string;
  created_at: string;
};

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function IconeResposta() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11.2a7.3 7.3 0 0 1-7.6 7.1 8 8 0 0 1-3.2-.7L4 19l1.5-4.3A6.8 6.8 0 0 1 4.8 12 7.3 7.3 0 0 1 12.4 5 7.3 7.3 0 0 1 20 11.2Z" />
    </svg>
  );
}

export default function Thread({ postId, respostas }: { postId: number; respostas: Resposta[] }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [respondendoA, setRespondendoA] = useState<Resposta | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const filhos = useMemo(() => {
    const mapa = new Map<number | null, Resposta[]>();
    for (const resposta of respostas) {
      const lista = mapa.get(resposta.parent_id) ?? [];
      lista.push(resposta);
      mapa.set(resposta.parent_id, lista);
    }
    return mapa;
  }, [respostas]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = texto.trim();
    if (!valor || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/comunidade/publicacoes/${postId}/respostas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: `<p>${valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`, parentId: respondendoA?.id }),
      });
      const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Não foi possível enviar sua resposta.");
      setTexto("");
      setRespondendoA(null);
      setAberta(true);
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível enviar sua resposta.");
    } finally {
      setEnviando(false);
    }
  }

  function RespostaItem({ resposta, nivel = 0 }: { resposta: Resposta; nivel?: number }) {
    const aninhadas = filhos.get(resposta.id) ?? [];
    return (
      <li className={styles.resposta} data-nivel={Math.min(nivel, 2)}>
        <div className={styles.avatarResposta} aria-hidden="true">{iniciais(resposta.autor)}</div>
        <div className={styles.respostaCorpo}>
          <div className={styles.respostaMeta}>
            <strong>{resposta.autor}</strong>
            <time dateTime={resposta.created_at}>{quando(resposta.created_at)}</time>
          </div>
          <div className={styles.respostaTexto} dangerouslySetInnerHTML={{ __html: resposta.conteudo_html }} />
          <button className={styles.responder} type="button" onClick={() => { setAberta(true); setRespondendoA(resposta); }}>
            Responder
          </button>
          {aninhadas.length > 0 && (
            <ol className={styles.respostasAninhadas}>
              {aninhadas.map((filha) => <RespostaItem key={filha.id} resposta={filha} nivel={nivel + 1} />)}
            </ol>
          )}
        </div>
      </li>
    );
  }

  return (
    <section className={styles.thread} aria-label="Respostas da publicação">
      <button className={styles.abrirThread} type="button" onClick={() => setAberta((atual) => !atual)} aria-expanded={aberta}>
        <IconeResposta />
        {respostas.length === 0 ? "Iniciar conversa" : `${respostas.length} ${respostas.length === 1 ? "resposta" : "respostas"}`}
        <span>{aberta ? "Ocultar" : "Ver conversa"}</span>
      </button>
      {aberta && (
        <div className={styles.threadAberta}>
          {respostas.length > 0 && <ol className={styles.respostas}>{(filhos.get(null) ?? []).map((resposta) => <RespostaItem key={resposta.id} resposta={resposta} />)}</ol>}
          <form className={styles.formResposta} onSubmit={enviar}>
            {respondendoA && <div className={styles.respondendo}>Respondendo a <strong>{respondendoA.autor}</strong><button type="button" onClick={() => setRespondendoA(null)}>Cancelar</button></div>}
            <label className="sr-only" htmlFor={`resposta-${postId}`}>Escreva uma resposta</label>
            <textarea id={`resposta-${postId}`} value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="Participe da conversa…" maxLength={6000} rows={2} disabled={enviando} />
            <div className={styles.formRespostaRodape}>
              {erro ? <p role="alert">{erro}</p> : <span>Seja gentil e compartilhe o que ajuda.</span>}
              <button type="submit" disabled={!texto.trim() || enviando}>{enviando ? "Enviando…" : "Responder"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
