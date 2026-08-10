export const SEMANA_KEYS = ["semana-0", "semana-1", "semana-2", "semana-3", "semana-4"] as const;

export type SemanaKey = (typeof SEMANA_KEYS)[number];

export type CampoAtividade = {
  key: string;
  label: string;
  tipo: "text" | "email" | "url" | "textarea" | "select";
  ajuda?: string;
  placeholder?: string;
  obrigatorio?: boolean;
  min?: number;
  max: number;
  opcoes?: ReadonlyArray<{ valor: string; rotulo: string }>;
};

export type CampoAnexo = {
  key: string;
  label: string;
  ajuda: string;
  obrigatorio?: boolean;
  aceitaJson?: boolean;
  maxArquivos: number;
};

export type Atividade = {
  key: string;
  semanaKey: SemanaKey;
  titulo: string;
  descricao: string;
  botao: string;
  campos: ReadonlyArray<CampoAtividade>;
  anexos: ReadonlyArray<CampoAnexo>;
};

const ESTADO_SERVICO = [
  { valor: "pendente", rotulo: "Ainda preciso resolver" },
  { valor: "em_andamento", rotulo: "Estou configurando" },
  { valor: "pronto", rotulo: "Pronto" },
  { valor: "nao_vou_usar", rotulo: "Não vou usar agora" },
] as const;

export const ATIVIDADES: Readonly<Record<string, Atividade>> = {
  "semana-0-preparacao": {
    key: "semana-0-preparacao",
    semanaKey: "semana-0",
    titulo: "Preparação do seu agente",
    descricao:
      "Registre o nome do agente e o estado das contas. Você pode salvar aos poucos e voltar quando quiser.",
    botao: "Concluir preparação",
    campos: [
      {
        key: "nome_agente",
        label: "Nome do seu futuro agente",
        tipo: "text",
        placeholder: "Ex.: Nilo",
        obrigatorio: true,
        min: 2,
        max: 80,
      },
      {
        key: "email_agente",
        label: "Gmail criado para o agente",
        tipo: "email",
        placeholder: "agente@seunegocio.com",
        ajuda: "Use uma conta separada da sua conta pessoal.",
        obrigatorio: true,
        max: 254,
      },
      ...["codex", "vps", "zapi", "salvy", "openrouter", "github"].map((key) => ({
        key,
        label:
          key === "zapi"
            ? "Z-API"
            : key === "vps"
              ? "VPS"
              : key.charAt(0).toUpperCase() + key.slice(1),
        tipo: "select" as const,
        obrigatorio: true,
        max: 30,
        opcoes: ESTADO_SERVICO,
      })),
    ],
    anexos: [],
  },
  "semana-0-skill-relatorio": {
    key: "semana-0-skill-relatorio",
    semanaKey: "semana-0",
    titulo: "Primeiro entregável: skill de relatório mensal",
    descricao:
      "Desenhe a skill antes de construir. Use somente dados fictícios nesta primeira versão.",
    botao: "Entregar desenho da skill",
    campos: [
      {
        key: "objetivo",
        label: "O que a skill precisa entregar?",
        tipo: "textarea",
        placeholder: "Descreva o relatório e para quem ele serve.",
        obrigatorio: true,
        min: 40,
        max: 2000,
      },
      {
        key: "entradas",
        label: "Quais informações fictícias ela recebe?",
        tipo: "textarea",
        placeholder: "Liste as entradas e os formatos esperados.",
        obrigatorio: true,
        min: 30,
        max: 2000,
      },
      {
        key: "saida",
        label: "Como deve ser a saída?",
        tipo: "textarea",
        placeholder: "Estrutura, seções, tom e critérios de qualidade.",
        obrigatorio: true,
        min: 30,
        max: 2000,
      },
      {
        key: "revisao",
        label: "O que precisa de revisão humana?",
        tipo: "textarea",
        placeholder: "Defina o que a IA nunca pode decidir sozinha.",
        obrigatorio: true,
        min: 30,
        max: 2000,
      },
    ],
    anexos: [],
  },
  "semana-1-quest": {
    key: "semana-1-quest",
    semanaKey: "semana-1",
    titulo: "Quest: apresente o seu agente",
    descricao:
      "Peça ao agente para explicar quem ele é e como vai ajudar no seu dia a dia. Depois, envie o print da conversa.",
    botao: "Enviar Quest da Etapa 1",
    campos: [
      {
        key: "como_ajuda",
        label: "Em uma frase, qual será a primeira ajuda real desse agente?",
        tipo: "textarea",
        placeholder: "Ex.: preparar o rascunho do meu acompanhamento semanal.",
        obrigatorio: true,
        min: 20,
        max: 1200,
      },
    ],
    anexos: [
      {
        key: "print_identidade",
        label: "Print da conversa",
        ajuda: "PNG, JPEG ou WebP, sem dados identificáveis de clientes.",
        obrigatorio: true,
        maxArquivos: 1,
      },
    ],
  },
  "semana-2-quest": {
    key: "semana-2-quest",
    semanaKey: "semana-2",
    titulo: "Quest: sua presença digital",
    descricao:
      "Crie uma landing page simples para o negócio e uma imagem institucional coerente com a sua marca.",
    botao: "Enviar Quest da Etapa 2",
    campos: [
      {
        key: "landing_url",
        label: "Link da landing page, se estiver publicada",
        tipo: "url",
        placeholder: "https://...",
        ajuda: "Se ainda estiver local, envie um print no campo abaixo.",
        max: 1000,
      },
      {
        key: "decisao_visual",
        label: "Qual decisão visual você tomou e por quê?",
        tipo: "textarea",
        placeholder: "Explique uma escolha de cor, imagem, hierarquia ou mensagem.",
        obrigatorio: true,
        min: 30,
        max: 1800,
      },
    ],
    anexos: [
      {
        key: "landing",
        label: "Print da landing page",
        ajuda: "Envie ao menos uma visão da página.",
        obrigatorio: true,
        maxArquivos: 3,
      },
      {
        key: "imagem_institucional",
        label: "Imagem institucional",
        ajuda: "Use um modelo de geração de imagem disponível no OpenRouter no dia da atividade.",
        obrigatorio: true,
        maxArquivos: 1,
      },
    ],
  },
  "semana-3-quest": {
    key: "semana-3-quest",
    semanaKey: "semana-3",
    titulo: "Quest: trabalho na hora certa",
    descricao:
      "Escolha usos úteis de cron + skills e construa um lembrete diário de aniversários com dados fictícios.",
    botao: "Enviar Quest da Etapa 3",
    campos: [
      {
        key: "usos",
        label: "Como você usaria crons + skills no negócio?",
        tipo: "textarea",
        placeholder: "Liste de 2 a 4 usos e diga o resultado esperado de cada um.",
        obrigatorio: true,
        min: 80,
        max: 3000,
      },
      {
        key: "cron_aniversarios",
        label: "Como funciona o cron de aniversários que você criou?",
        tipo: "textarea",
        placeholder:
          "Horário, fonte dos dados, o que ele produz, para onde envia e como você testa.",
        obrigatorio: true,
        min: 80,
        max: 3000,
      },
    ],
    anexos: [
      {
        key: "evidencia_cron",
        label: "Evidência do teste",
        ajuda: "Print do cron e do resultado usando dados fictícios.",
        obrigatorio: true,
        maxArquivos: 2,
      },
    ],
  },
  "semana-4-quest": {
    key: "semana-4-quest",
    semanaKey: "semana-4",
    titulo: "Quest: automação com n8n",
    descricao:
      "Explique as diferenças entre as ferramentas e construa o fluxo de lembrete para atualização do Planfi.",
    botao: "Enviar Quest da Etapa 4",
    campos: [
      {
        key: "n8n_cron",
        label: "Qual é a diferença entre n8n e cron?",
        tipo: "textarea",
        obrigatorio: true,
        min: 60,
        max: 2400,
      },
      {
        key: "n8n_openclaw",
        label: "Qual é a diferença entre n8n e OpenClaw?",
        tipo: "textarea",
        obrigatorio: true,
        min: 60,
        max: 2400,
      },
      {
        key: "fluxo_planfi",
        label: "Descreva o fluxo que você construiu",
        tipo: "textarea",
        placeholder: "Entrada, filtro, lembrete, revisão humana, falha esperada e recuperação.",
        obrigatorio: true,
        min: 100,
        max: 4000,
      },
    ],
    anexos: [
      {
        key: "fluxo_n8n",
        label: "Print ou JSON do fluxo",
        ajuda: "Remova credenciais e use uma planilha fictícia.",
        obrigatorio: true,
        aceitaJson: true,
        maxArquivos: 3,
      },
    ],
  },
};

