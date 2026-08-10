# Design

Sistema visual Carvão & Lime da área de membros IA para Planejadores.

## Colors

- `--carvao: #14171C`: fundo principal.
- `--carvao2: #1B1F26`: superfície elevada.
- `--grafite: #232831` e `--grafite2: #2D333D`: estrutura e divisores.
- `--lime: #93D547`: ação primária e estado positivo.
- `--lime-claro: #C7F284`: foco e realce sobre carvão.
- `--lime-escuro: #5E9A22`: realce legível sobre claro.
- `--offwhite: #F5F2EA`: texto e superfícies claras.
- `--texto-sec: #A9B0AB`: texto secundário sobre carvão.
- `--terracota: #C2683B`: alerta humano.
- `--erro: #E07856`: erro e ação destrutiva.

Lime indica ação, liberação e conclusão. Estados bloqueados usam neutralidade e texto explícito, nunca apenas baixa opacidade.

## Typography

Poppins 400–700 em toda a UI autenticada. Escala fixa em `rem`, títulos compactos e textos com largura controlada. Fraunces fica reservada às superfícies editoriais de marca.

## Layout

Shell central de até 1080 px, navegação superior e fluxo vertical. Superfícies usam raio de 12–18 px. Evitar cartões aninhados; progresso e estados devem ser lidos em uma única camada.

## Components

- Botão primário: lime sobre carvão, formato pill, foco visível.
- Botão secundário: transparente com borda discreta.
- Card de etapa: superfície carvão, título, estado, progresso e uma ação.
- Card bloqueado: texto e affordance explícitos, sem link ou ação falsa.
- Progresso: trilha única com valor, contagem e rótulo acessível.
- Estados: `Liberada`, `Bloqueada`, `Em andamento`, `Concluída` e `Revisada` com texto além da cor.
- Conteúdo: composição livre no código, com seções semânticas e navegação interna; o painel não tenta reproduzir um editor de páginas.
- Construtor de formulários: separar identificação, comportamento, campos e anexos; manter a prévia do aluno visível ao lado quando houver espaço.
- Prévia administrativa: usar o mesmo renderer do aluno e manter envio e anexos desativados.

## Motion

Transições de estado entre 150 e 250 ms. Sem coreografia de carregamento na área autenticada. Em movimento reduzido, usar estado final imediato.

## Voice

Português brasileiro natural, curto e operacional. Sem superlativos, jargão de IA ou explicações repetidas.
