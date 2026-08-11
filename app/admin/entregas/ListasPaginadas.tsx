"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import Modal from "@/app/componentes/Modal";
import { OPCOES_ITENS_POR_PAGINA, paginasVisiveis } from "@/lib/admin-paginacao";
import { marcarQuestRevisada, responderDuvidaSemana } from "./actions";

export type PaginacaoAdmin = {
  pagina: number;
  itensPorPagina: number;
  total: number;
  totalPaginas: number;
  inicio: number;
  fim: number;
};

export type RespostaAdmin = {
  chave: string;
  rotulo: string;
  valor: string;
};

export type AnexoAdmin = {
  id: string;
  nome: string;
  campo: string;
  tamanho: string;
  url: string | null;
};

export type EntregaAdmin = {
  id: string;
  email: string;
  titulo: string;
  etapa: string;
  versao: number | null;
  status: string;
  statusRotulo: string;
  enviadaEm: string;
  revisadaEm: string | null;
  respostas: RespostaAdmin[];
  anexos: AnexoAdmin[];
};

export type DuvidaAdmin = {
  id: string;
  email: string;
  etapa: string;
  versao: number | null;
  status: string;
  statusRotulo: string;
  criadaEm: string;
  pergunta: string;
  informacoes: RespostaAdmin[];
  resposta: string | null;
};

type ParametrosPaginacao = {
  pagina: "paginaEntregas" | "paginaDuvidas";
  quantidade: "porPaginaEntregas" | "porPaginaDuvidas";
};

function plural(total: number, singular: string, pluralTexto: string) {
  return total === 1 ? singular : pluralTexto;
}

function BotaoAcao({ normal, pendente }: { normal: string; pendente: string }) {
  const estado = useFormStatus();
  return (
    <button className="btn btn-mini" type="submit" disabled={estado.pending}>
      {estado.pending ? pendente : normal}
    </button>
  );
}