export const ATIVIDADES_POR_SEMANA = SEMANA_KEYS.reduce(
  (acc, semanaKey) => {
    acc[semanaKey] = Object.values(ATIVIDADES).filter(
      (atividade) => atividade.semanaKey === semanaKey,
    );
    return acc;
  },
  {} as Record<SemanaKey, Atividade[]>,
);

export function atividadePorKey(key: string): Atividade | null {
  return ATIVIDADES[key] ?? null;
}

export type RespostasAtividade = Record<string, string>;

export function validaRespostas(
  atividade: Atividade,
  entrada: unknown,
  exigirObrigatorios: boolean,
): { respostas: RespostasAtividade; erro: string | null } {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return { respostas: {}, erro: "Respostas inválidas." };
  }

  const bruto = entrada as Record<string, unknown>;
  const respostas: RespostasAtividade = {};

  for (const campo of atividade.campos) {
    const valorBruto = bruto[campo.key];
    const valor = typeof valorBruto === "string" ? valorBruto.trim() : "";
    if (exigirObrigatorios && campo.obrigatorio && !valor) {
      return { respostas: {}, erro: `Preencha “${campo.label}”.` };
    }
    if (!valor) {
      respostas[campo.key] = "";
      continue;
    }
    if (campo.min && valor.length < campo.min) {
      return {
        respostas: {},
        erro: `“${campo.label}” precisa de um pouco mais de detalhe.`,
      };
    }
    if (valor.length > campo.max) {
      return { respostas: {}, erro: `“${campo.label}” ficou grande demais.` };
    }
    if (campo.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
      return { respostas: {}, erro: `Revise o e-mail em “${campo.label}”.` };
    }
    if (campo.tipo === "url") {
      try {
        const url = new URL(valor);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        return { respostas: {}, erro: `Revise o link em “${campo.label}”.` };
      }
    }
    if (
      campo.tipo === "select" &&
      campo.opcoes &&
      !campo.opcoes.some((opcao) => opcao.valor === valor)
    ) {
      return { respostas: {}, erro: `Seleção inválida em “${campo.label}”.` };
    }
    respostas[campo.key] = valor;
  }

  if (JSON.stringify(respostas).length > 20_000) {
    return { respostas: {}, erro: "As respostas ultrapassaram o limite." };
  }
  return { respostas, erro: null };
}

export const MIMES_ANEXO_IMAGEM = ["image/jpeg", "image/png", "image/webp"] as const;
export const MIME_ANEXO_JSON = "application/json";
export const LIMITE_ANEXO_BYTES = 10 * 1024 * 1024;

export function extensaoDoAnexo(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === MIME_ANEXO_JSON) return "json";
  return null;
}
