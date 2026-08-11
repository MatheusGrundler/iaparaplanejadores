import assert from "node:assert/strict";
import test from "node:test";
import { REGISTRO_FORMULARIOS } from "../../lib/formularios/seeds";
import { criarAdaptadorDuvidaAtual, criarAdaptadorQuestAtual } from "../../lib/formularios/legado";

function respostaJson(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("adapter legado de Quest carrega e envia sem PUT de autosave", async () => {
  const chamadas: Array<{ url: string; metodo: string; corpo?: Record<string, unknown> }> = [];
  const fetcher = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    const metodo = init?.method ?? "GET";
    const corpo = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    chamadas.push({ url, metodo, corpo });
    return respostaJson({
      ok: true,
      atividade: {
        id: "resposta-1",
        status: metodo === "POST" ? "enviada" : "rascunho",
        atualizado_em: "2026-08-10T14:00:00.000Z",
      },
    });
  }) as typeof fetch;
  const definicao = REGISTRO_FORMULARIOS.obter("quest-etapa-1");
  const adapter = criarAdaptadorQuestAtual({
    atividadeKey: "semana-1-quest",
    respostasIniciais: { como_ajuda: "Uma primeira versão" },
    statusInicial: "enviado",
    atualizadoEmInicial: "2026-08-10T13:00:00.000Z",
    respostaIdInicial: "resposta-antiga",
    fetcher,
  });

  const inicial = await adapter.carregar({ definicao });
  assert.equal(inicial.atual.status, "enviado");
  assert.equal(inicial.atual.id, "resposta-antiga");
  assert.equal(inicial.atual.atualizadoEm, "2026-08-10T13:00:00.000Z");
  assert.equal(inicial.atual.valores.como_ajuda, "Uma primeira versão");

  const enviado = await adapter.enviar({ definicao, estado: inicial });
  assert.equal(enviado.atual.status, "enviado");
  assert.deepEqual(
    chamadas.map(({ metodo }) => metodo),
    ["POST"],
  );
  assert.deepEqual(chamadas[0].corpo, { respostas: inicial.atual.valores });
});

test("adapter legado de Quest completa upload e remoção de anexo", async () => {
  const chamadas: Array<{ url: string; metodo: string }> = [];
  const fetcher = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    const metodo = init?.method ?? "GET";
    chamadas.push({ url, metodo });
    if (url === "https://upload.test/anexo") return new Response(null, { status: 200 });
    if (metodo === "POST") {
      return respostaJson({
        ok: true,
        uploadUrl: "https://upload.test/anexo",
        anexoId: "anexo-1",
      });
    }
    if (metodo === "PUT") {
      return respostaJson({
        ok: true,
        anexo: {
          id: "anexo-1",
          campo: "print_identidade",
          nome: "identidade.png",
          mime: "image/png",
          bytes: 4,
          url: null,
        },
      });
    }
    return respostaJson({ ok: true });
  }) as typeof fetch;
  const definicao = REGISTRO_FORMULARIOS.obter("quest-etapa-1");
  const adapter = criarAdaptadorQuestAtual({ atividadeKey: "semana-1-quest", fetcher });
  const inicial = await adapter.carregar({ definicao });
  const campo = definicao.anexos[0];
  const arquivo = new File([new Uint8Array([137, 80, 78, 71])], "identidade.png", {
    type: "image/png",
  });

  const comAnexo = await adapter.adicionarAnexo!({
    definicao,
    estado: inicial,
    campo,
    arquivo,
  });
  assert.equal(comAnexo.atual.status, "rascunho");
  assert.equal(comAnexo.atual.anexos[0].id, "anexo-1");

  const removido = await adapter.removerAnexo!({
    definicao,
    estado: comAnexo,
    anexoId: "anexo-1",
  });
  assert.equal(removido.atual.anexos.length, 0);
  assert.deepEqual(
    chamadas.map(({ metodo }) => metodo),
    ["POST", "PUT", "PUT", "DELETE"],
  );
});

test("adapter legado de dúvidas converte histórico e confirma novo envio", async () => {
  const definicao = REGISTRO_FORMULARIOS.obter("duvida-etapa-1");
  const fetcher = (async () =>
    respostaJson({
      ok: true,
      duvida: {
        id: "duvida-nova",
        pergunta: "Como continuo?",
        respostas: { pergunta: "Como continuo?" },
        status: "aberta",
        resposta: null,
        criada_em: "2026-08-10T15:00:00.000Z",
        respondida_em: null,
      },
    })) as typeof fetch;
  const adapter = criarAdaptadorDuvidaAtual({
    semanaKey: "semana-1",
    fetcher,
    iniciais: [
      {
        id: "duvida-antiga",
        pergunta: "Pergunta anterior",
        status: "respondida",
        resposta: "Resposta anterior",
        criada_em: "2026-08-09T10:00:00.000Z",
        respondida_em: "2026-08-09T11:00:00.000Z",
      },
    ],
  });

  const inicial = await adapter.carregar({ definicao });
  assert.equal(inicial.historico[0].status, "respondido");
  assert.equal(inicial.historico[0].resposta?.autor, "Resposta da equipe");

  const enviado = await adapter.enviar({
    definicao,
    estado: {
      ...inicial,
      atual: { ...inicial.atual, valores: { pergunta: "Como continuo?" } },
    },
  });
  assert.equal(enviado.atual.valores.pergunta, "");
  assert.equal(enviado.historico[0].id, "duvida-nova");
  assert.equal(enviado.historico[1].id, "duvida-antiga");
});

test("adapters legados falham fechados quando a API não confirma a operação", async () => {
  const definicaoQuest = REGISTRO_FORMULARIOS.obter("quest-etapa-1");
  const adapterQuest = criarAdaptadorQuestAtual({
    atividadeKey: "semana-1-quest",
    fetcher: (async () =>
      respostaJson({ ok: false, erro: "Sessão expirada" }, 401)) as typeof fetch,
  });
  const estadoQuest = await adapterQuest.carregar({ definicao: definicaoQuest });
  await assert.rejects(
    () => adapterQuest.enviar({ definicao: definicaoQuest, estado: estadoQuest }),
    /Sessão expirada/,
  );

  const definicaoDuvida = REGISTRO_FORMULARIOS.obter("duvida-etapa-1");
  const adapterDuvida = criarAdaptadorDuvidaAtual({
    semanaKey: "semana-1",
    fetcher: (async () => respostaJson({ ok: true })) as typeof fetch,
  });
  const estadoDuvida = await adapterDuvida.carregar({ definicao: definicaoDuvida });
  await assert.rejects(
    () => adapterDuvida.enviar({ definicao: definicaoDuvida, estado: estadoDuvida }),
    /confirmação veio incompleta/,
  );
});
