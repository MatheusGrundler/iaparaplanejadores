import { normalizeEmail } from "@/lib/access";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";

export type EstadoLiberacaoIndividual = "turma" | "liberada" | "bloqueada";

export type DadosLiberacaoIndividual = {
  email: string;
  etapaKey: SemanaKey;
  estado: EstadoLiberacaoIndividual;
};

export type AdaptadorLiberacaoIndividual = {
  alunoExiste(email: string): Promise<boolean>;
  remover(email: string, etapaKey: SemanaKey): Promise<void>;
  salvar(input: {
    email: string;
    etapaKey: SemanaKey;
    liberada: boolean;
    atualizadaEm: string;
  }): Promise<void>;
};

function emailValido(value: FormDataEntryValue | null) {
  const email = normalizeEmail(String(value ?? ""));
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export function validarLiberacaoIndividual(formData: FormData): DadosLiberacaoIndividual {
  const email = emailValido(formData.get("email"));
  const etapaKey = String(formData.get("etapa_key") ?? "");
  const estado = String(formData.get("estado") ?? "");

  if (!email) throw new Error("Aluno inválido.");
  if (!(SEMANA_KEYS as readonly string[]).includes(etapaKey)) {
    throw new Error("Etapa inválida.");
  }
  if (estado !== "turma" && estado !== "liberada" && estado !== "bloqueada") {
    throw new Error("Estado de liberação inválido.");
  }

  return {
    email,
    etapaKey: etapaKey as SemanaKey,
    estado,
  };
}

export async function aplicarLiberacaoIndividual(
  formData: FormData,
  adaptador: AdaptadorLiberacaoIndividual,
  agora = new Date(),
): Promise<DadosLiberacaoIndividual> {
  const dados = validarLiberacaoIndividual(formData);
  if (!(await adaptador.alunoExiste(dados.email))) {
    throw new Error("Aluno não encontrado.");
  }

  if (dados.estado === "turma") {
    await adaptador.remover(dados.email, dados.etapaKey);
  } else {
    await adaptador.salvar({
      email: dados.email,
      etapaKey: dados.etapaKey,
      liberada: dados.estado === "liberada",
      atualizadaEm: agora.toISOString(),
    });
  }

  return dados;
}
