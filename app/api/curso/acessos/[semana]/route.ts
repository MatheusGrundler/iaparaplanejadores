import type { NextRequest } from "next/server";
import { corpoJson, obterIdentidadeEditavel, respostaJson } from "@/app/api/curso/http";
import { logEvento } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import { podeAcessarSemana } from "@/lib/curso-liberacao";
import { clampSegundos } from "@/lib/leitura";
import { privilegedDatabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ semana: string }> };

function semanaValida(value: unknown): value is SemanaKey {
  return typeof value === "string" && (SEMANA_KEYS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const [{ semana }, acesso, body] = await Promise.all([
    params,
    obterIdentidadeEditavel("A prévia administrativa não entra nas métricas dos alunos."),
    corpoJson(req),
  ]);
  if (acesso.resposta) return acesso.resposta;
  const { identity } = acesso;
  if (!semanaValida(semana)) {
    return respostaJson({ ok: false, erro: "Etapa inválida." }, 400);
  }
  if (!body) return respostaJson({ ok: false, erro: "Dados inválidos." }, 400);
  if (!(await podeAcessarSemana(identity, semana))) {
    return respostaJson({ ok: false, erro: "Etapa ainda não liberada." }, 403);
  }

  const acao = body.acao;
  if (acao !== "abrir" && acao !== "pulso") {
    return respostaJson({ ok: false, erro: "Ação inválida." }, 400);
  }
  const segundos = acao === "pulso" ? clampSegundos(body.segundos) : 0;
  if (acao === "pulso" && segundos === 0) {
    return respostaJson({ ok: true });
  }

  const { error } = await privilegedDatabase().rpc("curso_acesso_registrar", {
    p_user_id: identity.userId,
    p_email: identity.email,
    p_semana_key: semana,
    p_acao: acao,
    p_segundos: segundos,
  });
  if (error) {
    console.error("Falha ao registrar acesso à etapa:", error.code);
    return respostaJson({ ok: false, erro: "Não consegui registrar o acesso." }, 500);
  }

  if (acao === "abrir") await logEvento(identity.email, "etapa_aberta", undefined, semana);
  return respostaJson({ ok: true });
}
