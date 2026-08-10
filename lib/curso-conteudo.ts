export type LinkCurso = {
  label: string;
  url: string;
  description?: string;
};

export type PassoCurso = {
  title: string;
  text: string;
};

export type ColunaComparacao = {
  title: string;
  description?: string;
  items: readonly string[];
};

export type BlocoSemana =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "bullets";
      title?: string;
      items: readonly string[];
    }
  | {
      type: "steps";
      title?: string;
      items: readonly PassoCurso[];
    }
  | {
      type: "callout";
      tone: "info" | "warning" | "success";
      title: string;
      text: string;
    }
  | {
      type: "comparison";
      title?: string;
      columns: readonly ColunaComparacao[];
    }
  | {
      type: "prompt";
      title: string;
      text: string;
      note?: string;
    }
  | {
      type: "links";
      title?: string;
      items: readonly LinkCurso[];
    }
  | {
      type: "summary";
      title: string;
      items: readonly string[];
    };

export type SecaoSemana = {
  id: string;
  title: string;
  lede?: string;
  blocks: readonly BlocoSemana[];
};

export type QuestSemana = {
  id: string;
  title: string;
  description: string;
  deliverables: readonly string[];
  acceptance: readonly string[];
  safety: string;
};

export type SemanaCurso = {
  slug: `semana-${0 | 1 | 2 | 3 | 4}`;
  number: 0 | 1 | 2 | 3 | 4;
  title: string;
  promise: string;
  objectives: readonly string[];
  result: string;
  sections: readonly SecaoSemana[];
  quest?: QuestSemana;
};

