export const OPCOES_ITENS_POR_PAGINA = [10, 25, 50] as const;

export type ParametroBusca = string | string[] | undefined;

function primeiroValor(valor: ParametroBusca) {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function paginaDoParametro(valor: ParametroBusca) {
  const numero = Number.parseInt(primeiroValor(valor) ?? "", 10);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

export function itensPorPaginaDoParametro(valor: ParametroBusca) {
  const numero = Number.parseInt(primeiroValor(valor) ?? "", 10);
  return OPCOES_ITENS_POR_PAGINA.includes(
    numero as (typeof OPCOES_ITENS_POR_PAGINA)[number],
  )
    ? numero
    : OPCOES_ITENS_POR_PAGINA[0];
}

export function calcularPaginacao(total: number, pagina: number, itensPorPagina: number) {
  const totalSeguro = Math.max(0, Math.trunc(total));
  const totalPaginas = Math.max(1, Math.ceil(totalSeguro / itensPorPagina));
  const paginaAtual = Math.min(Math.max(1, Math.trunc(pagina)), totalPaginas);
  const offset = (paginaAtual - 1) * itensPorPagina;
  return {
    pagina: paginaAtual,
    itensPorPagina,
    total: totalSeguro,
    totalPaginas,
    inicio: totalSeguro === 0 ? 0 : offset + 1,
    fim: Math.min(offset + itensPorPagina, totalSeguro),
    offset,
  };
}

export function paginasVisiveis(pagina: number, totalPaginas: number, limite = 5) {
  const quantidade = Math.min(Math.max(1, limite), totalPaginas);
  const metade = Math.floor(quantidade / 2);
  let inicio = Math.max(1, pagina - metade);
  const fimInicial = inicio + quantidade - 1;
  if (fimInicial > totalPaginas) inicio = Math.max(1, totalPaginas - quantidade + 1);
  return Array.from({ length: quantidade }, (_, indice) => inicio + indice);
}
