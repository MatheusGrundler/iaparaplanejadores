import FormularioCurso from "@/app/componentes/curso/FormularioCurso";
import { getMemberIdentity } from "@/lib/auth";
import { carregarEstadoSemana } from "@/lib/curso-estado";
import { atividadeDaDefinicao, resolverFormularioDoUsuario } from "@/lib/formularios/server";

type Props = {
  /** Código estável definido no construtor e incorporado à página TSX. */
  codigo: string;
};

/**
 * Embed server-side usado dentro de qualquer página de conteúdo:
 * `<Formulario codigo="quest-etapa-1" />`.
 */
export default async function Formulario({ codigo }: Props) {
  const identity = await getMemberIdentity();
  if (!identity) return null;

  const formulario = await resolverFormularioDoUsuario(identity, codigo);
  if (!formulario) return null;

  const atividade =
    formulario.definicao.workflow.tipo === "quest"
      ? atividadeDaDefinicao(formulario.definicao, formulario.semanaKey)
      : null;
  const estado = await carregarEstadoSemana(identity.userId, formulario.semanaKey, {
    atividades: atividade ? [atividade] : [],
    duvidaCodigo:
      formulario.definicao.workflow.tipo === "duvida" ? formulario.definicao.codigo : undefined,
  });

  return (
    <FormularioCurso
      definicao={formulario.definicao}
      semanaKey={formulario.semanaKey}
      chaveSessao={`${identity.userId}:${formulario.semanaKey}`}
      atividade={atividade ? estado.atividades[atividade.key] : undefined}
      duvidas={estado.duvidas}
      somenteLeitura={identity.admin}
    />
  );
}
