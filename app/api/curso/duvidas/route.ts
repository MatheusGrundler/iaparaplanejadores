import type { NextRequest } from "next/server";
import { corpoJson, respostaJson } from "@/app/api/curso/http";
import { getMemberIdentity, logEvento } from "@/lib/auth";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import { resolverFormularioDoUsuario, type FormularioPublicado } from "@/lib/formularios/server";
import { validarEnvioFormulario } from "@/lib/formularios/validacao";
import { privilegedDatabase } from "@/lib/supabase/admin";

function semanaValida(value: unknown): value is SemanaKey {
  return typeof value === "string" && (SEMANA_KEYS as readonly string[]).includes(value);
}

function formularioEhDuvidaDaEtapa(
  formulario: FormularioPublicado | null,
  semanaKey: SemanaKey,
): formulario is FormularioPublicado {
  return formulario?.semanaKey === semanaKey && formulario.definicao.workflow.tipo === "duvida";
}

export async function GET(req: NextRequest) {
  const identity = await getMemberIdentity();
  if (!identity) return respostaJson({ ok: false, erro: "Sem acesso." }, 403);
  const semanaKey = new URL(req.url).searchParams.get("semana");
  const codigo = new URL(req.url).searchParams.get("codigo");
  if (!semanaValida(semanaKey)) {
    return respostaJson({ ok: false, erro: "Etapa inválida." }, 400);
  }
  if (!codigo) return respostaJson({ ok: false, erro: "Formulário inválido." }, 400);
  const formulario = await resolverFormularioDoUsuario(identity, codigo);
  if (!formularioEhDuvidaDaEtapa(formulario, semanaKey)) {
    return respostaJson({ ok: false, erro: "Etapa ainda não liberada." }, 403);
  }

  const query = privilegedDatabase()
    .from("curso_duvidas")
    .select("id, pergunta, respostas, status, resposta, criada_em, respondida_em")
    .eq("user_id", identity.userId)
    .eq("semana_key", semanaKey)
    .or(`formulario_codigo.eq.${formulario.definicao.codigo},formulario_codigo.is.null`);
  const { data, error } = await query.order("criada_em", { ascending: false });
  if (error) {
    console.error("Falha ao carregar dúvidas da semana:", error.code);
    return respostaJson({ ok: false, erro: "Não consegui carregar suas dúvidas." }, 500);
  }
  return respostaJson({ ok: true, duvidas: data ?? [] });
}

export async function POST(req: NextRequest) {
  const identity = await getMemberIdentity();
  if (!identity) return respostaJson({ ok: false, erro: "Sem acesso." }, 403);
  if (identity.admin) {
    return respostaJson({ ok: false, erro: "A prévia administrativa é somente leitura." }, 403);
  }

  const body = await corpoJson(req);
  if (!body) return respostaJson({ ok: false, erro: "Dados inválidos." }, 400);

  const semanaKey = body.semanaKey;
  const codigo = String(body.codigo ?? "");
  if (!semanaValida(semanaKey)) {
    return respostaJson({ ok: false, erro: "Etapa inválida." }, 400);
  }
  const formulario = await resolverFormularioDoUsuario(identity, codigo);
  if (!formularioEhDuvidaDaEtapa(formulario, semanaKey)) {
    return respostaJson({ ok: false, erro: "Etapa ainda não liberada." }, 403);
  }

  const valoresBrutos =
    body.respostas && typeof body.respostas === "object"
      ? body.respostas
      : { pergunta: body.pergunta };
  const validacao = validarEnvioFormulario(formulario.definicao, valoresBrutos, [], "envio");
  if (!validacao.valido) {
    const erro =
      Object.values(validacao.errosCampos)[0] ?? validacao.errosGerais[0] ?? "Revise sua dúvida.";
    return respostaJson({ ok: false, erro }, 400);
  }

  const pergunta =
    validacao.valores.pergunta ??
    Object.values(validacao.valores).find((valor) => valor.trim()) ??
    "Dúvida enviada pelo formulário.";

  const { data, error } = await privilegedDatabase()
    .from("curso_duvidas")
    .insert({
      user_id: identity.userId,
      email: identity.email,
      semana_key: semanaKey,
      pergunta,
      respostas: validacao.valores,
      schema_version: formulario.definicao.schemaVersion,
      formulario_codigo: formulario.definicao.codigo,
      formulario_versao_id: formulario.versaoId,
      status: "aberta",
    })
    .select("id, pergunta, respostas, status, resposta, criada_em, respondida_em")
    .single();
  if (error) {
    console.error("Falha ao salvar dúvida da semana:", error.code);
    return respostaJson(
      { ok: false, erro: "Não consegui enviar. Tente de novo em instantes." },
      500,
    );
  }

  await logEvento(identity.email, "duvida_etapa");
  return respostaJson({ ok: true, duvida: data }, 201);
}
