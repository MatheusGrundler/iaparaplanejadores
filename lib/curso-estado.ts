import "server-only";
import {
  ATIVIDADES_POR_SEMANA,
  type Atividade,
  type RespostasAtividade,
  type SemanaKey,
} from "@/lib/curso-atividades";
import type { EstadoAtividade, EstadoSemana } from "@/lib/curso-estado-tipos";
import type { DuvidaAtual } from "@/lib/formularios/legado";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type { EstadoAtividade, EstadoSemana } from "@/lib/curso-estado-tipos";

type ContextoEstadoEtapa = {
  atividades?: readonly Atividade[];
  duvidaCodigo?: string;
};

export async function carregarEstadoSemana(
  userId: string,
  semanaKey: SemanaKey,
  contexto: ContextoEstadoEtapa = {},
): Promise<EstadoSemana> {
  const supabase = await createClient();
  const definicoes = contexto.atividades ?? ATIVIDADES_POR_SEMANA[semanaKey];
  const keys = definicoes.map((atividade) => atividade.key);
  const filtroKeys = keys.length > 0 ? keys : ["__sem-atividade__"];

  const respostasQuery = supabase
    .from("quest_respostas")
    .select("id, quest_key, respostas, status, atualizado_em")
    .eq("user_id", userId)
    .in("quest_key", filtroKeys);
  const anexosQuery = supabase
    .from("quest_anexos")
    .select("id, quest_key, campo, file, nome_original, mime, bytes")
    .eq("user_id", userId)
    .in("quest_key", filtroKeys)
    .eq("status", "pronto");
  let duvidasQuery = supabase
    .from("curso_duvidas")
    .select("id, pergunta, respostas, status, resposta, criada_em, respondida_em")
    .eq("user_id", userId)
    .eq("semana_key", semanaKey);

  if (contexto.duvidaCodigo) {
    duvidasQuery = duvidasQuery.or(
      `formulario_codigo.eq.${contexto.duvidaCodigo},formulario_codigo.is.null`,
    );
  }

  const [respostasResult, anexosResult, duvidasResult] = await Promise.all([
    respostasQuery,
    anexosQuery.order("criado_em"),
    duvidasQuery.order("criada_em", { ascending: false }),
  ]);

  for (const [contexto, error] of [
    ["respostas", respostasResult.error],
    ["anexos", anexosResult.error],
    ["dúvidas", duvidasResult.error],
  ] as const) {
    if (error) console.error(`Falha ao carregar ${contexto} da Imersão:`, error.code);
  }

  const admin = privilegedDatabase();
  const anexosComUrl = await Promise.all(
    (anexosResult.data ?? []).map(async (anexo) => {
      const { data } = await admin.storage.from("quest-anexos").createSignedUrl(anexo.file, 900);
      return {
        id: anexo.id,
        questKey: anexo.quest_key,
        campo: anexo.campo,
        nome: anexo.nome_original,
        mime: anexo.mime,
        bytes: anexo.bytes,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  const atividades: Record<string, EstadoAtividade> = {};
  for (const atividade of definicoes) {
    const resposta = respostasResult.data?.find((item) => item.quest_key === atividade.key);
    atividades[atividade.key] = {
      id: resposta?.id ?? null,
      respostas:
        resposta?.respostas && typeof resposta.respostas === "object"
          ? (resposta.respostas as RespostasAtividade)
          : {},
      status: resposta?.status ?? null,
      atualizadoEm: resposta?.atualizado_em ?? null,
      anexos: anexosComUrl
        .filter((item) => item.questKey === atividade.key)
        .map(({ questKey: _questKey, ...item }) => item),
    };
  }

  return {
    atividades,
    duvidas: (duvidasResult.data ?? []) as DuvidaAtual[],
  };
}

export async function carregarStatusCurso(userId: string) {
  const supabase = await createClient();
  const query = supabase
    .from("quest_respostas")
    .select("quest_key, status, atualizado_em")
    .eq("user_id", userId);
  const { data, error } = await query;
  if (error) {
    console.error("Falha ao carregar progresso da Imersão:", error.code);
    return new Map<string, { status: string; atualizadoEm: string | null }>();
  }
  return new Map(
    (data ?? []).map((item) => [
      item.quest_key,
      { status: item.status, atualizadoEm: item.atualizado_em },
    ]),
  );
}
