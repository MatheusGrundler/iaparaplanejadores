import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { novoFormulario } from "../../lib/formularios/fabricas";
import {
  aplicarRascunhoLocalAoEstado,
  chaveRascunhoLocal,
  lerRascunhoLocal,
  removerRascunhoLocal,
  salvarRascunhoLocal,
  type ArmazenamentoRascunhoLocal,
} from "../../lib/formularios/rascunho-local";
import { estadoVazio, type DefinicaoFormulario } from "../../lib/formularios/schema";

class ArmazenamentoEmMemoria implements ArmazenamentoRascunhoLocal {
  readonly itens = new Map<string, string>();

  getItem(chave: string) {
    return this.itens.get(chave) ?? null;
  }

  setItem(chave: string, valor: string) {
    this.itens.set(chave, valor);
  }

  removeItem(chave: string) {
    this.itens.delete(chave);
  }
}

const definicao: DefinicaoFormulario = {
  ...novoFormulario("quest"),
  codigo: "quest-teste-local",
  versao: 3,
  publicacao: "publicado",
};

test("rascunho local guarda somente os campos e restaura inclusive valores apagados", () => {
  const armazenamento = new ArmazenamentoEmMemoria();
  const contexto = { chaveSessao: "usuario-1:semana-1" };
  salvarRascunhoLocal(
    armazenamento,
    definicao,
    { "campo-1": "" },
    estadoVazio(definicao).atual,
    contexto,
    new Date("2026-08-10T15:00:00.000Z"),
  );

  const chave = chaveRascunhoLocal(definicao, contexto);
  const bruto = JSON.parse(armazenamento.getItem(chave)!);
  assert.deepEqual(Object.keys(bruto).sort(), [
    "base",
    "codigo",
    "salvoEm",
    "schemaVersion",
    "valores",
    "versao",
  ]);
  assert.deepEqual(bruto.valores, { "campo-1": "" });
  assert.equal("anexos" in bruto, false);
  assert.equal("historico" in bruto, false);
  assert.equal("status" in bruto, false);
  assert.deepEqual(lerRascunhoLocal(armazenamento, definicao, contexto)?.valores, {
    "campo-1": "",
  });
});

test("chave separa usuário, etapa, formulário e versão", () => {
  const usuario1 = chaveRascunhoLocal(definicao, {
    chaveSessao: "usuario-1:semana-1",
  });
  const usuario2 = chaveRascunhoLocal(definicao, {
    chaveSessao: "usuario-2:semana-1",
  });
  const outraEtapa = chaveRascunhoLocal(definicao, {
    chaveSessao: "usuario-1:semana-2",
  });
  const outraVersao = chaveRascunhoLocal({ ...definicao, versao: 4 }, {
    chaveSessao: "usuario-1:semana-1",
  });
  const outroFormulario = chaveRascunhoLocal({ ...definicao, codigo: "quest-outra" }, {
    chaveSessao: "usuario-1:semana-1",
  });

  assert.equal(new Set([usuario1, usuario2, outraEtapa, outraVersao, outroFormulario]).size, 5);
});

test("rascunho só volta quando a base remota ainda é a mesma e não foi revisada", () => {
  const base = {
    ...estadoVazio(definicao),
    atual: {
      ...estadoVazio(definicao).atual,
      status: "enviado" as const,
      valores: { "campo-1": "Versão enviada" },
      atualizadoEm: "2026-08-10T14:00:00.000Z",
    },
  };
  const localNovo = {
    schemaVersion: 1 as const,
    codigo: definicao.codigo,
    versao: definicao.versao,
    valores: { "campo-1": "Ajuste ainda não enviado" },
    base: {
      status: base.atual.status,
      valores: base.atual.valores,
      atualizadoEm: base.atual.atualizadoEm,
    },
    salvoEm: "2026-08-10T15:00:00.000Z",
  };
  const aplicado = aplicarRascunhoLocalAoEstado(definicao, base, localNovo);
  assert.equal(aplicado.aplicado, true);
  assert.equal(aplicado.estado.atual.status, "rascunho");
  assert.equal(aplicado.estado.atual.valores["campo-1"], "Ajuste ainda não enviado");

  const servidorAlterado = aplicarRascunhoLocalAoEstado(
    definicao,
    {
      ...base,
      atual: { ...base.atual, valores: { "campo-1": "Versão enviada em outra aba" } },
    },
    localNovo,
  );
  assert.equal(servidorAlterado.aplicado, false);
  assert.equal(servidorAlterado.estado.atual.valores["campo-1"], "Versão enviada em outra aba");

  const revisado = aplicarRascunhoLocalAoEstado(
    definicao,
    { ...base, atual: { ...base.atual, status: "revisado" } },
    localNovo,
  );
  assert.equal(revisado.aplicado, false);
});

test("JSON inválido, payload incompatível e storage bloqueado falham sem quebrar o formulário", () => {
  const armazenamento = new ArmazenamentoEmMemoria();
  const chave = chaveRascunhoLocal(definicao);
  armazenamento.setItem(chave, "{");
  assert.equal(lerRascunhoLocal(armazenamento, definicao), null);
  assert.equal(armazenamento.getItem(chave), null);

  armazenamento.setItem(
    chave,
    JSON.stringify({
      schemaVersion: 1,
      codigo: definicao.codigo,
      versao: 999,
      valores: { "campo-1": "valor" },
      salvoEm: "2026-08-10T15:00:00.000Z",
    }),
  );
  assert.equal(lerRascunhoLocal(armazenamento, definicao), null);

  const bloqueado: ArmazenamentoRascunhoLocal = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
    removeItem() {
      throw new Error("SecurityError");
    },
  };
  assert.doesNotThrow(() =>
    salvarRascunhoLocal(
      bloqueado,
      definicao,
      { "campo-1": "x" },
      estadoVazio(definicao).atual,
    ),
  );
  assert.equal(lerRascunhoLocal(bloqueado, definicao), null);
  assert.doesNotThrow(() => removerRascunhoLocal(bloqueado, definicao));
});

test("renderer não chama autosave remoto nem desabilita campos durante a digitação", () => {
  const fonte = readFileSync("app/componentes/formularios/Formulario.tsx", "utf8");
  assert.doesNotMatch(fonte, /adapter\.salvarRascunho/);
  assert.doesNotMatch(fonte, /setFase\("salvando"\)/);
  assert.doesNotMatch(fonte, /fase === "salvando"/);
  assert.match(fonte, /window\.sessionStorage/);
  assert.match(fonte, /removerRascunhoLocal\(armazenamento, definicaoAtiva, contextoFinal\)/);
});
