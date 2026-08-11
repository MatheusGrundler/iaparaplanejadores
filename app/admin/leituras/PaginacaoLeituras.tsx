"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OPCOES_ITENS_POR_PAGINA, paginasVisiveis } from "@/lib/admin-paginacao";

export type PaginacaoLeituras = {
  pagina: number;
  itensPorPagina: number;
  total: number;
  totalPaginas: number;
  inicio: number;
  fim: number;
  offset: number;
};

function plural(total: number, singular: string, pluralTexto: string) {
  return total === 1 ? singular : pluralTexto;
}

export default function PaginacaoLeituras({
  paginacao,
  paginaParametro,
  quantidadeParametro,
  entidadeSingular,
  entidadePlural,
}: {
  paginacao: PaginacaoLeituras;
  paginaParametro: string;
  quantidadeParametro: string;
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
    const proximosParametros = new URLSearchParams(busca.toString());
    proximosParametros.set(paginaParametro, String(pagina));
    proximosParametros.set(quantidadeParametro, String(quantidade));
    iniciarTransicao(() => {
      router.push(`${pathname}?${proximosParametros.toString()}`, { scroll: false });
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
