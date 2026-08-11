"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { RegistroFormularios } from "@/lib/formularios/registro";
import {
  estadoVazio,
  formularioBloqueado,
  type AnexoFormulario,
  type CampoFormulario,
  type DefinicaoFormulario,
  type EstadoFormulario,
  type RegistroEnvioFormulario,
} from "@/lib/formularios/schema";
import { REGISTRO_FORMULARIOS } from "@/lib/formularios/seeds";
import {
  mensagemErroRuntime,
  type ContextoRuntimeFormulario,
  type FormularioRuntimeAdapter,
} from "@/lib/formularios/runtime";
import {
  aplicarRascunhoLocalAoEstado,
  lerRascunhoLocal,
  removerRascunhoLocal,
  salvarRascunhoLocal,
} from "@/lib/formularios/rascunho-local";
import { validarArquivoFormulario, validarEnvioFormulario } from "@/lib/formularios/validacao";
import { useFormularioRuntime } from "./FormularioRuntimeProvider";
import styles from "./Formulario.module.css";
import a11yStyles from "./Acessibilidade.module.css";

type FaseFormulario = "carregando" | "quieto" | "salvo" | "enviando" | "erro";

export type FormularioProps = {
  codigo: string;
  versao?: number;
  /** Definição ainda não registrada, usada na prévia do construtor. */
  definicao?: DefinicaoFormulario;
  registro?: RegistroFormularios;
  adapter?: FormularioRuntimeAdapter;
  contexto?: ContextoRuntimeFormulario;
  estadoInicial?: EstadoFormulario;
  somenteLeitura?: boolean;
  mostrarHistorico?: boolean;
  className?: string;
  onEstadoChange?: (estado: EstadoFormulario) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function tamanho(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dataBr(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

function armazenamentoDaSessao() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function rotuloStatus(
  definicao: DefinicaoFormulario,
  estado: EstadoFormulario,
  fase: FaseFormulario,
  somenteLeitura: boolean,
) {
  if (somenteLeitura) return "Somente leitura";
  if (fase === "carregando") return "Carregando…";
  if (fase === "enviando") return "Enviando…";
  if (fase === "erro") return "Não foi possível concluir";
  if (estado.atual.status === "revisado") return "Quest revisada";
  if (estado.atual.status === "enviado") return "Quest enviada";
  if (fase === "salvo" && definicao.workflow.tipo === "duvida") return "Dúvida enviada";
  return "Pronto para enviar";
}

function classeStatus(estado: EstadoFormulario, fase: FaseFormulario) {
  if (fase === "erro") return styles.statusErro;
  if (fase === "salvo" || ["enviado", "revisado"].includes(estado.atual.status)) {
    return styles.statusPositivo;
  }
  if (fase === "enviando") return styles.statusAtivo;
  return undefined;
}

function CampoEntrada({
  campo,
  id,
  valor,
  erro,
  desabilitado,
  onChange,
  onBlur,
}: {
  campo: CampoFormulario;
  id: string;
  valor: string;
  erro?: string;
  desabilitado: boolean;
  onChange: (valor: string) => void;
  onBlur: () => void;
}) {
  const ajudaId = campo.ajuda ? `${id}-ajuda` : undefined;
  const erroId = erro ? `${id}-erro` : undefined;
  const contadorId = campo.tipo === "textarea" ? `${id}-contador` : undefined;
  const describedBy = [ajudaId, erroId, contadorId].filter(Boolean).join(" ") || undefined;
  const comum = {
    id,
    value: valor,
    disabled: desabilitado,
    required: campo.obrigatorio,
    "aria-invalid": Boolean(erro) as boolean,
    "aria-describedby": describedBy,
    onBlur,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => onChange(event.target.value),
  };

  return (
    <div className={cx(styles.campo, campo.tipo === "textarea" && styles.campoLargo)}>
      <label htmlFor={id}>
        {campo.rotulo}
        {campo.obrigatorio && (
          <>
            <span className={styles.obrigatorio} aria-hidden="true">
              *
            </span>
            <span className={a11yStyles.srOnly}> (obrigatório)</span>
          </>
        )}
      </label>
      {campo.tipo === "textarea" ? (
        <textarea
          {...comum}
          rows={5}
          placeholder={campo.placeholder}
          minLength={campo.minimoCaracteres}
          maxLength={campo.maximoCaracteres}
        />
      ) : campo.tipo === "select" ? (
        <select {...comum}>
          <option value="">Escolha uma opção</option>
          {campo.opcoes.map((opcao) => (
            <option value={opcao.valor} key={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...comum}
          type={campo.tipo}
          placeholder={campo.placeholder}
          minLength={campo.minimoCaracteres}
          maxLength={campo.maximoCaracteres}
          autoComplete={campo.tipo === "email" ? "email" : campo.tipo === "url" ? "url" : "off"}
        />
      )}
      <div className={styles.campoMeta}>
        <span id={ajudaId}>{campo.ajuda}</span>
        {campo.tipo === "textarea" && (
          <span
            id={contadorId}
            aria-label={`${valor.length} de ${campo.maximoCaracteres} caracteres`}
          >
            {valor.length}/{campo.maximoCaracteres}
          </span>
        )}
      </div>
      {erro && (
        <p className={styles.erroCampo} id={erroId} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

function ListaAnexos({
  anexos,
  desabilitado,
  removendo,
  onRemover,
}: {
  anexos: readonly AnexoFormulario[];
  desabilitado: boolean;
  removendo: string | null;
  onRemover: (anexo: AnexoFormulario) => void;
}) {
  if (!anexos.length) return null;
  return (
    <ul className={styles.listaAnexos}>
      {anexos.map((anexo) => (
        <li key={anexo.id}>
          <span className={styles.tipoArquivo} aria-hidden="true">
            {anexo.mime.startsWith("image/") ? "IMG" : "ARQ"}
          </span>
          <span className={styles.nomeArquivo}>
            {anexo.url ? (
              <a href={anexo.url} target="_blank" rel="noreferrer">
                {anexo.nome}
              </a>
            ) : (
              <strong>{anexo.nome}</strong>
            )}
            <small>{tamanho(anexo.bytes)}</small>
          </span>
          <button
            className={styles.botaoTexto}
            type="button"
            disabled={desabilitado || removendo === anexo.id}
            onClick={() => onRemover(anexo)}
          >
            {removendo === anexo.id ? "Removendo…" : "Remover"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function HistoricoFormulario({
  definicao,
  historico,
}: {
  definicao: DefinicaoFormulario;
  historico: readonly RegistroEnvioFormulario[];
}) {
  if (definicao.workflow.tipo !== "duvida") return null;
  return (
    <section className={styles.historico} aria-labelledby={`${definicao.codigo}-historico`}>
      <h3 id={`${definicao.codigo}-historico`}>Suas perguntas</h3>
      {!historico.length ? (
        <p className={styles.historicoVazio}>
          Ainda não há perguntas enviadas. Quando você enviar uma, a resposta aparecerá aqui.
        </p>
      ) : (
        <ol>
          {historico.map((registro) => (
            <li key={registro.id}>
              <div className={styles.historicoMeta}>
                <time dateTime={registro.criadoEm}>{dataBr(registro.criadoEm)}</time>
                <span>{registro.resposta ? "Respondida" : "Aguardando resposta"}</span>
              </div>
              <div className={styles.respostasHistorico}>
                {definicao.campos.map((campo) =>
                  registro.valores[campo.chave] ? (
                    <div key={campo.chave}>
                      {definicao.campos.length > 1 && <strong>{campo.rotulo}</strong>}
                      <p>{registro.valores[campo.chave]}</p>
                    </div>
                  ) : null,
                )}
              </div>
              {registro.resposta && (
                <div className={styles.respostaEquipe}>
                  <strong>{registro.resposta.autor}</strong>
                  <p>{registro.resposta.texto}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Renderiza um formulário publicado apenas pelo seu código. */
export function Formulario({
  codigo,
  versao,
  definicao: definicaoDaPrevia,
  registro = REGISTRO_FORMULARIOS,
  adapter: adapterDaProp,
  contexto,
  estadoInicial,
  somenteLeitura = false,
  mostrarHistorico = true,
  className,
  onEstadoChange,
}: FormularioProps) {
  const runtimeCompartilhado = useFormularioRuntime();
  const definicao = useMemo(
    () =>
      definicaoDaPrevia ??
      registro.buscar(codigo, {
        versao,
        incluirNaoPublicados: Boolean(definicaoDaPrevia),
      }),
    [codigo, definicaoDaPrevia, registro, versao],
  );
  const adapter = useMemo(
    () =>
      adapterDaProp ??
      (definicao ? runtimeCompartilhado.resolver?.(definicao) : undefined) ??
      runtimeCompartilhado.adapter,
    [adapterDaProp, definicao, runtimeCompartilhado],
  );
  const contextoFinal = useMemo(
    () => ({ ...runtimeCompartilhado.contexto, ...contexto }),
    [contexto, runtimeCompartilhado],
  );
  const contextoSerializado = JSON.stringify(contextoFinal);

  const [estado, setEstado] = useState<EstadoFormulario | null>(() =>
    definicao ? (estadoInicial ?? estadoVazio(definicao)) : null,
  );
  const [fase, setFase] = useState<FaseFormulario>(
    adapter && !estadoInicial ? "carregando" : "quieto",
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [errosAnexos, setErrosAnexos] = useState<Record<string, string>>({});
  const [errosGerais, setErrosGerais] = useState<string[]>([]);
  const [subindo, setSubindo] = useState<Record<string, string>>({});
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [rascunhoPronto, setRascunhoPronto] = useState(false);
  const rascunhoAlterado = useRef(false);
  const baseRemota = useRef<EstadoFormulario | null>(null);

  function aplicarEstado(proximo: EstadoFormulario) {
    setEstado(proximo);
    onEstadoChange?.(proximo);
  }

  useEffect(() => {
    setRascunhoPronto(false);
    rascunhoAlterado.current = false;
    baseRemota.current = null;
    if (!definicao) {
      setEstado(null);
      setFase("erro");
      return;
    }
    let ativo = true;
    const inicial = estadoInicial ?? estadoVazio(definicao);

    const restaurarRascunho = (base: EstadoFormulario) => {
      const armazenamento = armazenamentoDaSessao();
      if (!armazenamento || somenteLeitura) return base;
      if (formularioBloqueado(definicao, base)) {
        removerRascunhoLocal(armazenamento, definicao, contextoFinal);
        return base;
      }
      const rascunho = lerRascunhoLocal(armazenamento, definicao, contextoFinal);
      if (!rascunho) return base;
      const resultado = aplicarRascunhoLocalAoEstado(definicao, base, rascunho);
      if (!resultado.aplicado) {
        removerRascunhoLocal(armazenamento, definicao, contextoFinal);
      }
      return resultado.estado;
    };

    if (estadoInicial || !adapter || somenteLeitura) {
      baseRemota.current = inicial;
      const restaurado = adapter ? restaurarRascunho(inicial) : inicial;
      setEstado(restaurado);
      setFase("quieto");
      setRascunhoPronto(Boolean(adapter) && !somenteLeitura);
      return;
    }
    setFase("carregando");
    setAviso(null);
    adapter
      .carregar({ definicao, contexto: contextoFinal })
      .then((carregado) => {
        if (!ativo) return;
        baseRemota.current = carregado;
        const restaurado = restaurarRascunho(carregado);
        setEstado(restaurado);
        setFase("quieto");
        setRascunhoPronto(true);
        onEstadoChange?.(restaurado);
      })
      .catch((erro) => {
        if (!ativo) return;
        baseRemota.current = inicial;
        setEstado(restaurarRascunho(inicial));
        setFase("erro");
        setRascunhoPronto(true);
        setAviso(mensagemErroRuntime(erro, "Não consegui carregar este formulário."));
      });
    return () => {
      ativo = false;
    };
    // `contextoSerializado` evita recarregar por uma nova referência equivalente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, definicao, estadoInicial, contextoSerializado, somenteLeitura]);

  const valoresSerializados = JSON.stringify(estado?.atual.valores ?? {});
  const bloqueado = Boolean(definicao && estado && formularioBloqueado(definicao, estado));
  const configurado = Boolean(adapter);
  const desabilitado = somenteLeitura || bloqueado || !configurado || fase === "carregando";
  const operacaoArquivo = Boolean(Object.keys(subindo).length || removendo);

  useEffect(() => {
    if (
      !rascunhoPronto ||
      !definicao ||
      !estado ||
      !adapter ||
      somenteLeitura ||
      bloqueado ||
      fase === "carregando" ||
      fase === "enviando" ||
      !rascunhoAlterado.current
    ) {
      return;
    }
    const armazenamento = armazenamentoDaSessao();
    const base = baseRemota.current;
    if (armazenamento && base) {
      salvarRascunhoLocal(
        armazenamento,
        definicao,
        estado.atual.valores,
        base.atual,
        contextoFinal,
      );
    }
  }, [
    adapter,
    bloqueado,
    definicao,
    fase,
    rascunhoPronto,
    somenteLeitura,
    valoresSerializados,
    contextoSerializado,
  ]);

  if (!definicao || !estado) {
    return (
      <section className={cx(styles.formulario, className)} role="alert">
        <strong>Formulário não encontrado</strong>
        <p>Revise o código “{codigo}” usado nesta página.</p>
      </section>
    );
  }

  const definicaoAtiva = definicao;
  const estadoAtivo = estado;
  const baseId = `formulario-${definicao.codigo}-v${definicao.versao}`;

  function mudarCampo(chave: string, valor: string) {
    rascunhoAlterado.current = true;
    setFase("quieto");
    setEstado((atual) =>
      atual
        ? {
            ...atual,
            atual: {
              ...atual.atual,
              status: atual.atual.status === "enviado" ? "rascunho" : atual.atual.status,
              valores: { ...atual.atual.valores, [chave]: valor },
            },
          }
        : atual,
    );
    setErrosCampos((atuais) => {
      const proximos = { ...atuais };
      delete proximos[chave];
      return proximos;
    });
    setErrosGerais([]);
    setAviso(null);
  }

  function validarAoSair(chave: string) {
    const resultado = validarEnvioFormulario(
      definicaoAtiva,
      estadoAtivo.atual.valores,
      estadoAtivo.atual.anexos,
      "envio",
    );
    if (!resultado.errosCampos[chave]) return;
    setErrosCampos((atuais) => ({
      ...atuais,
      [chave]: resultado.errosCampos[chave],
    }));
  }

  async function adicionarArquivos(campoChave: string, lista: FileList | null) {
    const campo = definicaoAtiva.anexos.find((item) => item.chave === campoChave);
    if (!campo || !lista?.length || !adapter?.adicionarAnexo || desabilitado || enviando) return;
    let estadoAtual: EstadoFormulario = estadoAtivo;
    for (const arquivo of Array.from(lista)) {
      const quantidade = estadoAtual.atual.anexos.filter(
        (item) => item.campo === campo.chave,
      ).length;
      const erroLocal = validarArquivoFormulario(campo, arquivo, quantidade);
      if (erroLocal) {
        setErrosAnexos((atuais) => ({ ...atuais, [campo.chave]: erroLocal }));
        break;
      }
      setSubindo((atual) => ({ ...atual, [campo.chave]: arquivo.name }));
      setAviso(null);
      try {
        estadoAtual = await adapter.adicionarAnexo({
          definicao: definicaoAtiva,
          estado: estadoAtual,
          campo,
          arquivo,
          contexto: contextoFinal,
        });
        aplicarEstado(estadoAtual);
        setErrosAnexos((atuais) => {
          const proximos = { ...atuais };
          delete proximos[campo.chave];
          return proximos;
        });
      } catch (erro) {
        setErrosAnexos((atuais) => ({
          ...atuais,
          [campo.chave]: mensagemErroRuntime(erro, `Não consegui enviar “${arquivo.name}”.`),
        }));
        break;
      } finally {
        setSubindo((atual) => {
          const proximo = { ...atual };
          delete proximo[campo.chave];
          return proximo;
        });
      }
    }
  }

  async function removerAnexo(anexo: AnexoFormulario) {
    if (!adapter?.removerAnexo || desabilitado || enviando) return;
    setRemovendo(anexo.id);
    setAviso(null);
    try {
      const proximo = await adapter.removerAnexo({
        definicao: definicaoAtiva,
        estado: estadoAtivo,
        anexoId: anexo.id,
        contexto: contextoFinal,
      });
      aplicarEstado(proximo);
    } catch (erro) {
      setAviso(mensagemErroRuntime(erro, "Não consegui remover este arquivo."));
    } finally {
      setRemovendo(null);
    }
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adapter || desabilitado || operacaoArquivo) return;
    const validacao = validarEnvioFormulario(
      definicaoAtiva,
      estadoAtivo.atual.valores,
      estadoAtivo.atual.anexos,
      "envio",
    );
    setErrosCampos(validacao.errosCampos);
    setErrosAnexos(validacao.errosAnexos);
    setErrosGerais(validacao.errosGerais);
    const armazenamento = armazenamentoDaSessao();
    if (armazenamento && rascunhoAlterado.current && baseRemota.current) {
      salvarRascunhoLocal(
        armazenamento,
        definicaoAtiva,
        estadoAtivo.atual.valores,
        baseRemota.current.atual,
        contextoFinal,
      );
    }
    if (!validacao.valido) {
      setAviso("Revise os campos indicados antes de enviar.");
      const primeiraChave =
        Object.keys(validacao.errosCampos)[0] ?? Object.keys(validacao.errosAnexos)[0];
      window.requestAnimationFrame(() => {
        document.getElementById(`${baseId}-${primeiraChave}`)?.focus();
      });
      return;
    }

    setFase("enviando");
    setAviso(null);
    try {
      const proximo = await adapter.enviar({
        definicao: definicaoAtiva,
        estado: {
          ...estadoAtivo,
          atual: { ...estadoAtivo.atual, valores: validacao.valores },
        },
        contexto: contextoFinal,
      });
      baseRemota.current = proximo;
      aplicarEstado(proximo);
      rascunhoAlterado.current = false;
      if (armazenamento) {
        removerRascunhoLocal(armazenamento, definicaoAtiva, contextoFinal);
      }
      setFase("salvo");
      setAviso(
        definicaoAtiva.workflow.tipo === "quest"
          ? "Quest enviada. Ela chegou aqui para validarmos."
          : "Dúvida enviada. Ela já apareceu no painel para acompanharmos.",
      );
    } catch (erro) {
      setFase("erro");
      setAviso(mensagemErroRuntime(erro, "Não consegui enviar agora."));
    }
  }

  const textoStatus = rotuloStatus(definicao, estado, fase, somenteLeitura);
  const classeDoStatus = classeStatus(estado, fase);
  const enviando = fase === "enviando";

  return (
    <section
      className={cx(styles.formulario, className)}
      id={baseId}
      data-formulario-codigo={definicao.codigo}
      data-formulario-versao={definicao.versao}
      aria-labelledby={`${baseId}-titulo`}
    >
      <div className={styles.cabecalho}>
        <div>
          <span className={styles.tipo}>
            {definicao.workflow.tipo === "quest" ? "Quest" : "Dúvidas"}
          </span>
          <h2 id={`${baseId}-titulo`}>{definicao.titulo}</h2>
          <p>{definicao.descricao}</p>
        </div>
        <span className={cx(styles.status, classeDoStatus)} aria-live="polite">
          <span aria-hidden="true" />
          {textoStatus}
        </span>
      </div>

      {fase === "carregando" ? (
        <div className={styles.carregando} aria-label="Carregando formulário">
          <span />
          <span />
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <div className={styles.campos}>
            {definicao.campos.map((campo) => (
              <CampoEntrada
                key={campo.chave}
                campo={campo}
                id={`${baseId}-${campo.chave}`}
                valor={estado.atual.valores[campo.chave] ?? ""}
                erro={errosCampos[campo.chave]}
                desabilitado={desabilitado || enviando}
                onChange={(valor) => mudarCampo(campo.chave, valor)}
                onBlur={() => validarAoSair(campo.chave)}
              />
            ))}
          </div>

          {definicao.anexos.length > 0 && (
            <div className={styles.anexos}>
              {definicao.anexos.map((campo) => {
                const anexos = estado.atual.anexos.filter((item) => item.campo === campo.chave);
                const inputId = `${baseId}-${campo.chave}`;
                const ocupado = Boolean(subindo[campo.chave]);
                const semAdapter = !adapter?.adicionarAnexo;
                return (
                  <div className={styles.campoAnexo} key={campo.chave}>
                    <div className={styles.anexoTopo}>
                      <div>
                        <label htmlFor={inputId}>
                          {campo.rotulo}
                          {campo.obrigatorio && (
                            <>
                              <span className={styles.obrigatorio} aria-hidden="true">
                                *
                              </span>
                              <span className={a11yStyles.srOnly}> (obrigatório)</span>
                            </>
                          )}
                        </label>
                        <p>{campo.ajuda}</p>
                      </div>
                      <label
                        className={cx(
                          styles.botaoSecundario,
                          (desabilitado || enviando || ocupado || semAdapter) &&
                            styles.botaoDesabilitado,
                        )}
                      >
                        {somenteLeitura
                          ? "Upload desativado na prévia"
                          : ocupado
                            ? `Enviando ${subindo[campo.chave]}…`
                            : "Adicionar arquivo"}
                        <input
                          id={inputId}
                          className={a11yStyles.srOnly}
                          type="file"
                          accept={campo.tiposAceitos.join(",")}
                          multiple={campo.maximoArquivos > 1}
                          required={campo.obrigatorio && anexos.length === 0}
                          aria-required={campo.obrigatorio}
                          disabled={
                            desabilitado ||
                            enviando ||
                            ocupado ||
                            semAdapter ||
                            anexos.length >= campo.maximoArquivos
                          }
                          aria-describedby={
                            errosAnexos[campo.chave] ? `${inputId}-erro` : undefined
                          }
                          onChange={(event) => {
                            adicionarArquivos(campo.chave, event.target.files);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <ListaAnexos
                      anexos={anexos}
                      desabilitado={desabilitado || enviando}
                      removendo={removendo}
                      onRemover={removerAnexo}
                    />
                    {errosAnexos[campo.chave] && (
                      <p className={styles.erroCampo} id={`${inputId}-erro`} role="alert">
                        {errosAnexos[campo.chave]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {errosGerais.length > 0 && (
            <ul className={styles.errosGerais} role="alert">
              {errosGerais.map((erro) => (
                <li key={erro}>{erro}</li>
              ))}
            </ul>
          )}

          {!configurado && !somenteLeitura && (
            <p className={styles.aviso} role="status">
              Este formulário ainda precisa de um adapter de persistência para aceitar envios.
            </p>
          )}
          {aviso && (
            <p className={cx(styles.aviso, fase === "erro" && styles.avisoErro)} role="status">
              {aviso}
            </p>
          )}

          <div className={styles.rodape}>
            <button
              className={styles.botaoPrimario}
              type="submit"
              disabled={desabilitado || enviando || operacaoArquivo}
            >
              {somenteLeitura
                ? "Envio desativado na prévia"
                : bloqueado
                  ? "Quest revisada"
                  : fase === "enviando"
                    ? "Enviando…"
                    : definicao.rotuloEnvio}
            </button>
            <span>
              {somenteLeitura
                ? "Esta visualização não salva respostas nem arquivos."
                : bloqueado
                  ? "Esta entrega já foi revisada e não pode mais ser alterada."
                  : definicao.workflow.tipo === "quest"
                    ? "O preenchimento fica guardado somente nesta aba até você concluir o envio."
                    : "O texto fica guardado nesta aba até o envio. Depois, você acompanha a resposta abaixo."}
            </span>
          </div>
        </form>
      )}

      {mostrarHistorico && (
        <HistoricoFormulario definicao={definicao} historico={estado.historico} />
      )}
    </section>
  );
}

export default Formulario;
