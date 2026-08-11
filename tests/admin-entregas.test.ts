import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import {
  calcularPaginacao,
  itensPorPaginaDoParametro,
  OPCOES_ITENS_POR_PAGINA,
  paginaDoParametro,
  paginasVisiveis,
} from "../lib/admin-paginacao";

const raizRepositorio = new URL("../", import.meta.url);

function fonte(caminho: string) {
  return readFile(new URL(caminho, raizRepositorio), "utf8");
}

async function fontesDosComponentesDeEntregas() {
  const diretorio = new URL("app/admin/entregas/", raizRepositorio);
  const arquivos = await readdir(diretorio, { withFileTypes: true });
  const componentes = arquivos
    .filter((arquivo) => arquivo.isFile() && arquivo.name.endsWith(".tsx") && arquivo.name !== "page.tsx")
    .map((arquivo) => arquivo.name)
    .sort();

  assert.ok(componentes.length > 0, "a listagem interativa deve ficar em um Client Component");
  return (await Promise.all(componentes.map((arquivo) => readFile(new URL(arquivo, diretorio), "utf8")))).join(
    "\n",
  );
}

test("itens por página aceitam somente 10, 25 ou 50", () => {
  assert.deepEqual(OPCOES_ITENS_POR_PAGINA, [10, 25, 50]);
  assert.equal(itensPorPaginaDoParametro("10"), 10);
  assert.equal(itensPorPaginaDoParametro("25"), 25);
  assert.equal(itensPorPaginaDoParametro("50"), 50);
  assert.equal(itensPorPaginaDoParametro(["25", "50"]), 25);

  for (const invalido of [undefined, "", "0", "9", "20", "100", "texto"] as const) {
    assert.equal(itensPorPaginaDoParametro(invalido), 10);
  }
});

test("página inválida volta para a primeira e arrays usam o primeiro valor", () => {
  assert.equal(paginaDoParametro("1"), 1);
  assert.equal(paginaDoParametro("7"), 7);
  assert.equal(paginaDoParametro(["4", "8"]), 4);

  for (const invalida of [undefined, "", "0", "-1", "-200", "texto"] as const) {
    assert.equal(paginaDoParametro(invalida), 1);
  }
  assert.equal(paginaDoParametro([]), 1);
});

test("calcula totais, offsets e faixas humanas sem ultrapassar o total", () => {
  assert.deepEqual(calcularPaginacao(51, 1, 10), {
    pagina: 1,
    itensPorPagina: 10,
    total: 51,
    totalPaginas: 6,
    inicio: 1,
    fim: 10,
    offset: 0,
  });
  assert.deepEqual(calcularPaginacao(80, 3, 25), {
    pagina: 3,
    itensPorPagina: 25,
    total: 80,
    totalPaginas: 4,
    inicio: 51,
    fim: 75,
    offset: 50,
  });
  assert.deepEqual(calcularPaginacao(51, 6, 10), {
    pagina: 6,
    itensPorPagina: 10,
    total: 51,
    totalPaginas: 6,
    inicio: 51,
    fim: 51,
    offset: 50,
  });
});

test("total vazio e página acima do fim são normalizados", () => {
  assert.deepEqual(calcularPaginacao(0, 9, 10), {
    pagina: 1,
    itensPorPagina: 10,
    total: 0,
    totalPaginas: 1,
    inicio: 0,
    fim: 0,
    offset: 0,
  });
  assert.deepEqual(calcularPaginacao(-30, -4, 10), {
    pagina: 1,
    itensPorPagina: 10,
    total: 0,
    totalPaginas: 1,
    inicio: 0,
    fim: 0,
    offset: 0,
  });
  assert.deepEqual(calcularPaginacao(21, 99, 10), {
    pagina: 3,
    itensPorPagina: 10,
    total: 21,
    totalPaginas: 3,
    inicio: 21,
    fim: 21,
    offset: 20,
  });
});