const SEMANAS_BASE = [
  {
    slug: "semana-0",
    number: 0,
    title: "Antes de construir, entenda o sistema",
    promise:
      "Você chega ao primeiro encontro com os acessos organizados, um nome e um e-mail para o seu futuro agente e um mapa simples do que cada peça faz.",
    objectives: [
      "Entender a dinâmica da imersão e o ciclo entre uma etapa de conteúdo e a live.",
      "Organizar as contas essenciais sem assinar ferramentas antes da hora.",
      "Distinguir aplicativo, modelo, agente, ambiente de trabalho, skill e MCP.",
      "Desenhar a primeira skill com um exemplo realista do escritório, usando somente dados fictícios.",
    ],
    result:
      "Ao terminar, você sabe onde acompanhar o curso, o que precisa estar pronto, como as principais peças se conectam e qual será o primeiro trabalho repetível do seu agente.",
    sections: [
      {
        id: "boas-vindas",
        title: "Que bom ter você aqui",
        lede: "Obrigado por confiar na imersão. Você não entrou em um curso para colecionar ferramentas. Entrou para construir um sistema útil para o seu escritório, com calma, teste e responsabilidade.",
        blocks: [
          {
            type: "paragraph",
            text: "A proposta é simples: você recebe uma etapa de conteúdo dentro da plataforma, pratica no seu ritmo e participa de uma live para executar, comparar resultados e destravar dúvidas. Depois da live, a próxima etapa é liberada.",
          },
          {
            type: "callout",
            tone: "info",
            title: "A trilha não segue o calendário",
            text: "Preparação, Etapa 1, Etapa 2, Etapa 3 e Etapa 4 marcam o seu avanço, não datas. Entre uma etapa e outra existe uma live. A próxima etapa aparece quando o encontro anterior termina e o administrador faz a liberação.",
          },
          {
            type: "steps",
            title: "Como a imersão funciona",
            items: [
              {
                title: "Aprenda na plataforma",
                text: "Leia os blocos, veja as gravações, copie os pedidos para o agente e marque o que concluiu.",
              },
              {
                title: "Faça a quest",
                text: "Cada etapa termina com uma entrega pequena que prova o que funcionou. Ela fica salva na sua conta e chega ao Matheus.",
              },
              {
                title: "Envie suas dúvidas",
                text: "Use o formulário da própria etapa. Dúvidas parecidas viram pauta da live e casos individuais continuam identificados por aluno.",
              },
              {
                title: "Participe da live",
                text: "A live é laboratório, não repetição da página. Você chega com tentativa feita, erro registrado e perguntas concretas.",
              },
            ],
          },
          {
            type: "bullets",
            title: "O que esperar",
            items: [
              "Você vai construir por camadas. Não precisa entender tudo de uma vez.",
              "Quebrar uma configuração de teste faz parte do método, desde que exista parada e recuperação.",
              "Nenhum dado real de cliente entra nos laboratórios da imersão.",
              "A IA prepara. Você revisa e decide antes de qualquer envio, publicação ou mudança importante.",
              "Calendário, gravações e acesso ao grupo ficam sempre disponíveis na área da turma.",
            ],
          },
        ],
      },
      {
        id: "contas-e-acessos",
        title: "As contas que formam a sua bancada",
        lede: "Nem tudo precisa ser pago agora. Primeiro, entenda o papel de cada conta. A plataforma vai avisar quando uma opção deixa de ser futura e passa a ser necessária.",
        blocks: [
          {
            type: "comparison",
            title: "O que entra agora e o que entra depois",
            columns: [
              {
                title: "Prepare agora",
                description: "É a base para começar a construção.",
                items: [
                  "Codex ou o acesso OpenAI indicado para trabalhar nos arquivos e configurações.",
                  "Uma VPS individual para hospedar o OpenClaw.",
                  "Uma conta GitHub para guardar versões do que for construído.",
                  "Um Gmail novo, exclusivo do agente.",
                  "Telegram instalado e uma conta que será dona do bot.",
                ],
              },
              {
                title: "Ative quando a aula pedir",
                description: "São úteis, mas não devem virar custo antecipado sem propósito.",
                items: [
                  "OpenRouter para ampliar a escolha de modelos e rotas.",
                  "Salvy ou outro número dedicado para separar a identidade do agente.",
                  "Z-API somente quando entrar o laboratório de WhatsApp, conhecendo os riscos de uma rota não oficial.",
                  "Créditos extras de modelos apenas depois de estimar o teste e o custo.",
                ],
              },
            ],
          },
          {
            type: "steps",
            title: "Dê uma identidade separada ao agente",
            items: [
              {
                title: "Escolha um nome",
                text: "Prefira um nome fácil de falar e reconhecer. Ele não precisa parecer futurista; precisa fazer sentido no seu escritório.",
              },
              {
                title: "Crie o Gmail do agente",
                text: "Use esse endereço para contas operacionais e futuras integrações. Não entregue a senha ao grupo, não reutilize a sua senha pessoal e ative a proteção oferecida pelo provedor.",
              },
              {
                title: "Separe o número",
                text: "Quando chegar a hora dos canais, use um número dedicado. Assim, uma suspensão ou troca de serviço não atinge o seu WhatsApp pessoal.",
              },
              {
                title: "Registre o que foi criado",
                text: "Guarde acessos no seu gerenciador de senhas. A plataforma registra apenas o progresso, nunca senhas, tokens ou chaves.",
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Segredo não é conteúdo de aula",
            text: "Nunca cole senha, token, chave de API, código de recuperação ou arquivo .env em quest, formulário de dúvida, print ou conversa no grupo. Se um segredo aparecer por engano, revogue e gere outro antes de continuar.",
          },
          {
            type: "links",
            title: "Fontes oficiais para abrir conta e conferir instruções",
            items: [
              {
                label: "Codex: primeiros passos",
                url: "https://learn.chatgpt.com/docs/quickstart",
                description:
                  "Documentação oficial OpenAI para conferir as formas atuais de acesso ao Codex.",
              },
              {
                label: "OpenClaw: instalação",
                url: "https://docs.openclaw.ai/install",
                description: "Fonte oficial para o procedimento de instalação vigente.",
              },
              {
                label: "GitHub: o que é um repositório",
                url: "https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories",
              },
              {
                label: "OpenRouter: início rápido",
                url: "https://openrouter.ai/docs/quickstart",
              },
              {
                label: "Salvy",
                url: "https://salvy.com.br/",
                description: "Referência da turma para número ou eSIM dedicado.",
              },
              {
                label: "Z-API: documentação",
                url: "https://developer.z-api.io/en/webhooks/introduction",
                description:
                  "Use somente na etapa de WhatsApp e depois de entender a diferença entre rota oficial e sessão baseada no WhatsApp Web.",
              },
            ],
          },
        ],
      },
      {
        id: "mapa-do-sistema",
        title: "Quem pensa, quem conversa e quem trabalha",
        lede: "Os nomes se misturam porque todos usam IA, mas cada peça ocupa um lugar diferente. Separar esses papéis evita comprar ferramenta errada e culpar o modelo por um problema de configuração.",
        blocks: [
          {
            type: "comparison",
            title: "As peças principais",
            columns: [
              {
                title: "Aplicativo de conversa",
                description: "É a interface onde você conversa, anexa algo e recebe uma resposta.",
                items: [
                  "ChatGPT é um exemplo de aplicativo de conversa e trabalho.",
                  "Uma conversa isolada não conhece automaticamente o seu escritório.",
                  "Ela é ótima para pensar, revisar e explorar uma tarefa pontual.",
                ],
              },
              {
                title: "Ambiente de trabalho do agente",
                description:
                  "Também chamado de harness, reúne modelo, arquivos, instruções, ferramentas, permissões e confirmação humana.",
                items: [
                  "Codex e Claude Code são exemplos dessa categoria.",
                  "Eles conseguem trabalhar sobre uma pasta ou projeto dentro dos limites concedidos.",
                  "O modelo é o motor; o ambiente é o carro inteiro, com volante, freio e painel.",
                ],
              },
              {
                title: "Runtime do agente",
                description:
                  "É o sistema que mantém o agente disponível e o conecta a canais, ferramentas e tarefas agendadas.",
                items: [
                  "OpenClaw ocupa esse papel na imersão.",
                  "Ele roda na VPS e conecta o agente ao Telegram e, mais tarde, a outras integrações.",
                  "O runtime não transforma uma instrução ruim em processo seguro.",
                ],
              },
            ],
          },
          {
            type: "paragraph",
            text: "LLM é a família de modelos que interpreta e produz linguagem. Há famílias conhecidas como GPT, Claude, Grok e Llama. Versões, preços, limites e disponibilidade mudam. Por isso, durante a imersão você aprende a descobrir o que está disponível e a testar o modelo no seu caso, em vez de decorar um nome.",
          },
          {
            type: "callout",
            tone: "info",
            title: "Modelo não é agente",
            text: "O modelo gera a resposta. O agente combina modelo, contexto, instruções, ferramentas, limites e um objetivo. Trocar de modelo pode melhorar uma saída, mas não substitui processo claro, fonte confiável e revisão humana.",
          },
        ],
      },
      {
        id: "skills",
        title: "Skill é o jeito aprovado de fazer algo",
        lede: "Uma skill guarda um procedimento que já foi entendido e testado. Ela ensina quando agir, quais entradas aceitar, o que produzir, quando parar e o que nunca fazer.",
        blocks: [
          {
            type: "bullets",
            title: "Uma boa skill deixa explícito",
            items: [
              "Qual problema resolve e quando deve ser usada.",
              "Quais informações entram e quais dados são proibidos.",
              "Qual sequência precisa ser seguida.",
              "Como conferir se a saída ficou boa.",
              "Em quais situações o agente deve parar e pedir ajuda.",
              "Quais ações continuam dependendo da sua aprovação.",
            ],
          },
          {
            type: "steps",
            title: "Do trabalho repetido à primeira skill",
            items: [
              {
                title: "Escolha uma repetição estável",
                text: "Comece pelo relatório financeiro mensal do próprio escritório. Não comece pelo processo mais sensível nem por uma rotina que muda toda vez.",
              },
              {
                title: "Descreva entrada e saída",
                text: "Defina quais dados fictícios entram, qual estrutura o relatório deve ter e quais verificações vêm antes da entrega.",
              },
              {
                title: "Rode um caso normal e um caso ruim",
                text: "Teste um mês completo e depois um mês com campo ausente ou valor incoerente. A skill precisa avisar, não inventar.",
              },
              {
                title: "Aprove antes de salvar",
                text: "Leia a skill, corrija a linguagem e só então permita que o agente a grave no workspace.",
              },
            ],
          },
          {
            type: "prompt",
            title: "Peça assim ao seu ambiente de trabalho",
            text: `Quero transformar o preparo do relatório financeiro mensal do meu escritório em uma skill.

Antes de criar qualquer arquivo, faça uma pergunta por vez para entender:
1. quais dados entram;
2. quais cálculos ou conferências são obrigatórios;
3. qual estrutura o relatório precisa seguir;
4. o que deve bloquear a execução;
5. o que eu preciso revisar antes de considerar o relatório pronto.

Depois, proponha o texto da skill e um teste com dados totalmente fictícios. Inclua um caso normal e um caso com informação faltando. Não envie nada, não use dados de cliente e só grave a skill depois da minha aprovação explícita.`,
            note: "O objetivo agora é entender o formato. A skill será instalada e testada quando o agente estiver funcionando.",
          },
          {
            type: "links",
            title: "Para consultar",
            items: [
              {
                label: "Skills no OpenClaw",
                url: "https://docs.openclaw.ai/tools/skills",
              },
              {
                label: "Como criar skills no Codex",
                url: "https://learn.chatgpt.com/docs/build-skills",
              },
            ],
          },
        ],
      },
      {
        id: "mcp",
        title: "MCP é uma ponte padronizada",
        lede: "MCP significa Model Context Protocol. Ele cria uma forma comum de um aplicativo de IA acessar ferramentas e fontes externas, como agenda, arquivos ou sistemas autorizados.",
        blocks: [
          {
            type: "paragraph",
            text: "Pense em uma porta USB-C: o formato da conexão é conhecido, mas cada aparelho ainda tem sua função e sua permissão. Um servidor MCP pode oferecer ferramentas e dados. O aplicativo ou agente cliente decide se consegue conectar e o usuário decide o que será autorizado.",
          },
          {
            type: "callout",
            tone: "warning",
            title: "Conectar não significa confiar",
            text: "MCP não é atalho de segurança. Antes de conectar, confira quem mantém o servidor, quais dados ele lê, quais ações ele executa, onde as credenciais ficam e como revogar o acesso. Comece com leitura e dados fictícios sempre que possível.",
          },
          {
            type: "links",
            title: "Fonte oficial",
            items: [
              {
                label: "Introdução ao Model Context Protocol",
                url: "https://modelcontextprotocol.io/docs/getting-started/intro",
              },
            ],
          },
        ],
      },
      {
        id: "resumo-e-duvidas",
        title: "Seu mapa antes da primeira live",
        blocks: [
          {
            type: "summary",
            title: "Seis ideias para guardar",
            items: [
              "A plataforma organiza conteúdo, quests, gravações e dúvidas.",
              "As quatro etapas de conteúdo são intercaladas pelas lives da imersão.",
              "O modelo é o motor; o agente é o sistema com contexto, ferramentas e limites.",
              "Codex e Claude Code são ambientes de trabalho; OpenClaw mantém o agente rodando e conectado.",
              "Skill é um procedimento aprovado e testável.",
              "MCP conecta sistemas, mas cada conexão continua exigindo permissão e revisão.",
            ],
          },
          {
            type: "callout",
            tone: "success",
            title: "Envie sua dúvida pela página",
            text: "Se alguma peça ainda parece confusa, descreva o que você entendeu e onde a conexão se perdeu. Uma dúvida concreta é mais útil do que escrever apenas que não entendeu nada.",
          },
        ],
      },
    ],
  },
  {
    slug: "semana-2",
    number: 2,
    title: "Ensine o agente sobre o seu negócio",
    promise:
      "Você transforma um agente genérico em um assistente que conhece a sua marca, consulta uma base segura e tem cópias que permitem voltar quando algo dá errado.",
    objectives: [
      "Organizar informações do negócio e da marca sem misturar dados de clientes.",
      "Ensinar conceitos de planejamento financeiro com fontes identificadas.",
      "Aplicar o anonimizador antes de qualquer leitura por modelo.",
      "Entender a diferença entre modelos no OpenRouter e busca por vetores.",
      "Criar backup da VPS e guardar o workspace em repositório privado.",
    ],
    result:
      "Ao terminar, o agente responde no tom do escritório, consulta uma base pequena com fonte, bloqueia dados identificáveis e possui caminhos testados de backup da VPS e versionamento no GitHub.",
    sections: [
      {
        id: "boas-vindas",
        title: "O agente já funciona. Agora ele precisa conhecer a casa",
        lede: "Nesta etapa você vai dar contexto ao agente sem transformar o workspace em um depósito de dados sensíveis. O objetivo é ensinar o negócio, não copiar a carteira de clientes para dentro da IA.",
        blocks: [
          {
            type: "bullets",
            title: "Você vai trabalhar em quatro camadas",
            items: [
              "Marca: posicionamento, voz, público, serviços e escolhas visuais.",
              "Negócio: rotina do escritório, processos e critérios de qualidade.",
              "Conhecimento: materiais próprios ou públicos com fonte e data.",
              "Proteção: anonimização, permissões e backup antes de ampliar o uso.",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Conhecer o negócio não é conhecer cada cliente",
            text: "O agente pode aprender como o escritório trabalha sem receber nomes, CPFs, extratos, mensagens ou histórias identificáveis. Comece por regras gerais, exemplos inventados e materiais que você tem direito de usar.",
          },
        ],
      },
      {
        id: "marca-e-negocio",
        title: "Dê contexto que realmente muda a resposta",
        lede: "Contexto útil é específico o bastante para orientar decisões e curto o bastante para ser revisado. Evite adjetivos vazios como profissional, inovador e humanizado sem explicar o que eles significam na prática.",
        blocks: [
          {
            type: "steps",
            title: "Monte o dossiê mínimo do escritório",
            items: [
              {
                title: "Explique para quem você trabalha",
                text: "Descreva o público em termos gerais: momento financeiro, principais dúvidas, grau de conhecimento e tipo de ajuda procurada.",
              },
              {
                title: "Descreva o que você entrega",
                text: "Liste serviços, limites do atendimento, etapas e o que nunca deve ser prometido.",
              },
              {
                title: "Mostre a voz da marca",
                text: "Inclua exemplos curtos de frases que representam o escritório e exemplos do que soa errado.",
              },
              {
                title: "Registre critérios",
                text: "Explique como você reconhece uma boa resposta, quais ressalvas são obrigatórias e quando a IA precisa dizer que não sabe.",
              },
              {
                title: "Teste antes de ampliar",
                text: "Faça três perguntas com casos fictícios e compare as respostas com o jeito real do escritório trabalhar.",
              },
            ],
          },
          {
            type: "prompt",
            title: "Peça assim para configurar negócio e marca",
            text: `Quero que você aprenda como o meu escritório trabalha, sem receber nenhum dado real de cliente.

Faça uma entrevista com uma pergunta por vez sobre:
1. público atendido;
2. serviços e limites;
3. método de trabalho;
4. tom de voz;
5. identidade visual;
6. critérios de uma boa entrega;
7. situações em que você deve parar e pedir revisão.

Depois da entrevista, proponha quais arquivos do workspace devem receber cada informação. Antes de escrever, mostre um resumo e peça minha aprovação. Use exemplos fictícios, não habilite integrações e não altere permissões.`,
            note: "Revise o resumo como se fosse um novo colaborador lendo. Se uma regra puder ser interpretada de dois jeitos, reescreva antes de salvar.",
          },
        ],
      },
      {
        id: "conhecimento-financeiro",
        title: "Ensine com fonte, data e limite",
        lede: "O agente não deve aprender planejamento financeiro por frases soltas da internet. Construa uma base pequena com materiais que você confia, identifique a origem e ensine o agente a recusar quando a resposta não estiver coberta.",
        blocks: [
          {
            type: "steps",
            title: "A primeira base segura",
            items: [
              {
                title: "Escolha poucos materiais",
                text: "Comece com dois ou três documentos próprios, públicos ou licenciados que expliquem um tema bem delimitado.",
              },
              {
                title: "Remova identificação",
                text: "Passe qualquer exemplo pelo controle local e confirme que não restou nome, documento, contato, instituição ou combinação que revele uma pessoa.",
              },
              {
                title: "Registre a origem",
                text: "Cada material precisa de título, autor ou responsável, data e situação: vigente, revisar ou arquivado.",
              },
              {
                title: "Teste três perguntas",
                text: "Faça uma pergunta coberta, uma ausente e uma que depende de contexto humano. A resposta ausente precisa admitir o limite.",
              },
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Fonte não transfere responsabilidade",
            text: "Mesmo quando a resposta cita a base correta, você continua responsável por interpretar o caso e orientar o cliente. O agente ajuda a localizar e preparar; não substitui o julgamento profissional.",
          },
        ],
      },
      {
        id: "anonimizador",
        title: "Dado pessoal passa pelo controle local antes da IA",
        lede: "Anonimização nesta imersão é uma barreira prática, não uma promessa matemática. O código procura formatos conhecidos, substitui identificadores e bloqueia quando algo parece errado.",
        blocks: [
          {
            type: "steps",
            title: "O ritual do anonimizador",
            items: [
              {
                title: "Trabalhe sobre uma cópia",
                text: "O arquivo original fica fora do workspace e fora da conversa. O anonimizador recebe uma cópia local.",
              },
              {
                title: "Detecte e substitua",
                text: "O código procura os formatos cobertos e troca cada pessoa por um identificador opaco e consistente naquela execução.",
              },
              {
                title: "Leia a saída com olhos humanos",
                text: "Procure nomes, apelidos, empresas, cidades, combinações raras e trechos livres que ainda possam reidentificar alguém.",
              },
              {
                title: "Falhe fechado",
                text: "Se o controle acusar problema ou houver dúvida, o arquivo não segue para o agente.",
              },
              {
                title: "Proteja o mapa",
                text: "A relação entre identificador e pessoa fica local, privada e fora do repositório. Ela nunca entra na plataforma do curso.",
              },
            ],
          },
          {
            type: "prompt",
            title: "Peça ao agente para testar a proteção",
            text: `Quero validar o anonimizador do Starter Kit com uma amostra totalmente fictícia.

Crie uma amostra com nomes inventados, e-mails de exemplo, telefones inválidos para uso real e valores fictícios. Rode o controle local, mostre o relatório de detecção e depois inspecione a saída procurando identificadores que possam ter restado.

Inclua também um caso que deve ser bloqueado. Não leia nenhum arquivo real, não mostre o mapa de substituição e não continue se o teste de integridade falhar.`,
          },
          {
            type: "callout",
            tone: "warning",
            title: "Mascarar não autoriza compartilhar",
            text: "Um arquivo aparentemente mascarado ainda pode revelar alguém pelo contexto. Use o mínimo de informação, prefira dados fictícios e não transforme o anonimizador em desculpa para ampliar a coleta.",
          },
        ],
      },
      {
        id: "modelos-e-vetores",
        title: "OpenRouter e vetores resolvem problemas diferentes",
        lede: "OpenRouter oferece acesso e roteamento entre modelos. Busca por vetores usa embeddings para encontrar trechos com significado parecido. Uma conta não transforma automaticamente a outra função em memória.",
        blocks: [
          {
            type: "comparison",
            title: "Não misture as duas decisões",
            columns: [
              {
                title: "Escolha de modelo",
                description: "Decide qual motor prepara a resposta.",
                items: [
                  "Compare qualidade no seu caso, custo, velocidade e política de dados.",
                  "Registre modelo, rota, data e resultado do teste.",
                  "A lista de modelos muda; consulte o catálogo atual antes de escolher.",
                ],
              },
              {
                title: "Busca por vetores",
                description: "Decide como localizar conteúdo semanticamente parecido.",
                items: [
                  "Embeddings transformam trechos em representações numéricas para comparação.",
                  "Busca vetorial ajuda quando a pergunta usa palavras diferentes da fonte.",
                  "O provedor de embeddings precisa ser compatível e configurado separadamente.",
                ],
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Acesso ao modelo não garante embeddings",
            text: "Não presuma que a mesma assinatura, login ou chave usada para conversar com um modelo também autoriza busca semântica. Consulte os provedores suportados pelo OpenClaw e teste a disponibilidade antes de indexar qualquer base.",
          },
          {
            type: "links",
            title: "Referências atuais",
            items: [
              {
                label: "Catálogo e filtros de modelos no OpenRouter",
                url: "https://openrouter.ai/docs/guides/overview/models",
              },
              {
                label: "Busca de memória no OpenClaw",
                url: "https://docs.openclaw.ai/concepts/memory-search",
              },
            ],
          },
        ],
      },
      {
        id: "backup",
        title: "Duas cópias para dois tipos de problema",
        lede: "Backup da VPS e GitHub não são concorrentes. Um ajuda a recuperar o servidor; o outro guarda o histórico dos arquivos que podem ser versionados.",
        blocks: [
          {
            type: "comparison",
            title: "O que cada cópia protege",
            columns: [
              {
                title: "Snapshot ou backup da VPS",
                items: [
                  "Ajuda a voltar o estado do servidor depois de atualização ou configuração ruim.",
                  "Pode incluir serviços e arquivos fora do repositório, conforme o provedor.",
                  "Precisa de teste de restauração; existir no painel não prova que funciona.",
                ],
              },
              {
                title: "Repositório privado no GitHub",
                items: [
                  "Guarda versões do workspace, skills, documentação e código permitido.",
                  "Mostra o que mudou e permite recuperar arquivos conhecidos.",
                  "Não deve conter senhas, tokens, mapas de anonimização ou dados de clientes.",
                ],
              },
            ],
          },
          {
            type: "steps",
            title: "A prova de recuperação",
            items: [
              {
                title: "Crie a cópia",
                text: "Faça o snapshot pelo provedor e envie somente os arquivos permitidos para um repositório privado.",
              },
              {
                title: "Mude uma cópia de teste",
                text: "Altere um arquivo não sensível ou uma configuração demonstrativa.",
              },
              {
                title: "Restaure",
                text: "Recupere o arquivo pelo histórico e confirme como o provedor restaura a VPS sem colocar a operação real em risco.",
              },
              {
                title: "Registre o caminho",
                text: "Escreva onde está cada cópia, quem acessa e quando foi o último teste.",
              },
            ],
          },
          {
            type: "links",
            title: "Leitura de apoio",
            items: [
              {
                label: "GitHub: backup de um repositório",
                url: "https://docs.github.com/en/repositories/archiving-a-github-repository/backing-up-a-repository",
              },
            ],
          },
        ],
      },
      {
        id: "landing-e-imagem",
        title: "Use o agente para tornar o negócio visível",
        lede: "A landing e a imagem institucional são laboratórios de contexto. Se o agente entendeu público, serviço e marca, as duas peças devem parecer parte do mesmo escritório.",
        blocks: [
          {
            type: "prompt",
            title: "Peça uma landing simples",
            text: `Quero criar uma landing page simples para o meu escritório usando apenas as informações de negócio e marca que já aprovei.

A página deve ter:
1. uma abertura clara sobre quem ajudamos;
2. os principais serviços sem promessa absoluta;
3. como funciona o primeiro contato;
4. perguntas frequentes;
5. um convite para conversar.

Antes de escrever código, proponha a estrutura e a copy. Depois da minha aprovação, construa uma página responsiva, acessível e rápida. Use nomes, depoimentos e contatos fictícios no teste. Não publique, não instale rastreamento e não envie formulário sem nova confirmação.`,
          },
          {
            type: "prompt",
            title: "Peça uma imagem institucional coerente",
            text: `Consulte a lista atual de modelos de imagem disponíveis no OpenRouter e proponha uma opção adequada para criar uma imagem institucional do escritório.

Antes de gerar, explique a escolha considerando estilo, qualidade disponível, custo e uso comercial informado pelo provedor. Crie três direções de prompt alinhadas à marca, sem rosto de cliente, documento, logotipo de terceiro ou promessa financeira. Eu escolho uma direção antes da geração.

Ao final, registre o modelo usado, a rota, a data e o custo informado na execução.`,
            note: "A seleção deve ser feita no catálogo atual. Não fixe um nome de modelo no material, porque oferta, preço e capacidade mudam.",
          },
          {
            type: "links",
            title: "Modelos de imagem disponíveis agora",
            items: [
              {
                label: "Geração de imagens no OpenRouter",
                url: "https://openrouter.ai/docs/guides/overview/multimodal/image-generation",
              },
            ],
          },
        ],
      },
      {
        id: "resumo-e-duvidas",
        title: "O agente conhece mais, mas continua limitado",
        blocks: [
          {
            type: "summary",
            title: "Fechamento da Etapa 2",
            items: [
              "Negócio e marca foram descritos sem dados de clientes.",
              "A primeira base tem poucas fontes, data e regra de recusa.",
              "O anonimizador foi testado com caso normal e caso bloqueado.",
              "OpenRouter e busca por vetores foram tratados como decisões separadas.",
              "VPS e workspace possuem cópias com finalidades diferentes.",
              "Landing e imagem nasceram de contexto aprovado e exemplos fictícios.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Leve a tentativa para a live",
            text: "No formulário de dúvidas, informe se o problema está no contexto, na proteção, na busca, no backup ou na construção visual. Anexe somente provas já revisadas e sem informação sensível.",
          },
        ],
      },
    ],
    quest: {
      id: "quest-semana-2-presenca-digital",
      title: "Uma primeira presença digital com a sua cara",
      description:
        "Crie uma landing page simples para o seu negócio e uma imagem institucional alinhada à marca, usando o agente como parceiro de construção e mantendo a publicação sob revisão humana.",
      deliverables: [
        "Uma captura legível da landing em desktop ou celular.",
        "A imagem institucional final.",
        "Um registro curto do modelo de imagem escolhido, da data e do motivo da escolha.",
      ],
      acceptance: [
        "A landing explica público, serviço e próximo passo sem promessa absoluta.",
        "A página funciona em tela pequena e apresenta texto legível.",
        "A imagem combina com a identidade definida para o escritório.",
        "Nenhum material foi publicado nem conectado a formulário real sem aprovação.",
      ],
      safety:
        "Use nome, contato, depoimentos e dados fictícios na versão da quest. Não envie fotografia ou informação de cliente para o modelo de imagem.",
    },
  },
  {
    slug: "semana-3",
    number: 3,
    title: "Faça o agente lembrar e agir na hora certa",
    promise:
      "Você aprende a transformar rotinas recorrentes em tarefas agendadas, começando por lembretes internos que podem ser testados, pausados e auditados.",
    objectives: [
      "Entender o que é um cron e o que ele não resolve sozinho.",
      "Separar horário, procedimento, dados de entrada e destino da saída.",
      "Criar uma rotina que começa com revisão humana, sem envio automático ao cliente.",
      "Testar execução manual, falha, repetição e parada antes de ativar o agendamento.",
      "Combinar crons e skills em exemplos úteis para o escritório.",
    ],
    result:
      "Ao terminar, você tem um cron de aniversário testado com dados fictícios, sabe onde consultar as execuções e consegue explicar quando usar cron, skill ou uma combinação dos dois.",
    sections: [
      {
        id: "boas-vindas",
        title: "Seu agente começa a trabalhar com o relógio",
        lede: "Até aqui, o agente respondia quando você chamava. Agora ele poderá acordar em um horário combinado. Essa autonomia pequena já exige mais clareza, porque uma instrução agendada continua rodando quando você não está olhando.",
        blocks: [
          {
            type: "callout",
            tone: "warning",
            title: "Agendar aumenta a responsabilidade",
            text: "Um cron mal definido repete o erro com pontualidade. Comece por uma tarefa interna, mantenha o destino sob seu controle e não permita envio a cliente até que a rotina tenha histórico de testes e aprovação explícita.",
          },
          {
            type: "bullets",
            title: "O que você precisa decidir antes de agendar",
            items: [
              "Qual resultado deve existir no final.",
              "Quando e em qual fuso horário a tarefa roda.",
              "Quais dados entram e onde eles ficam.",
              "Qual skill ou procedimento será usado.",
              "Onde a saída aparece para revisão.",
              "O que acontece quando falta dado ou o serviço está indisponível.",
            ],
          },
        ],
      },
      {
        id: "conceito",
        title: "Cron acorda. Skill sabe o que fazer",
        lede: "Cron é o agendador do OpenClaw. Ele persiste uma tarefa, acorda o agente ou executa uma ação no horário definido e registra o resultado. A qualidade do trabalho continua dependendo da instrução, da skill e das fontes disponíveis.",
        blocks: [
          {
            type: "comparison",
            title: "Três peças que trabalham juntas",
            columns: [
              {
                title: "Cron",
                description: "Responde à pergunta quando.",
                items: [
                  "Agenda uma execução única ou recorrente.",
                  "Mantém histórico e estado da tarefa no runtime.",
                  "Pode acordar um agente ou chamar um destino configurado.",
                ],
              },
              {
                title: "Skill",
                description: "Responde à pergunta como.",
                items: [
                  "Guarda o procedimento aprovado.",
                  "Define entradas, critérios, limites e saída.",
                  "Pode ser usada manualmente antes de receber um horário.",
                ],
              },
              {
                title: "Você",
                description: "Responde às perguntas pode e está bom.",
                items: [
                  "Autoriza dados, ferramentas e destino.",
                  "Revisa a primeira versão e as exceções.",
                  "Pausa a rotina quando o contexto muda.",
                ],
              },
            ],
          },
          {
            type: "paragraph",
            text: "Use cron quando o horário ou a recorrência forem parte real do problema. Se a tarefa acontece porque chegou uma mensagem, um formulário ou um arquivo, o gatilho é um evento e provavelmente será melhor tratado por uma automação. Essa diferença fica concreta na Etapa 4.",
          },
          {
            type: "links",
            title: "Fonte oficial",
            items: [
              {
                label: "Tarefas agendadas no OpenClaw",
                url: "https://docs.openclaw.ai/cron",
              },
              {
                label: "Referência do comando cron",
                url: "https://docs.openclaw.ai/cli/cron",
              },
            ],
          },
        ],
      },
      {
        id: "relatorio-diario",
        title: "Exemplo: relatório interno do começo do dia",
        lede: "Um bom primeiro cron prepara informação para você. Ele não fala com cliente, não decide prioridade sozinho e não apaga a fonte depois de ler.",
        blocks: [
          {
            type: "steps",
            title: "Desenho do relatório",
            items: [
              {
                title: "Defina a pergunta",
                text: "Todos os dias úteis, quais compromissos, pendências e alertas fictícios precisam da minha atenção?",
              },
              {
                title: "Limite as fontes",
                text: "Use uma agenda de teste, uma lista fictícia de pendências e um arquivo de avisos controlado pelo aluno.",
              },
              {
                title: "Defina a estrutura",
                text: "O relatório traz horário, assunto, fonte, ação sugerida e uma seção clara para informação ausente.",
              },
              {
                title: "Escolha o destino",
                text: "Entregue no canal privado do aluno ou grave como rascunho interno. Não envie a terceiros.",
              },
              {
                title: "Planeje a falha",
                text: "Se uma fonte não responder, o relatório mostra a falha e continua apenas com o que foi verificado.",
              },
            ],
          },
          {
            type: "prompt",
            title: "Peça o desenho antes do agendamento",
            text: `Quero criar um cron para preparar um relatório interno no começo de cada dia útil.

Antes de agendar, desenhe a rotina com:
1. horário e fuso;
2. fontes fictícias permitidas;
3. skill ou procedimento usado;
4. formato da saída;
5. destino privado para revisão;
6. comportamento quando uma fonte falhar;
7. forma de impedir duplicidade;
8. procedimento de pausa e remoção.

Crie primeiro uma execução manual com dados fictícios. Não envie mensagem a cliente, não habilite webhook e não crie o cron até eu revisar o resultado.`,
          },
        ],
      },
      {
        id: "teste-e-ativacao",
        title: "Teste no presente antes de confiar no futuro",
        lede: "Agendamento só entra depois que o mesmo procedimento funciona manualmente. O relógio é a última camada, não a primeira.",
        blocks: [
          {
            type: "steps",
            title: "O portão de ativação",
            items: [
              {
                title: "Rode manualmente",
                text: "Use exatamente a mesma instrução e as mesmas fontes que o cron usará.",
              },
              {
                title: "Confira a saída",
                text: "Valide conteúdo, fonte, destinatário e ausência de dados reais.",
              },
              {
                title: "Rode de novo",
                text: "A segunda execução não pode duplicar registro ou criar dois lembretes equivalentes.",
              },
              {
                title: "Force uma falha",
                text: "Retire um campo fictício ou torne uma fonte indisponível e confirme que a rotina avisa e para no ponto certo.",
              },
              {
                title: "Agende por pouco tempo",
                text: "Ative em ambiente de teste, acompanhe o primeiro ciclo e mantenha o caminho de pausa à mão.",
              },
              {
                title: "Leia o histórico",
                text: "Registre execução, resultado, falha e correção. Sem histórico, a rotina não está pronta para crescer.",
              },
            ],
          },
          {
            type: "callout",
            tone: "success",
            title: "Critério de pronto",
            text: "Você consegue executar agora, repetir sem duplicar, observar uma falha, consultar o histórico e pausar o cron. O resultado chega somente a você para revisão.",
          },
        ],
      },
      {
        id: "aniversarios",
        title: "Laboratório: lembrar aniversários sem mandar mensagem sozinho",
        lede: "O cron consulta uma lista fictícia todos os dias, identifica datas do dia e prepara um lembrete para o planejador. A mensagem para o cliente continua fora da automação.",
        blocks: [
          {
            type: "steps",
            title: "Fluxo mínimo",
            items: [
              {
                title: "Crie a base fictícia",
                text: "Use identificadores inventados, datas de teste e observações que não correspondam a pessoas reais.",
              },
              {
                title: "Use uma skill estável",
                text: "A skill lê a lista validada, encontra as datas do dia e prepara o lembrete no formato aprovado.",
              },
              {
                title: "Agende a consulta",
                text: "Defina horário, fuso e destino privado. O cron apenas acorda a rotina.",
              },
              {
                title: "Revise o resultado",
                text: "O aluno recebe quem merece atenção e uma sugestão de mensagem, mas decide se, quando e como falar com a pessoa.",
              },
              {
                title: "Registre e evite repetição",
                text: "Marque a execução do dia para que reiniciar a rotina não crie lembretes duplicados.",
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Data de nascimento é dado pessoal",
            text: "A quest usa somente registros fictícios. Quando uma rotina real for avaliada, a base precisará de propósito, acesso restrito, retenção definida e revisão das obrigações aplicáveis ao escritório.",
          },
        ],
      },
      {
        id: "resumo-e-duvidas",
        title: "Mais autonomia, mais observação",
        blocks: [
          {
            type: "summary",
            title: "Fechamento da Etapa 3",
            items: [
              "Cron define quando; skill define como; o aluno define se pode e se está bom.",
              "Tarefa manual estável vem antes do agendamento.",
              "Horário, fuso, fonte, destino, falha e parada fazem parte da definição.",
              "A primeira rotina entrega somente ao planejador.",
              "Execução repetida não pode duplicar resultado.",
              "Histórico e procedimento de pausa são parte da entrega.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Leve o histórico para a live",
            text: "No formulário de dúvidas, informe o identificador da execução sem expor segredo, o horário esperado, o resultado observado e como a rotina se comportou na falha simulada.",
          },
        ],
      },
    ],
    quest: {
      id: "quest-semana-3-crons",
      title: "Um relógio útil para o escritório",
      description:
        "Descreva de duas a quatro combinações de crons e skills que ajudariam o seu negócio. Depois, construa e teste um cron diário que identifica aniversários fictícios e lembra somente você.",
      deliverables: [
        "De duas a quatro ideias, cada uma com horário ou frequência, skill usada, fonte, destino e aprovação humana.",
        "Uma prova da execução manual do cron de aniversários.",
        "Uma prova da execução agendada ou do histórico da tarefa.",
        "Uma descrição curta de como pausar e evitar duplicidade.",
      ],
      acceptance: [
        "As ideias usam cron apenas quando tempo ou recorrência são parte do problema.",
        "O laboratório usa somente pessoas e datas fictícias.",
        "O resultado chega ao aluno, não ao cliente.",
        "A rotina possui falha visível, histórico e caminho de parada.",
      ],
      safety:
        "Não importe agenda, contatos ou aniversários reais. Não automatize envio de mensagem. O exercício termina no lembrete privado ao planejador.",
    },
  },
  {
    slug: "semana-1",
    number: 1,
    title: "Coloque o seu agente no ar",
    promise:
      "Você termina a etapa com o OpenClaw rodando na sua VPS, conectado ao Telegram, protegido para uso individual e usando o Starter Kit como base.",
    objectives: [
      "Instalar o OpenClaw seguindo a documentação vigente.",
      "Conectar um bot do Telegram e limitar quem pode falar com ele.",
      "Configurar a rota de modelo disponível para o agente.",
      "Aplicar o Starter Kit e fazer o primeiro teste de identidade.",
      "Aprender a parar, diagnosticar e recuperar antes de experimentar livremente.",
    ],
    result:
      "Ao terminar, o seu agente responde no Telegram, reconhece a própria função, sabe quem é o operador autorizado e pode ser parado sem improviso.",
    sections: [
      {
        id: "boas-vindas",
        title: "Hoje a ideia vira sistema",
        lede: "Na Preparação você conheceu as peças. Agora elas começam a trabalhar juntas: a VPS hospeda, o OpenClaw coordena, o modelo responde e o Telegram vira a porta de conversa.",
        blocks: [
          {
            type: "callout",
            tone: "info",
            title: "A exceção do agente-first",
            text: "A instalação inicial é o único momento em que você ainda não consegue pedir ajuda ao próprio agente, porque ele não existe. Siga a gravação e a documentação da aula. Assim que o primeiro oi funcionar, volte ao método agente-first: descreva o objetivo, peça um plano, revise e confirme antes de executar.",
          },
          {
            type: "bullets",
            title: "Antes de começar",
            items: [
              "Tenha acesso à VPS, ao Gmail do agente, ao Telegram e ao gerenciador de senhas.",
              "Use apenas o seu bot e o seu servidor. Não compartilhe a instância com outro aluno.",
              "Separe dados fictícios para todos os testes.",
              "Reserve tempo para instalar e também para testar a parada e a recuperação.",
            ],
          },
        ],
      },
      {
        id: "instalacao",
        title: "Da VPS ao primeiro oi",
        lede: "A gravação desta seção mostra a tela inteira e os pontos de conferência. Os passos abaixo são o mapa, enquanto a documentação oficial é a fonte para comandos e opções que podem mudar.",
        blocks: [
          {
            type: "steps",
            title: "A sequência da instalação",
            items: [
              {
                title: "Confirme a VPS",
                text: "Verifique acesso, sistema atualizado e espaço disponível. Registre como voltar ao painel da hospedagem antes de alterar qualquer coisa.",
              },
              {
                title: "Instale o OpenClaw",
                text: "Use o procedimento vigente na documentação oficial e acompanhe cada confirmação. Não execute script recebido por mensagem ou copiado de fonte desconhecida.",
              },
              {
                title: "Faça o onboarding",
                text: "Escolha uma rota de modelo disponível na sua conta e teste a autenticação. Não trate assinatura como uso ilimitado e não grave chaves no repositório.",
              },
              {
                title: "Crie o bot no Telegram",
                text: "Converse somente com o @BotFather oficial, crie o bot, guarde o token no local indicado e apague qualquer mensagem ou print que exponha esse token.",
              },
              {
                title: "Conecte e autorize",
                text: "Configure o canal com política restrita, aprove apenas a sua identidade e mantenha grupos bloqueados até existir uma necessidade real.",
              },
              {
                title: "Envie o primeiro oi",
                text: "Mande uma mensagem simples pelo Telegram e confirme que a resposta veio do agente certo, na VPS certa e para o usuário autorizado.",
              },
            ],
          },
          {
            type: "links",
            title: "Documentação para acompanhar a gravação",
            items: [
              {
                label: "Instalação do OpenClaw",
                url: "https://docs.openclaw.ai/install",
              },
              {
                label: "Canal Telegram no OpenClaw",
                url: "https://docs.openclaw.ai/channels/telegram",
              },
              {
                label: "BotFather e recursos de bots",
                url: "https://core.telegram.org/bots/features#botfather",
              },
            ],
          },
        ],
      },
      {
        id: "seguranca",
        title: "Seu agente não pode ficar aberto para qualquer pessoa",
        lede: "Um agente com ferramentas pode ler arquivos, alterar configurações e conversar por canais. Segurança começa por decidir quem entra e o que cada pessoa pode fazer.",
        blocks: [
          {
            type: "steps",
            title: "O mínimo seguro da turma",
            items: [
              {
                title: "Um operador por gateway",
                text: "A instância é pessoal. Não use o mesmo gateway para clientes ou pessoas que não confiam umas nas outras.",
              },
              {
                title: "Telegram restrito",
                text: "Use pareamento ou lista explícita de usuários. Não deixe mensagens diretas ou grupos abertos para qualquer conta.",
              },
              {
                title: "Gateway sem exposição pública",
                text: "Mantenha a interface de controle em acesso privado e autenticado. Não publique a porta do gateway diretamente na internet.",
              },
              {
                title: "Ferramentas mínimas",
                text: "Comece com o menor conjunto necessário. Envio, cron, alteração de configuração e execução ampla entram apenas quando houver propósito e controle.",
              },
              {
                title: "Auditoria depois da mudança",
                text: "Rode a verificação de segurança recomendada pelo OpenClaw e leia os alertas. Correção automática não substitui entender o que foi exposto.",
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Token vazou? Pare e troque",
            text: "Não tente esconder um token já exposto apagando apenas a mensagem. Revogue o token no serviço de origem, gere outro, atualize a configuração e confira os registros de acesso.",
          },
          {
            type: "links",
            title: "Referência de segurança",
            items: [
              {
                label: "Segurança do Gateway OpenClaw",
                url: "https://docs.openclaw.ai/gateway/security",
              },
            ],
          },
        ],
      },
      {
        id: "starter-kit",
        title: "Agora o agente ganha uma casa organizada",
        lede: "O Starter Kit separa identidade, regras, contexto do usuário, ferramentas e habilidades. Ele evita jogar tudo em um único texto impossível de revisar.",
        blocks: [
          {
            type: "comparison",
            title: "O papel de cada parte",
            columns: [
              {
                title: "Quem ele é",
                items: [
                  "IDENTITY registra nome e apresentação.",
                  "SOUL define voz e postura, sem acumular regras técnicas.",
                  "USER registra quem é você e como prefere trabalhar.",
                ],
              },
              {
                title: "Como ele trabalha",
                items: [
                  "AGENTS reúne regras operacionais e limites.",
                  "TOOLS documenta ferramentas e convenções.",
                  "Skills guardam procedimentos específicos e testáveis.",
                ],
              },
              {
                title: "Como ele começa",
                items: [
                  "BOOTSTRAP faz as perguntas iniciais uma por vez.",
                  "Você revisa o que será escrito antes de confirmar.",
                  "O primeiro teste usa somente um caso fictício.",
                ],
              },
            ],
          },
          {
            type: "prompt",
            title: "Depois do primeiro oi, peça assim",
            text: `Quero instalar e configurar o Starter Kit da imersão neste workspace.

Antes de modificar qualquer arquivo:
1. mostre quais arquivos serão criados ou alterados;
2. confirme que nenhum segredo será copiado para o workspace;
3. faça as perguntas do BOOTSTRAP uma por vez;
4. use somente exemplos fictícios;
5. apresente um resumo das mudanças para minha revisão.

Não apague arquivos existentes, não habilite envio externo e não amplie permissões sem me pedir confirmação.`,
            note: "Leia o plano antes de autorizar. Se o agente encontrar arquivos existentes, peça uma comparação e escolha conscientemente o que será mantido.",
          },
        ],
      },
      {
        id: "quebrar-e-recuperar",
        title: "Pode quebrar. Só não pode perder o caminho de volta",
        lede: "A meta não é ter medo de mexer. É aprender a mudar uma coisa por vez, observar o efeito e recuperar quando o teste falhar.",
        blocks: [
          {
            type: "steps",
            title: "O ciclo seguro de qualquer mudança",
            items: [
              {
                title: "Fotografe o estado",
                text: "Anote o que funciona e salve a configuração antes da mudança.",
              },
              {
                title: "Mude uma coisa",
                text: "Não troque modelo, canal e permissões ao mesmo tempo.",
              },
              {
                title: "Teste com uma frase simples",
                text: "Use uma entrada conhecida e confirme resposta, logs e destinatário.",
              },
              {
                title: "Leia o diagnóstico",
                text: "Antes de reinstalar, descubra se a falha está no serviço, na autenticação, no canal ou na configuração.",
              },
              {
                title: "Volte ou corrija",
                text: "Restaure o estado anterior quando a causa ainda não estiver clara. Registre o que aprendeu para não repetir a tentativa no escuro.",
              },
            ],
          },
          {
            type: "callout",
            tone: "success",
            title: "O primeiro critério de pronto",
            text: "Seu agente responde somente para você no Telegram, apresenta quem é, não recebeu dados reais e pode ser parado e iniciado novamente com um procedimento conhecido.",
          },
        ],
      },
      {
        id: "resumo-e-duvidas",
        title: "O que precisa ficar de pé",
        blocks: [
          {
            type: "summary",
            title: "Fechamento da Etapa 1",
            items: [
              "VPS acessível e OpenClaw instalado pela fonte oficial.",
              "Telegram conectado ao bot certo e restrito ao operador autorizado.",
              "Rota de modelo configurada sem expor credenciais.",
              "Starter Kit aplicado com revisão humana.",
              "Primeiro oi concluído e procedimento de parada conhecido.",
              "Quest feita com print sem token, senha ou dado de cliente.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Dúvida boa traz contexto",
            text: "Ao enviar uma dúvida, diga em qual passo estava, o que esperava, o que aconteceu e qual mensagem de erro apareceu. Oculte endereços, IPs, tokens e qualquer dado pessoal antes do print.",
          },
        ],
      },
    ],
    quest: {
      id: "quest-semana-1-identidade",
      title: "Quem é o seu agente?",
      description:
        "Converse com o agente pelo Telegram e peça que ele explique quem é, qual é o papel dele no seu escritório e como pretende ajudar no dia a dia. Envie um print da resposta.",
      deliverables: [
        "Um print legível da conversa no Telegram.",
        "Uma resposta que mencione identidade, papel e pelo menos duas formas concretas de ajuda.",
      ],
      acceptance: [
        "A conversa aconteceu com o agente instalado na VPS do aluno.",
        "A resposta está coerente com o Starter Kit configurado.",
        "O print não revela token, senha, IP, e-mail pessoal ou dado de cliente.",
      ],
      safety:
        "Use somente informações do próprio escritório que possam aparecer na atividade. Não inclua nomes, mensagens ou documentos de clientes.",
    },
  },
  {
    slug: "semana-4",
    number: 4,
    title: "Construa automações de verdade com n8n",
    promise:
      "Você aprende a ligar eventos, dados e ações em um fluxo visual, com validação, revisão humana, histórico, parada e recuperação.",
    objectives: [
      "Entender o papel do n8n dentro do sistema construído na imersão.",
      "Reconhecer triggers, nós de transformação, decisões, ações e tratamento de erro.",
      "Distinguir n8n, cron e OpenClaw sem tratar um como substituto do outro.",
      "Desenhar um fluxo que recebe um evento de WhatsApp com dados fictícios.",
      "Criar um lembrete de atualização no Planfi a partir de uma planilha de teste.",
    ],
    result:
      "Ao terminar, você consegue explicar o papel de cada ferramenta e demonstrar um workflow de lembrete com dado fictício, sem envio automático, com duplicidade controlada e aprovação humana visível.",
    sections: [
      {
        id: "boas-vindas",
        title: "Chegou a hora de ligar as peças",
        lede: "Cron ensinou o agente a acordar em um horário. O n8n amplia o desenho: um horário, formulário, webhook, arquivo ou evento pode iniciar uma sequência de passos com caminhos e registros claros.",
        blocks: [
          {
            type: "callout",
            tone: "info",
            title: "Automação não é piloto automático",
            text: "Automação significa executar etapas previsíveis sob regras conhecidas. Quanto maior o efeito externo, maior precisa ser o controle. Na imersão, fluxos preparam e organizam; o planejador revisa antes de enviar ou alterar algo para o cliente.",
          },
          {
            type: "bullets",
            title: "O workflow mínimo precisa mostrar",
            items: [
              "O evento que inicia a execução.",
              "Os dados aceitos e as validações obrigatórias.",
              "As transformações feitas em cada etapa.",
              "O ponto de decisão ou aprovação humana.",
              "O destino da saída.",
              "Como o erro é registrado, como o fluxo para e como pode ser retomado.",
            ],
          },
        ],
      },
      {
        id: "o-que-e-n8n",
        title: "n8n é a esteira visual da operação",
        lede: "No n8n, um workflow liga nós. Cada nó recebe dados, executa uma tarefa e entrega um resultado para o próximo. O histórico de execuções permite enxergar por onde o dado passou e onde a falha aconteceu.",
        blocks: [
          {
            type: "steps",
            title: "As peças de um workflow",
            items: [
              {
                title: "Trigger",
                text: "É o gatilho de entrada. Pode ser horário, webhook, evento de aplicativo ou execução manual.",
              },
              {
                title: "Entrada e validação",
                text: "Confirma formato, campos obrigatórios, origem e tamanho antes de permitir que o dado avance.",
              },
              {
                title: "Transformação",
                text: "Organiza, filtra, combina ou converte os dados para o formato esperado pela etapa seguinte.",
              },
              {
                title: "Decisão",
                text: "Escolhe caminhos conforme uma regra explícita, como completo, incompleto, duplicado ou exige revisão.",
              },
              {
                title: "Ação",
                text: "Grava, consulta, prepara ou chama outro serviço dentro das permissões aprovadas.",
              },
              {
                title: "Erro e recuperação",
                text: "Registra a falha, evita repetição indevida, avisa o responsável e oferece um caminho seguro de nova tentativa.",
              },
            ],
          },
          {
            type: "links",
            title: "Documentação oficial do n8n",
            items: [
              {
                label: "Entender workflows",
                url: "https://docs.n8n.io/workflows/",
              },
              {
                label: "Webhook node",
                url: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/",
              },
              {
                label: "Histórico de execuções",
                url: "https://docs.n8n.io/workflows/executions/all-executions/",
              },
            ],
          },
        ],
      },
      {
        id: "comparacao",
        title: "n8n, cron e OpenClaw trabalham em camadas diferentes",
        lede: "A pergunta útil não é qual ferramenta é melhor. É qual delas deve ser responsável por cada pedaço do processo.",
        blocks: [
          {
            type: "comparison",
            title: "Divisão de trabalho",
            columns: [
              {
                title: "Cron",
                description: "Agenda uma tarefa no tempo.",
                items: [
                  "Bom para rotinas em horário ou frequência definidos.",
                  "Acorda uma instrução ou ação conhecida.",
                  "Não desenha sozinho uma integração com muitos estados e sistemas.",
                ],
              },
              {
                title: "n8n",
                description: "Orquestra eventos, dados e serviços.",
                items: [
                  "Mostra o caminho do dado em um fluxo visual.",
                  "Lida com webhooks, transformações, condições e integrações.",
                  "Precisa de credenciais, validação, histórico e tratamento de erro.",
                ],
              },
              {
                title: "OpenClaw",
                description: "Mantém o agente, suas skills e seus canais.",
                items: [
                  "Usa contexto e linguagem para preparar uma saída.",
                  "Pode ser chamado por uma automação dentro de limites definidos.",
                  "Não deve receber dados brutos que o fluxo ainda não validou ou protegeu.",
                ],
              },
            ],
          },
          {
            type: "summary",
            title: "Regra de bolso",
            items: [
              "Se o problema é quando, olhe primeiro para cron ou Schedule Trigger.",
              "Se o problema é quando algo acontece em outro sistema, olhe para trigger ou webhook no n8n.",
              "Se o problema exige interpretar contexto ou redigir, chame uma skill do agente depois da validação.",
              "Se a ação afeta alguém fora do escritório, coloque revisão humana antes dela.",
            ],
          },
        ],
      },
      {
        id: "whatsapp-trigger",
        title: "Laboratório: uma mensagem de WhatsApp inicia o fluxo",
        lede: "O objetivo é aprender o caminho de entrada. Uma mensagem fictícia chega por webhook, é validada, protegida e vira um rascunho interno. O fluxo não responde sozinho.",
        blocks: [
          {
            type: "steps",
            title: "O caminho seguro da mensagem",
            items: [
              {
                title: "Receba o webhook",
                text: "Use o endpoint de teste do n8n e um payload fictício compatível com a documentação do provedor.",
              },
              {
                title: "Valide a origem e o formato",
                text: "Rejeite chamadas sem autenticação esperada, campos obrigatórios ou tamanho aceitável.",
              },
              {
                title: "Controle duplicidade",
                text: "Use o identificador do evento para impedir que uma nova tentativa processe a mesma mensagem duas vezes.",
              },
              {
                title: "Minimize e proteja",
                text: "Mantenha somente o necessário, passe o conteúdo textual pelo controle previsto e bloqueie quando houver identificação inesperada.",
              },
              {
                title: "Prepare um rascunho",
                text: "O agente classifica a intenção e prepara uma sugestão com base em uma skill aprovada, sem enviar.",
              },
              {
                title: "Peça decisão humana",
                text: "O planejador pode aprovar, editar, descartar ou encaminhar para atendimento manual.",
              },
              {
                title: "Registre o resultado",
                text: "Salve o estado final, o horário, a revisão e qualquer falha sem persistir segredo no histórico.",
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Z-API não é a rota oficial da Meta",
            text: "A Z-API opera sobre uma sessão do WhatsApp Web e possui riscos próprios de estabilidade e bloqueio. Compare com a Cloud API oficial antes de uso real. Neste laboratório, use número e dados de teste, não faça disparo em massa e mantenha o envio desligado.",
          },
          {
            type: "links",
            title: "Consulte antes de configurar",
            items: [
              {
                label: "Webhooks da Z-API",
                url: "https://developer.z-api.io/en/webhooks/introduction",
              },
              {
                label: "WhatsApp Cloud API",
                url: "https://developers.facebook.com/docs/whatsapp/cloud-api/",
                description: "Documentação da rota oficial da Meta.",
              },
            ],
          },
        ],
      },
      {
        id: "planfi",
        title: "Laboratório: lembrar a atualização no Planfi",
        lede: "O workflow lê uma planilha fictícia de acompanhamento, identifica quem está no prazo de atualização e prepara lembretes para revisão. Ele não acessa o Planfi nem presume uma API que não foi confirmada.",
        blocks: [
          {
            type: "steps",
            title: "Desenho do fluxo",
            items: [
              {
                title: "Inicie manualmente ou por agenda",
                text: "Durante o teste, rode manualmente. Depois, um Schedule Trigger pode consultar a planilha na frequência aprovada.",
              },
              {
                title: "Leia a planilha de teste",
                text: "Use identificador fictício, data da última atualização, próxima data e canal preferido inventado.",
              },
              {
                title: "Valide cada linha",
                text: "Separe registros completos, incompletos, vencidos e duplicados. Registro inválido vai para revisão, não para descarte silencioso.",
              },
              {
                title: "Selecione quem precisa de lembrete",
                text: "A regra de prazo deve ser explícita e independente do modelo de linguagem.",
              },
              {
                title: "Prepare a mensagem",
                text: "O agente usa uma skill aprovada para redigir o rascunho com tom adequado e sem inventar informação.",
              },
              {
                title: "Revise em uma fila",
                text: "O planejador vê destinatário fictício, motivo, data de referência e texto antes de decidir.",
              },
              {
                title: "Registre e evite repetição",
                text: "Somente depois da decisão humana o item muda de estado. Uma nova execução não recria o mesmo lembrete sem motivo.",
              },
            ],
          },
          {
            type: "prompt",
            title: "Peça o workflow ao agente",
            text: `Quero desenhar um workflow no n8n que leia uma planilha fictícia de acompanhamento e prepare lembretes para clientes atualizarem suas informações no Planfi.

Antes de construir, proponha o fluxo nó a nó com:
1. trigger manual para o primeiro teste;
2. schema da planilha fictícia;
3. validação de campos;
4. regra determinística de prazo;
5. controle de duplicidade;
6. chamada de uma skill apenas para redigir o rascunho;
7. fila de aprovação humana;
8. registro de estado;
9. tratamento de erro e nova tentativa segura;
10. botão ou procedimento de parada.

Não conecte WhatsApp real, não envie mensagens, não use dados de cliente e não afirme que existe integração direta com o Planfi. Mostre o desenho e espere minha aprovação antes de criar o workflow.`,
          },
          {
            type: "callout",
            tone: "success",
            title: "Critério de pronto",
            text: "Uma linha fictícia válida gera um único rascunho para revisão. Linha incompleta é separada, repetição não duplica, erro fica visível e nenhum contato externo acontece.",
          },
        ],
      },
      {
        id: "publicacao-segura",
        title: "Antes de ligar, prove que sabe desligar",
        lede: "Workflow salvo não é workflow pronto. A última etapa é demonstrar que o fluxo se comporta bem no caso normal, no caso duplicado e no caso de falha.",
        blocks: [
          {
            type: "steps",
            title: "A bateria mínima de testes",
            items: [
              {
                title: "Caso normal",
                text: "Entrada válida percorre o caminho esperado e termina em rascunho.",
              },
              {
                title: "Caso incompleto",
                text: "Campo obrigatório ausente desvia para revisão sem chamar o agente.",
              },
              {
                title: "Caso duplicado",
                text: "O mesmo evento não cria dois rascunhos nem dois registros finais.",
              },
              {
                title: "Serviço indisponível",
                text: "A falha é registrada e a nova tentativa não perde nem repete o estado.",
              },
              {
                title: "Entrada hostil",
                text: "Texto tentando mudar regras ou pedir segredo é tratado como dado não confiável.",
              },
              {
                title: "Parada",
                text: "O aluno desativa o workflow e sabe quais execuções ainda estão aguardando.",
              },
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Credencial não aparece em print",
            text: "Ao registrar a quest ou pedir ajuda, mostre o desenho do fluxo e o resultado dos nós. Recorte ou oculte URLs privadas, cabeçalhos, tokens, números reais e valores de credenciais.",
          },
        ],
      },
      {
        id: "resumo-e-duvidas",
        title: "A automação fica legível de ponta a ponta",
        blocks: [
          {
            type: "summary",
            title: "Fechamento da Etapa 4",
            items: [
              "Trigger inicia; nós validam, transformam, decidem e agem.",
              "n8n orquestra o fluxo; OpenClaw prepara linguagem e contexto; cron agenda quando necessário.",
              "Webhook é entrada não confiável até passar por autenticação e validação.",
              "Dados são minimizados antes de chegar ao agente.",
              "Revisão humana fica antes de qualquer efeito externo.",
              "Histórico, duplicidade, erro, nova tentativa e parada fazem parte da automação.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "A live começa pela execução",
            text: "Envie no formulário de dúvidas o ponto exato onde o item entrou, o caminho percorrido, o estado final e o teste que falhou. Um print do canvas sem execução não mostra se o fluxo funciona.",
          },
        ],
      },
    ],
    quest: {
      id: "quest-semana-4-n8n",
      title: "Da planilha ao rascunho, com controle",
      description:
        "Explique as diferenças entre n8n, cron e OpenClaw. Depois, crie no n8n um workflow que lê uma planilha fictícia, identifica quem precisa atualizar informações no Planfi e prepara um lembrete para revisão humana.",
      deliverables: [
        "Uma explicação curta de n8n versus cron.",
        "Uma explicação curta de n8n versus OpenClaw.",
        "Uma captura do workflow completo no n8n.",
        "Provas de uma execução normal, uma duplicada e uma com erro controlado.",
        "Uma descrição do ponto de aprovação e do procedimento de parada.",
      ],
      acceptance: [
        "A regra de prazo é determinística e não depende do modelo de linguagem.",
        "A skill ou o agente entra somente depois da validação dos dados.",
        "A execução duplicada não cria um novo lembrete equivalente.",
        "A saída termina em rascunho para o aluno, sem mensagem externa.",
        "Falha e recuperação podem ser observadas no histórico.",
      ],
      safety:
        "Use planilha, nomes, contatos e datas fictícios. Mantenha credenciais ocultas, WhatsApp desconectado para envio e qualquer integração real com o Planfi fora do laboratório.",
    },
  },
] as const satisfies readonly SemanaCurso[];

export const SEMANAS: readonly SemanaCurso[] = [...SEMANAS_BASE].sort(
  (a, b) => a.number - b.number,
);
