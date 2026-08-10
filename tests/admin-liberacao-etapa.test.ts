import assert from "node:assert/strict";
import test from "node:test";
import {
  aplicarLiberacaoIndividual,
  type AdaptadorLiberacaoIndividual,
} from "../lib/admin-liberacao-etapa";

type Chamada =
  | { operacao: "consulta"; email: string }
  | { operacao: "remocao"; email: string; etapaKey: string }
  | {
      operacao: "salvamento";
      email: string;
      etapaKey: string;
      liberada: boolean;
      atualizadaEm: string;
    };

function formulario(estado: string, email = "  ALUNA@EXEMPLO.COM ", etapaKey = "semana-2") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("etapa_key", etapaKey);
  formData.set("estado", estado);
  return formData;
}

function adaptador(alunoExiste = true) {
  const chamadas: Chamada[] = [];
  const implementacao: AdaptadorLiberacaoIndividual = {
    async alunoExiste(email) {
      chamadas.push({ operacao: "consulta", email });
      return alunoExiste;
    },
    async remover(email, etapaKey) {
      chamadas.push({ operacao: "remocao", email, etapaKey });
    },
    async salvar(input) {
      chamadas.push({ operacao: "salvamento", ...input });
    },
  };
  return { implementacao, chamadas };
}

test("libera um aluno com e-mail normalizado e registra o instante recebido", async () => {
  const { implementacao, chamadas } = adaptador();
  const agora = new Date("2026-08-10T20:30:00.000Z");

  const dados = await aplicarLiberacaoIndividual(formulario("liberada"), implementacao, agora);

  assert.deepEqual(dados, {
    email: "aluna@exemplo.com",
    etapaKey: "semana-2",
    estado: "liberada",
  });
  assert.deepEqual(chamadas[1], {
    operacao: "salvamento",
    email: "aluna@exemplo.com",
    etapaKey: "semana-2",
    liberada: true,
    atualizadaEm: agora.toISOString(),
  });
});

test("bloqueio individual salva false e voltar à turma remove a exceção", async () => {
  const bloqueio = adaptador();
  await aplicarLiberacaoIndividual(formulario("bloqueada"), bloqueio.implementacao);
  const salvamento = bloqueio.chamadas[1];
  assert.equal(salvamento.operacao, "salvamento");
  if (salvamento.operacao === "salvamento") {
    assert.equal(salvamento.email, "aluna@exemplo.com");
    assert.equal(salvamento.etapaKey, "semana-2");
    assert.equal(salvamento.liberada, false);
    assert.match(salvamento.atualizadaEm, /^\d{4}-\d{2}-\d{2}T/);
  }

  const heranca = adaptador();
  await aplicarLiberacaoIndividual(formulario("turma"), heranca.implementacao);
  assert.deepEqual(heranca.chamadas[1], {
    operacao: "remocao",
    email: "aluna@exemplo.com",
    etapaKey: "semana-2",
  });
});

test("rejeita formulário inválido antes de consultar o banco", async () => {
  const { implementacao, chamadas } = adaptador();

  await assert.rejects(
    aplicarLiberacaoIndividual(formulario("liberada", "inválido"), implementacao),
    { message: "Aluno inválido." },
  );
  await assert.rejects(
    aplicarLiberacaoIndividual(formulario("liberada", "a@b.com", "semana-9"), implementacao),
    { message: "Etapa inválida." },
  );
  await assert.rejects(aplicarLiberacaoIndividual(formulario("talvez"), implementacao), {
    message: "Estado de liberação inválido.",
  });
  assert.equal(chamadas.length, 0);
});

test("falha fechada quando o aluno não existe e propaga falha de persistência", async () => {
  await assert.rejects(
    aplicarLiberacaoIndividual(formulario("liberada"), adaptador(false).implementacao),
    { message: "Aluno não encontrado." },
  );

  const falha: AdaptadorLiberacaoIndividual = {
    async alunoExiste() {
      return true;
    },
    async remover() {
      throw new Error("persistência indisponível");
    },
    async salvar() {
      throw new Error("persistência indisponível");
    },
  };
  await assert.rejects(aplicarLiberacaoIndividual(formulario("turma"), falha), {
    message: "persistência indisponível",
  });
  await assert.rejects(aplicarLiberacaoIndividual(formulario("liberada"), falha), {
    message: "persistência indisponível",
  });
});