test("janela de páginas visíveis acompanha começo, meio e fim", () => {
  assert.deepEqual(paginasVisiveis(1, 10), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginasVisiveis(5, 10), [3, 4, 5, 6, 7]);
  assert.deepEqual(paginasVisiveis(10, 10), [6, 7, 8, 9, 10]);
  assert.deepEqual(paginasVisiveis(2, 3), [1, 2, 3]);
  assert.deepEqual(paginasVisiveis(4, 8, 3), [3, 4, 5]);
  assert.deepEqual(paginasVisiveis(1, 0), []);
});

test("página administrativa pagina as duas consultas no servidor", async () => {
  const pagina = await fonte("app/admin/entregas/page.tsx");
  const contagensExatas = pagina.match(/count\s*:\s*["']exact["']/g) ?? [];
  const ranges = pagina.match(/\.range\s*\(/g) ?? [];

  assert.ok(contagensExatas.length >= 2, "entregas e dúvidas precisam do total real");
  assert.ok(ranges.length >= 2, "entregas e dúvidas precisam usar paginação no Supabase");
  assert.doesNotMatch(pagina, /\.limit\s*\(\s*100\s*\)/);
});

test("anexos são restritos aos ids das entregas presentes na página", async () => {
  const pagina = await fonte("app/admin/entregas/page.tsx");

  assert.match(
    pagina,
    /\.in\(\s*["']resposta_id["']\s*,\s*[A-Za-z_$][\w$]*\s*\)/,
    "a consulta de quest_anexos deve receber a lista de ids já paginada",
  );
});

test("listagem interativa oferece modal e controle de itens por página", async () => {
  const componentes = await fontesDosComponentesDeEntregas();

  assert.match(componentes, /[Ii]tens por página/);
  assert.match(componentes, /<select\b/);
  assert.match(componentes, /<Modal\b/);
  assert.match(
    componentes,
    /<button\b[\s\S]{0,800}?aria-haspopup\s*=\s*(?:["']dialog["']|\{["']dialog["']\})[\s\S]*?<\/button>/,
    "cada linha precisa oferecer um botão nativo que anuncie a abertura do diálogo",
  );
});

test("respostas completas não voltam a ser renderizadas dentro das linhas", async () => {
  const [pagina, componentes] = await Promise.all([
    fonte("app/admin/entregas/page.tsx"),
    fontesDosComponentesDeEntregas(),
  ]);

  assert.doesNotMatch(pagina, /Object\.entries\(quest\.respostas/);
  assert.doesNotMatch(pagina, /<dl\s+className=["']respostas-admin["']/);

  const botoesDeLinha = componentes.match(
    /<button\b[^>]*aria-haspopup\s*=\s*(?:["']dialog["']|\{["']dialog["']\})[^>]*>[\s\S]*?<\/button>/g,
  );
  assert.ok(botoesDeLinha?.length, "deve existir ao menos uma linha que abra o modal");
  for (const botao of botoesDeLinha) {
    assert.doesNotMatch(botao, /respostas-admin|anexos-admin|responder-duvida|Object\.entries/);
  }
});

test("dúvidas arquivadas não são reabertas nem respostas são sobrescritas", async () => {
  const [pagina, componentes, actions] = await Promise.all([
    fonte("app/admin/entregas/page.tsx"),
    fontesDosComponentesDeEntregas(),
    fonte("app/admin/entregas/actions.ts"),
  ]);

  assert.match(pagina, /duvida\.status\s*===\s*["']arquivada["']/);
  assert.match(pagina, /status\s*===\s*["']arquivada["']\s*\?\s*["']Arquivada["']/);
  assert.match(componentes, /selecionado\.status\s*===\s*["']aberta["']/);
  assert.match(actions, /\.eq\(\s*["']status["']\s*,\s*["']aberta["']\s*\)/);
  assert.match(actions, /\.is\(\s*["']resposta["']\s*,\s*null\s*\)/);
});
