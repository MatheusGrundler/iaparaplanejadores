import assert from "node:assert/strict";
import test from "node:test";
import React, { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { PainelLiberacaoEtapas } from "../app/admin/semanas/PainelLiberacaoEtapas";

(globalThis as { React?: typeof React }).React = React;

function elementos(node: ReactNode, encontrados: ReactElement[] = []) {
  Children.forEach(node, (filho) => {
    if (!isValidElement(filho)) return;
    encontrados.push(filho);
    elementos((filho.props as { children?: ReactNode }).children, encontrados);
  });
  return encontrados;
}

function texto(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!isValidElement(node)) {
    if (Array.isArray(node)) return node.map(texto).join("");
    return "";
  }
  return texto((node.props as { children?: ReactNode }).children);
}

const semAcao = async () => undefined;

test("painel renderiza estado efetivo da turma e as três escolhas individuais", () => {
  const painel = PainelLiberacaoEtapas({
    turmas: [{ id: 7, nome: "Turma Agosto" }],
    liberacoes: [
      { turma_id: 7, semana_key: "semana-0", liberada: true },
      { turma_id: 7, semana_key: "semana-2", liberada: false },
    ],
    alunos: [
      { email: "ana@exemplo.com", nome: "Ana", turma_id: 7 },
      { email: "bia@exemplo.com", nome: "Bia", turma_id: 7 },
      { email: "sem-turma@exemplo.com", nome: null, turma_id: null },
    ],
    ajustesIndividuais: [
      { email: "ana@exemplo.com", etapa_key: "semana-0", liberada: false },
      { email: "bia@exemplo.com", etapa_key: "semana-1", liberada: true },
      { email: "bia@exemplo.com", etapa_key: "semana-2", liberada: false },
    ],
    definirLiberacaoSemana: semAcao,
    definirLiberacaoEtapaAluno: semAcao,
  });
  const arvore = elementos(painel);
  const selects = arvore.filter((elemento) => elemento.type === "select");
  const formularios = arvore.filter((elemento) => elemento.type === "form");
  const opcoes = arvore.filter((elemento) => elemento.type === "option");
  const conteudo = texto(painel);

  assert.equal(selects.length, 15);
  assert.equal(formularios.length, 20);
  assert.equal(opcoes.length, 45);
  const estados = selects.map((select) => (select.props as { defaultValue?: string }).defaultValue);
  assert.ok(estados.includes("liberada"));
  assert.ok(estados.includes("bloqueada"));
  assert.ok(estados.includes("turma"));
  assert.match(conteudo, /Turma Agosto/);
  assert.match(conteudo, /1\/5 abertas/);
  assert.match(conteudo, /Anaana@exemplo\.com · Turma Agosto · 1 ajuste/);
  assert.match(conteudo, /Bia.*2 ajustes/);
  assert.match(conteudo, /sem-turma@exemplo\.comsem turma · nenhum ajuste/);
  assert.match(conteudo, /Aberta agora/);
  assert.match(conteudo, /Bloqueada agora/);
  assert.match(conteudo, /Padrão da turma \(aberta\)/);
  assert.match(conteudo, /Padrão da turma \(bloqueada\)/);
});

test("painel cobre os estados vazios sem esconder os controles de exceção", () => {
  const painel = PainelLiberacaoEtapas({
    turmas: [],
    liberacoes: [],
    alunos: [],
    ajustesIndividuais: [],
    definirLiberacaoSemana: semAcao,
    definirLiberacaoEtapaAluno: semAcao,
  });
  const conteudo = texto(painel);

  assert.match(conteudo, /Crie uma turma antes de liberar as etapas/);
  assert.match(conteudo, /Cadastre um aluno para criar ajustes individuais/);
  assert.match(conteudo, /0 alunos · 0 ajustes/);
});
