import type { NextRequest } from "next/server";
import { logEvento } from "@/lib/auth";
import { privilegedDatabase } from "@/lib/supabase/admin";
import { validaRespostas } from "@/lib/curso-atividades";
import { resolverQuestDoUsuario } from "@/lib/formularios/server";
import { corpoJson, obterIdentidadeEditavel, respostaJson } from "@/app/api/curso/http";

type Ctx = { params: Promise<{ atividade: string }> };

async function salvar(req: NextRequest, params: Ctx["params"], enviar: boolean) {
  const { atividade: atividadeKey } = await params;
  const [acesso, body] = await Promise.all([
    obterIdentidadeEditavel("A prévia administrativa é somente leitura."),
    corpoJson(req),
  ]);
  if (acesso.resposta) return acesso.resposta;
  const { identity } = acesso;
  const resolvida = await resolverQuestDoUsuario(identity, atividadeKey);
  if (!resolvida) {
    return respostaJson({ ok: false, erro: "Atividade indisponível nesta Etapa." }, 403);
  }
  const { atividade, definicao, versaoId } = resolvida;
  if (!body) return respostaJson({ ok: false, erro: "Dados inválidos." }, 400);

  const validacao = validaRespostas(atividade, body.respostas, enviar);
  if (validacao.erro) {
    return respostaJson({ ok: false, erro: validacao.erro }, 400);
  }

  const admin = privilegedDatabase();
  const existenteQuery = admin
    .from("quest_respostas")
    .select("id, status, formulario_versao_id")
    .eq("user_id", identity.userId)
    .eq("quest_key", atividade.key);
  const { data: existente, error: existenteError } = await existenteQuery.maybeSingle();
  if (existenteError) {
    console.error("Falha ao consultar atividade:", existenteError.code);
    return respostaJson({ ok: false, erro: "Não consegui salvar agora." }, 500);
  }
  if (existente?.status === "revisada") {
    return respostaJson({ ok: false, erro: "Esta Quest já foi revisada." }, 409);
  }
  if (existente?.formulario_versao_id && existente.formulario_versao_id !== versaoId) {
    return respostaJson(
      {
        ok: false,
        erro: "Esta entrega pertence a outra versão do formulário.",
      },
      409,
    );
  }

  if (enviar) {
    const { data: anexos, error: anexosError } = await admin
      .from("quest_anexos")
      .select("campo, status")
      .eq("user_id", identity.userId)
      .eq("quest_key", atividade.key)
      .eq("resposta_id", existente?.id ?? "00000000-0000-0000-0000-000000000000")
      .eq("status", "pronto");

    if (anexosError) {
      console.error("Falha ao verificar anexos da Quest:", anexosError.code);
      return respostaJson({ ok: false, erro: "Não consegui verificar os anexos agora." }, 500);
    }

    for (const campo of atividade.anexos) {
      if (!campo.obrigatorio) continue;
      const quantidade = (anexos ?? []).filter((a) => a.campo === campo.key).length;
      if (quantidade === 0) {
        return respostaJson({ ok: false, erro: `Envie “${campo.label}” antes de concluir.` }, 400);
      }
    }
  }

  const agora = new Date().toISOString();
  const payload = {
    email: identity.email,
    semana_key: atividade.semanaKey,
    quest_key: atividade.key,
    respostas: validacao.respostas,
    schema_version: definicao.schemaVersion,
    status: enviar ? "enviada" : "rascunho",
    enviada_em: enviar ? agora : null,
    revisada_em: null,
    formulario_versao_id: versaoId,
  };

  let data: Record<string, unknown> | null = null;
  let errorCode: string | undefined;
  if (existente) {
    const atualizarQuery = admin
      .from("quest_respostas")
      .update(payload)
      .eq("id", existente.id)
      .eq("user_id", identity.userId)
      .eq("quest_key", atividade.key)
      .neq("status", "revisada");
    const resultado = await atualizarQuery
      .select("id, status, enviada_em, atualizado_em")
      .maybeSingle();
    data = resultado.data;
    errorCode = resultado.error?.code;
  } else {
    const resultado = await admin
      .from("quest_respostas")
      .insert({ user_id: identity.userId, ...payload })
      .select("id, status, enviada_em, atualizado_em")
      .maybeSingle();
    data = resultado.data;
    errorCode = resultado.error?.code;

    if (!data && errorCode === "23505") {
      const concorrenteQuery = admin
        .from("quest_respostas")
        .update(payload)
        .eq("user_id", identity.userId)
        .eq("quest_key", atividade.key)
        .neq("status", "revisada");
      const concorrente = await concorrenteQuery
        .select("id, status, enviada_em, atualizado_em")
        .maybeSingle();
      data = concorrente.data;
      errorCode = concorrente.error?.code;
    }
  }

  if (!data) {
    console.error("Falha ao salvar atividade:", errorCode);
    return respostaJson(
      {
        ok: false,
        erro: errorCode
          ? "Não consegui salvar. Tente de novo em instantes."
          : "A Quest mudou e não pode mais ser editada.",
      },
      errorCode ? 500 : 409,
    );
  }

  if (enviar) await logEvento(identity.email, "quest_enviada");
  return respostaJson({ ok: true, atividade: data });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  return salvar(req, params, false);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return salvar(req, params, true);
}