function ControlesPaginacao({
  paginacao,
  parametros,
  entidadeSingular,
  entidadePlural,
}: {
  paginacao: PaginacaoAdmin;
  parametros: ParametrosPaginacao;
  entidadeSingular: string;
  entidadePlural: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const busca = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();
  const paginas = useMemo(
    () => paginasVisiveis(paginacao.pagina, paginacao.totalPaginas),
    [paginacao.pagina, paginacao.totalPaginas],
  );

  function navegar(pagina: number, quantidade = paginacao.itensPorPagina) {
    const parametrosBusca = new URLSearchParams(busca.toString());
    parametrosBusca.set(parametros.pagina, String(pagina));
    parametrosBusca.set(parametros.quantidade, String(quantidade));
    iniciarTransicao(() => {
      router.push(`${pathname}?${parametrosBusca.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="admin-paginacao" aria-busy={pendente}>
      <p aria-live="polite">
        {paginacao.inicio}–{paginacao.fim} de {paginacao.total}{" "}
        {plural(paginacao.total, entidadeSingular, entidadePlural)}
      </p>
      <label>
        Itens por página
        <select
          value={paginacao.itensPorPagina}
          disabled={pendente}
          onChange={(evento) => navegar(1, Number(evento.target.value))}
        >
          {OPCOES_ITENS_POR_PAGINA.map((quantidade) => (
            <option value={quantidade} key={quantidade}>
              {quantidade}
            </option>
          ))}
        </select>
      </label>
      <nav aria-label={`Paginação de ${entidadePlural}`}>
        <button
          type="button"
          disabled={paginacao.pagina === 1 || pendente}
          onClick={() => navegar(paginacao.pagina - 1)}
        >
          Anterior
        </button>
        <span className="admin-paginacao-mobile">
          Página {paginacao.pagina} de {paginacao.totalPaginas}
        </span>
        <span className="admin-paginacao-numeros">
          {paginas[0] > 1 && (
            <>
              <button type="button" disabled={pendente} onClick={() => navegar(1)}>
                1
              </button>
              <i aria-hidden="true">…</i>
            </>
          )}
          {paginas.map((pagina) => (
            <button
              type="button"
              aria-current={pagina === paginacao.pagina ? "page" : undefined}
              disabled={pendente}
              onClick={() => navegar(pagina)}
              key={pagina}
            >
              {pagina}
            </button>
          ))}
          {paginas[paginas.length - 1] < paginacao.totalPaginas && (
            <>
              <i aria-hidden="true">…</i>
              <button
                type="button"
                disabled={pendente}
                onClick={() => navegar(paginacao.totalPaginas)}
              >
                {paginacao.totalPaginas}
              </button>
            </>
          )}
        </span>
        <button
          type="button"
          disabled={paginacao.pagina === paginacao.totalPaginas || pendente}
          onClick={() => navegar(paginacao.pagina + 1)}
        >
          Próxima
        </button>
      </nav>
      {pendente && (
        <span className="admin-paginacao-carregando" role="status">
          Atualizando lista…
        </span>
      )}
    </div>
  );
}

function cliqueDaLinha(evento: MouseEvent<HTMLTableRowElement>, abrir: () => void) {
  const alvo = evento.target as HTMLElement;
  if (alvo.closest("button, a, input, textarea, select, form")) return;
  evento.currentTarget.querySelector<HTMLElement>(".admin-linha-abertura")?.focus();
  abrir();
}

export function ListaEntregasAdmin({
  itens,
  paginacao,
}: {
  itens: EntregaAdmin[];
  paginacao: PaginacaoAdmin;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const selecionado = itens.find((item) => item.id === selecionadoId) ?? null;
  const fechar = useCallback(() => setSelecionadoId(null), []);

  useEffect(() => {
    if (selecionadoId && !selecionado) setSelecionadoId(null);
  }, [selecionado, selecionadoId]);

  if (!itens.length) return <div className="card vazio">Nenhuma Quest enviada ainda.</div>;

  return (
    <>
      <div className="admin-tabela-wrap">
        <table className="admin-tabela">
          <caption className="admin-sr-only">Entregas recebidas</caption>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Quest</th>
              <th>Enviada em</th>
              <th>Anexos</th>
              <th>Status</th>
              <th aria-label="Detalhes" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const abrir = () => setSelecionadoId(item.id);
              return (
                <tr key={item.id} onClick={(evento) => cliqueDaLinha(evento, abrir)}>
                  <td data-label="Aluno">
                    <button
                      className="admin-linha-abertura"
                      type="button"
                      aria-haspopup="dialog"
                      onClick={abrir}
                    >
                      {item.email}
                    </button>
                  </td>
                  <td data-label="Quest">
                    <span className="admin-tabela-principal">
                      <strong>{item.titulo}</strong>
                      <small>
                        {item.etapa}
                        {item.versao ? ` · v${item.versao}` : ""}
                      </small>
                    </span>
                  </td>
                  <td data-label="Enviada em">{item.enviadaEm}</td>
                  <td data-label="Anexos">
                    {item.anexos.length}{" "}
                    {plural(item.anexos.length, "arquivo", "arquivos")}
                  </td>
                  <td data-label="Status">
                    <span className={`status-admin status-${item.status}`}>
                      {item.statusRotulo}
                    </span>
                  </td>
                  <td className="admin-linha-seta" aria-hidden="true">
                    →
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ControlesPaginacao
        paginacao={paginacao}
        parametros={{ pagina: "paginaEntregas", quantidade: "porPaginaEntregas" }}
        entidadeSingular="entrega"
        entidadePlural="entregas"
      />

      <Modal aberto={Boolean(selecionado)} titulo={selecionado?.titulo ?? "Entrega"} aoFechar={fechar} amplo>
        {selecionado && (
          <div className="admin-detalhe">
            <div className="admin-detalhe-resumo">
              <div>
                <span>Aluno</span>
                <strong>{selecionado.email}</strong>
              </div>
              <div>
                <span>Etapa</span>
                <strong>
                  {selecionado.etapa}
                  {selecionado.versao ? ` · versão ${selecionado.versao}` : ""}
                </strong>
              </div>
              <div>
                <span>Enviada em</span>
                <strong>{selecionado.enviadaEm}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selecionado.statusRotulo}</strong>
              </div>
              {selecionado.revisadaEm && (
                <div>
                  <span>Revisada em</span>
                  <strong>{selecionado.revisadaEm}</strong>
                </div>
              )}
            </div>

            <section aria-labelledby={`respostas-${selecionado.id}`}>
              <h3 id={`respostas-${selecionado.id}`}>Respostas</h3>
              {selecionado.respostas.length ? (
                <dl className="admin-detalhe-respostas">
                  {selecionado.respostas.map((resposta) => (
                    <div key={resposta.chave}>
                      <dt>{resposta.rotulo}</dt>
                      <dd>{resposta.valor || "—"}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="admin-detalhe-vazio">Nenhuma resposta textual nesta entrega.</p>
              )}
            </section>

            {selecionado.anexos.length > 0 && (
              <section aria-labelledby={`anexos-${selecionado.id}`}>
                <h3 id={`anexos-${selecionado.id}`}>Arquivos</h3>
                <ul className="admin-detalhe-anexos">
                  {selecionado.anexos.map((anexo) => (
                    <li key={anexo.id}>
                      <div>
                        <strong>{anexo.nome}</strong>
                        <span>
                          {anexo.campo}
                          {anexo.tamanho ? ` · ${anexo.tamanho}` : ""}
                        </span>
                      </div>
                      {anexo.url ? (
                        <a href={anexo.url} target="_blank" rel="noreferrer">
                          Abrir arquivo ↗
                        </a>
                      ) : (
                        <span>Indisponível</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selecionado.status === "enviada" && (
              <form action={marcarQuestRevisada} className="admin-detalhe-acao">
                <input type="hidden" name="id" value={selecionado.id} />
                <BotaoAcao normal="Marcar como revisada" pendente="Marcando…" />
              </form>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export function ListaDuvidasAdmin({
  itens,
  paginacao,
}: {
  itens: DuvidaAdmin[];
  paginacao: PaginacaoAdmin;
}) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const selecionado = itens.find((item) => item.id === selecionadoId) ?? null;
  const fechar = useCallback(() => setSelecionadoId(null), []);

  useEffect(() => {
    if (selecionadoId && !selecionado) setSelecionadoId(null);
  }, [selecionado, selecionadoId]);

  if (!itens.length) return <div className="card vazio">Nenhuma dúvida enviada ainda.</div>;

  return (
    <>
      <div className="admin-tabela-wrap">
        <table className="admin-tabela admin-tabela-duvidas">
          <caption className="admin-sr-only">Fila de perguntas</caption>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Dúvida</th>
              <th>Etapa</th>
              <th>Enviada em</th>
              <th>Status</th>
              <th aria-label="Detalhes" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              const abrir = () => setSelecionadoId(item.id);
              return (
                <tr key={item.id} onClick={(evento) => cliqueDaLinha(evento, abrir)}>
                  <td data-label="Aluno">
                    <button
                      className="admin-linha-abertura"
                      type="button"
                      aria-haspopup="dialog"
                      onClick={abrir}
                    >
                      {item.email}
                    </button>
                  </td>
                  <td data-label="Dúvida">
                    <span className="admin-duvida-resumo">{item.pergunta}</span>
                  </td>
                  <td data-label="Etapa">
                    {item.etapa}
                    {item.versao ? ` · v${item.versao}` : ""}
                  </td>
                  <td data-label="Enviada em">{item.criadaEm}</td>
                  <td data-label="Status">
                    <span className={`status-admin status-${item.status}`}>
                      {item.statusRotulo}
                    </span>
                  </td>
                  <td className="admin-linha-seta" aria-hidden="true">
                    →
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ControlesPaginacao
        paginacao={paginacao}
        parametros={{ pagina: "paginaDuvidas", quantidade: "porPaginaDuvidas" }}
        entidadeSingular="dúvida"
        entidadePlural="dúvidas"
      />

      <Modal aberto={Boolean(selecionado)} titulo="Detalhes da dúvida" aoFechar={fechar} amplo>
        {selecionado && (
          <div className="admin-detalhe">
            <div className="admin-detalhe-resumo">
              <div>
                <span>Aluno</span>
                <strong>{selecionado.email}</strong>
              </div>
              <div>
                <span>Etapa</span>
                <strong>
                  {selecionado.etapa}
                  {selecionado.versao ? ` · versão ${selecionado.versao}` : ""}
                </strong>
              </div>
              <div>
                <span>Enviada em</span>
                <strong>{selecionado.criadaEm}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selecionado.statusRotulo}</strong>
              </div>
            </div>

            <section aria-labelledby={`pergunta-${selecionado.id}`}>
              <h3 id={`pergunta-${selecionado.id}`}>Pergunta</h3>
              <p className="admin-detalhe-texto">{selecionado.pergunta}</p>
            </section>

            {selecionado.informacoes.length > 0 && (
              <section aria-labelledby={`informacoes-${selecionado.id}`}>
                <h3 id={`informacoes-${selecionado.id}`}>Outras informações</h3>
                <dl className="admin-detalhe-respostas">
                  {selecionado.informacoes.map((informacao) => (
                    <div key={informacao.chave}>
                      <dt>{informacao.rotulo}</dt>
                      <dd>{informacao.valor || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {selecionado.resposta ? (
              <section aria-labelledby={`resposta-${selecionado.id}`}>
                <h3 id={`resposta-${selecionado.id}`}>Resposta enviada</h3>
                <p className="resposta-equipe admin-detalhe-texto">{selecionado.resposta}</p>
              </section>
            ) : selecionado.status === "aberta" ? (
              <form action={responderDuvidaSemana} className="responder-duvida admin-detalhe-acao">
                <input type="hidden" name="id" value={selecionado.id} />
                <label htmlFor={`resposta-${selecionado.id}`}>Responder</label>
                <textarea
                  id={`resposta-${selecionado.id}`}
                  name="resposta"
                  minLength={2}
                  maxLength={5000}
                  rows={6}
                  required
                />
                <BotaoAcao normal="Enviar resposta" pendente="Enviando…" />
              </form>
            ) : (
              <p className="admin-detalhe-vazio">Esta dúvida foi arquivada sem resposta.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
