"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Upload, defaultOptions } from "tus-js-client";
import EditorRico from "@/app/componentes/EditorRico";
import {
  BUCKET_COMUNIDADE,
  formatarBytesComunidade,
  MAX_ANEXOS_COMUNIDADE,
  MAX_BYTES_COMUNIDADE,
  validarNovoAnexoComunidade,
  type TipoAnexoComunidade,
} from "@/lib/comunidade-anexos";
import styles from "./comunidade.module.css";

export { formatarBytesComunidade as formatarBytes } from "@/lib/comunidade-anexos";

const LIMITE_PUT = 6 * 1024 * 1024;

type EstadoAnexo = "aguardando" | "preparando" | "enviando" | "confirmando" | "erro";

export type AnexoLocal = {
  id: string;
  arquivo: File;
  mime: string;
  tipo: TipoAnexoComunidade;
  previewUrl?: string;
  estado: EstadoAnexo;
  progresso: number;
  tentativa: number;
  erro?: string;
};

type RespostaJson = {
  ok?: boolean;
  id?: string | number;
  path?: string;
  url?: string;
  token?: string;
  mime?: string;
  erro?: string;
  error?: string;
};

export function mensagemDeErro(body: RespostaJson | null, fallback: string) {
  return body?.erro || body?.error || fallback;
}

export async function respostaJson(response: Response): Promise<RespostaJson | null> {
  try {
    return (await response.json()) as RespostaJson;
  } catch {
    return null;
  }
}

export function temTexto(html: string) {
  return (
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .trim().length > 0
  );
}

export function rotuloTipo(tipo: TipoAnexoComunidade) {
  if (tipo === "video") return "vídeo";
  if (tipo === "audio") return "áudio";
  return tipo;
}

export function criarPreview(arquivo: File, tipo: TipoAnexoComunidade) {
  return tipo !== "documento" ? URL.createObjectURL(arquivo) : undefined;
}

export function endpointTus() {
  const origem = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origem) throw new Error("O envio de arquivos grandes não está configurado.");
  const url = new URL(origem);
  if (url.hostname.endsWith(".supabase.co") && !url.hostname.endsWith(".storage.supabase.co")) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  }
  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function enviarComTus(
  arquivo: File,
  path: string,
  token: string,
  mime: string,
  atualizar: (progresso: number, tentativa?: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const upload = new Upload(arquivo, {
      endpoint: endpointTus(),
      chunkSize: LIMITE_PUT,
      uploadDataDuringCreation: true,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,
      headers: { "x-signature": token },
      metadata: {
        bucketName: BUCKET_COMUNIDADE,
        objectName: path,
        contentType: mime,
      },
      onProgress: (enviados, total) => {
        atualizar(total > 0 ? Math.round((enviados / total) * 100) : 0);
      },
      onShouldRetry: (erro, tentativa, opcoes) => {
        const repetir = defaultOptions.onShouldRetry?.(erro, tentativa, opcoes) ?? false;
        if (repetir) atualizar(0, tentativa + 1);
        return repetir;
      },
      onSuccess: () => resolve(),
      onError: (erro) => reject(erro),
    });

    upload.start();
  });
}

export function PreviewAnexo({ anexo }: { anexo: AnexoLocal }) {
  const tipo = anexo.tipo;

  if (tipo === "imagem" && anexo.previewUrl) {
    return (
      <Image
        className={styles.previewImagem}
        src={anexo.previewUrl}
        alt={`Prévia de ${anexo.arquivo.name}`}
        width={112}
        height={76}
        unoptimized
      />
    );
  }

  if (tipo === "video" && anexo.previewUrl) {
    return (
      <video
        className={styles.previewMidia}
        src={anexo.previewUrl}
        aria-label={`Prévia de ${anexo.arquivo.name}`}
        controls
        preload="metadata"
      />
    );
  }

  if (tipo === "audio" && anexo.previewUrl) {
    return (
      <audio
        className={styles.previewAudio}
        src={anexo.previewUrl}
        aria-label={`Prévia de ${anexo.arquivo.name}`}
        controls
        preload="metadata"
      />
    );
  }

  return (
    <span className={styles.iconeDocumento} aria-hidden="true">
      DOC
    </span>
  );
}

export default function Composer() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const anexosRef = useRef<AnexoLocal[]>([]);
  const [html, setHtml] = useState("");
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [chaveEditor, setChaveEditor] = useState(0);

  useEffect(() => {
    anexosRef.current = anexos;
  }, [anexos]);

  useEffect(
    () => () => {
      for (const anexo of anexosRef.current) {
        if (anexo.previewUrl) URL.revokeObjectURL(anexo.previewUrl);
      }
    },
    [],
  );

  function atualizarAnexo(id: string, mudancas: Partial<AnexoLocal>) {
    setAnexos((atuais) =>
      atuais.map((anexo) => (anexo.id === id ? { ...anexo, ...mudancas } : anexo)),
    );
  }

  function selecionarArquivos(arquivos: FileList | null) {
    if (!arquivos?.length) return;

    setErro("");
    setMensagem("");
    const atuais = anexosRef.current;
    const chaves = new Set(
      atuais.map(
        ({ arquivo }) => `${arquivo.name}:${arquivo.size}:${arquivo.lastModified}:${arquivo.type}`,
      ),
    );
    const candidatos = Array.from(arquivos).filter(
      (arquivo) =>
        !chaves.has(`${arquivo.name}:${arquivo.size}:${arquivo.lastModified}:${arquivo.type}`),
    );

    if (atuais.length + candidatos.length > MAX_ANEXOS_COMUNIDADE) {
      setErro(`Cada publicação aceita até ${MAX_ANEXOS_COMUNIDADE} arquivos.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const totalAtual = atuais.reduce((soma, anexo) => soma + anexo.arquivo.size, 0);
    const totalNovo = candidatos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    if (totalAtual + totalNovo > MAX_BYTES_COMUNIDADE) {
      setErro("Os arquivos de uma publicação podem somar até 200 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const validados: Array<{
      arquivo: File;
      mime: string;
      tipo: TipoAnexoComunidade;
    }> = [];
    for (const arquivo of candidatos) {
      const validacao = validarNovoAnexoComunidade(arquivo.type, arquivo.size, arquivo.name);
      if ("erro" in validacao) {
        setErro(`${arquivo.name}: ${validacao.erro}`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      validados.push({ arquivo, mime: validacao.mime, tipo: validacao.regra.tipo });
    }
    const novos: AnexoLocal[] = validados.map(({ arquivo, mime, tipo }) => ({
      id: crypto.randomUUID(),
      arquivo,
      mime,
      tipo,
      previewUrl: criarPreview(arquivo, tipo),
      estado: "aguardando",
      progresso: 0,
      tentativa: 0,
    }));
    setAnexos([...atuais, ...novos]);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removerAnexo(id: string) {
    setAnexos((atuais) => {
      const removido = atuais.find((anexo) => anexo.id === id);
      if (removido?.previewUrl) URL.revokeObjectURL(removido.previewUrl);
      return atuais.filter((anexo) => anexo.id !== id);
    });
  }

  async function prepararAnexo(publicacaoId: string, anexo: AnexoLocal) {
    atualizarAnexo(anexo.id, {
      estado: "preparando",
      progresso: 0,
      tentativa: 0,
      erro: undefined,
    });

    const mimeInformado = anexo.mime;
    const endpoint = `/api/comunidade/publicacoes/${publicacaoId}/anexos`;
    const preparo = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: anexo.arquivo.name,
        mime: mimeInformado,
        bytes: anexo.arquivo.size,
      }),
    });
    const body = await respostaJson(preparo);

    if (!preparo.ok || !body?.ok || !body.path) {
      throw new Error(mensagemDeErro(body, `Não foi possível preparar ${anexo.arquivo.name}.`));
    }

    const mime = body.mime || mimeInformado;

    atualizarAnexo(anexo.id, { estado: "enviando", progresso: 0 });

    if (anexo.arquivo.size > LIMITE_PUT) {
      if (!body.token) {
        throw new Error(`O envio resumível de ${anexo.arquivo.name} não foi autorizado.`);
      }
      await enviarComTus(anexo.arquivo, body.path, body.token, mime, (progresso, tentativa) => {
        atualizarAnexo(anexo.id, {
          progresso,
          ...(tentativa === undefined ? {} : { tentativa }),
        });
      });
    } else {
      if (!body.url) {
        throw new Error(`O envio de ${anexo.arquivo.name} não foi autorizado.`);
      }
      const envio = await fetch(body.url, {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: anexo.arquivo,
      });
      if (!envio.ok) throw new Error(`O envio de ${anexo.arquivo.name} falhou.`);
      atualizarAnexo(anexo.id, { progresso: 100 });
    }

    atualizarAnexo(anexo.id, { estado: "confirmando", progresso: 100 });
    const confirmacao = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: body.path, mime, bytes: anexo.arquivo.size }),
    });
    const confirmacaoBody = await respostaJson(confirmacao);
    if (!confirmacao.ok || !confirmacaoBody?.ok) {
      throw new Error(
        mensagemDeErro(confirmacaoBody, `Não foi possível confirmar ${anexo.arquivo.name}.`),
      );
    }

    return body.path;
  }

  async function limparRascunho(publicacaoId: string, paths: string[]) {
    const endpoint = `/api/comunidade/publicacoes/${publicacaoId}/anexos`;
    await Promise.allSettled(
      paths.map((path) =>
        fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        }),
      ),
    );
    await fetch(`/api/comunidade/publicacoes/${publicacaoId}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  }

  async function publicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || (!temTexto(html) && anexos.length === 0)) return;

    setEnviando(true);
    setErro("");
    setMensagem("Preparando sua publicação…");
    setAnexos((atuais) =>
      atuais.map((anexo) => ({
        ...anexo,
        estado: "aguardando",
        progresso: 0,
        tentativa: 0,
        erro: undefined,
      })),
    );

    let publicacaoId = "";
    const paths: string[] = [];
    let anexoAtual = "";

    try {
      const criacao = await fetch("/api/comunidade/publicacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: temTexto(html) ? html : "" }),
      });
      const criacaoBody = await respostaJson(criacao);
      if (!criacao.ok || !criacaoBody?.ok || !criacaoBody.id) {
        throw new Error(mensagemDeErro(criacaoBody, "Não foi possível criar a publicação."));
      }
      publicacaoId = String(criacaoBody.id);

      for (const anexo of anexos) {
        anexoAtual = anexo.id;
        setMensagem(`Enviando ${anexo.arquivo.name}…`);
        paths.push(await prepararAnexo(publicacaoId, anexo));
      }

      setMensagem("Publicando na comunidade…");
      const publicacao = await fetch(`/api/comunidade/publicacoes/${publicacaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const publicacaoBody = await respostaJson(publicacao);
      if (!publicacao.ok || !publicacaoBody?.ok) {
        throw new Error(mensagemDeErro(publicacaoBody, "Não foi possível concluir a publicação."));
      }

      for (const anexo of anexos) {
        if (anexo.previewUrl) URL.revokeObjectURL(anexo.previewUrl);
      }
      setHtml("");
      setAnexos([]);
      setChaveEditor((chave) => chave + 1);
      setMensagem("Publicado. Sua contribuição já está visível na comunidade.");
      router.refresh();
    } catch (falha) {
      const texto = falha instanceof Error ? falha.message : "Não foi possível publicar agora.";
      if (anexoAtual) atualizarAnexo(anexoAtual, { estado: "erro", erro: texto });
      if (publicacaoId) await limparRascunho(publicacaoId, paths);
      setAnexos((atuais) =>
        atuais.map((anexo) =>
          anexo.id === anexoAtual
            ? anexo
            : { ...anexo, estado: "aguardando", progresso: 0, tentativa: 0 },
        ),
      );
      setMensagem("");
      setErro(`${texto} Você pode tentar novamente sem selecionar os arquivos de novo.`);
    } finally {
      setEnviando(false);
    }
  }

  const podePublicar = temTexto(html) || anexos.length > 0;

  return (
    <form className={styles.composer} onSubmit={publicar} aria-busy={enviando}>
      <div className={styles.composerCabecalho}>
        <div>
          <h2>Compartilhe com a comunidade</h2>
          <p id="ajuda-publicacao">
            Escreva uma atualização ou publique imagens, vídeos, áudios e documentos.
          </p>
        </div>
        <span className={styles.visibilidade}>Visível na comunidade</span>
      </div>

      <EditorRico
        key={chaveEditor}
        placeholder="O que você quer compartilhar?"
        rotuloAria="Texto da publicação"
        descritoPor="ajuda-publicacao"
        desabilitado={enviando}
        aoMudar={setHtml}
      />

      {anexos.length > 0 && (
        <ul className={styles.listaAnexos} aria-label="Arquivos selecionados">
          {anexos.map((anexo) => {
            const emProgresso = ["preparando", "enviando", "confirmando"].includes(anexo.estado);
            return (
              <li className={styles.anexoLocal} key={anexo.id}>
                <PreviewAnexo anexo={anexo} />
                <div className={styles.anexoDados}>
                  <strong>{anexo.arquivo.name}</strong>
                  <span>
                    {rotuloTipo(anexo.tipo)} · {formatarBytesComunidade(anexo.arquivo.size)}
                  </span>
                  {emProgresso && (
                    <div className={styles.progressoGrupo}>
                      <div
                        className={styles.progresso}
                        role="progressbar"
                        aria-label={`Envio de ${anexo.arquivo.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={anexo.progresso}
                      >
                        <span style={{ width: `${anexo.progresso}%` }} />
                      </div>
                      <span>
                        {anexo.estado === "preparando" && "Preparando…"}
                        {anexo.estado === "enviando" && `${anexo.progresso}% enviado`}
                        {anexo.estado === "confirmando" && "Confirmando…"}
                        {anexo.tentativa > 0 && ` · nova tentativa ${anexo.tentativa}`}
                      </span>
                    </div>
                  )}
                  {anexo.erro && <span className={styles.erroAnexo}>{anexo.erro}</span>}
                </div>
                <button
                  className={styles.removerAnexo}
                  type="button"
                  onClick={() => removerAnexo(anexo.id)}
                  disabled={enviando}
                  aria-label={`Remover ${anexo.arquivo.name}`}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.composerRodape}>
        <div>
          <input
            ref={inputRef}
            id="anexos-comunidade"
            className={styles.inputArquivo}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,application/pdf,text/plain,text/csv,.m4a,.docx,.xlsx,.pptx"
            onChange={(evento) => selecionarArquivos(evento.currentTarget.files)}
            disabled={enviando}
          />
          <label className={styles.botaoAnexo} htmlFor="anexos-comunidade">
            <span aria-hidden="true">＋</span> Adicionar arquivos
          </label>
          <p className={styles.notaUpload}>
            Até 10 arquivos e 200 MB no total. Arquivos grandes retomam se a rede oscilar.
          </p>
        </div>
        <button className={styles.publicar} type="submit" disabled={!podePublicar || enviando}>
          {enviando ? "Publicando…" : erro ? "Tentar novamente" : "Publicar"}
        </button>
      </div>

      <div className={styles.retorno} aria-live="polite" aria-atomic="true">
        {erro ? (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        ) : mensagem ? (
          <p className={styles.sucesso}>{mensagem}</p>
        ) : null}
      </div>
    </form>
  );
}
