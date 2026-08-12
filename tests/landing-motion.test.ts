import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nextConfig from "../next.config";

const landing = readFileSync(
  new URL("../public/landing.html", import.meta.url),
  "utf8",
);

test("a CSP permite os scripts de movimento usados pela landing", async () => {
  const headers = nextConfig.headers;
  assert.equal(typeof headers, "function");
  if (!headers) assert.fail("next.config precisa declarar headers");

  const rules = await headers();
  const globalRule = rules.find((rule) => rule.source === "/(.*)");
  const csp = globalRule?.headers.find(
    (header) => header.key === "Content-Security-Policy",
  )?.value;

  assert.match(csp ?? "", /script-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
});

test("GSAP e ScrollTrigger têm versão fixa e integridade verificável", () => {
  const scripts = landing.match(
    /<script\b[^>]*\bsrc="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/3\.12\.5\/(?:gsap|ScrollTrigger)\.min\.js"[^>]*><\/script>/g,
  );

  assert.equal(scripts?.length, 2);
  for (const script of scripts ?? []) {
    assert.match(script, /integrity="sha384-[A-Za-z0-9+/=]+"/);
    assert.match(script, /crossorigin="anonymous"/);
    assert.match(script, /referrerpolicy="no-referrer"/);
  }

  assert.match(
    landing,
    /const\s+MOTION_READY\s*=\s*Boolean\(\s*window\.gsap\s*&&\s*window\.ScrollTrigger\s*\);/,
  );
});

test("cenas retomam ao restaurar o scroll e permanecem visíveis sem GSAP", () => {
  assert.match(landing, /addEventListener\(\s*"pageshow"/);
  assert.match(landing, /cenasCriadas\.forEach\(\(\{ id, tl \}\)/);
  assert.match(
    landing,
    /if \(r\.top < innerHeight && r\.bottom > 0\) tl\.timeScale\(1\)\.play\(\)/,
  );
  assert.match(landing, /el\.style\.strokeDasharray = "none"/);
  assert.match(landing, /document\.querySelectorAll\("\.passo \.pcap"\)/);
});

test("no celular, cenas ficam estáveis e não capturam o scroll", () => {
  assert.match(landing, /const\s+MOBILE\s*=\s*matchMedia\("\(max-width: 860px\)"\)\.matches;/);
  assert.match(
    landing,
    /const\s+MOTION_ENABLED\s*=\s*MOTION_READY\s*&&\s*!REDUCED\s*&&\s*!MOBILE;/,
  );
  assert.match(landing, /html\s*\{\s*scroll-snap-type:\s*none;/);
  assert.match(landing, /min-height:\s*100svh;/);
  assert.match(landing, /scroll-snap-align:\s*none;/);
});

test("a conversa reserva 330 px para as mensagens desde o início", () => {
  assert.match(landing, /\.mini-chat\s*\{\s*height:\s*330px;/);
  assert.match(landing, /#chatBox\s*\{\s*height:\s*100%;/);
  assert.match(landing, /#chatBox\s*\{[\s\S]*?overflow:\s*hidden;/);
  assert.doesNotMatch(landing, /#chatBox\s*\{\s*min-height:/);
});

test("mentoria é explicada antes do formulário e pode ser pré-selecionada", () => {
  const mentoria = landing.indexOf('id="mentoria"');
  const formulario = landing.indexOf('id="formVaga"');
  const ofertaPublica = landing.slice(mentoria, landing.indexOf("<!-- FAQ -->"));

  assert.ok(mentoria >= 0 && formulario > mentoria);
  assert.match(landing, /Mentoria de Implementação/);
  assert.match(landing, /\+ R\$ 3\.000/);
  assert.match(landing, /Marcar interesse não fecha a contratação/);
  assert.match(landing, /Quer que eu faça a implementação com você/);
  assert.match(landing, /Eu construo as automações combinadas com você/);
  assert.match(landing, /Viabilidade e custos externos/);
  assert.match(landing, /não estão incluídos nos R\$ 3\.000/);
  assert.doesNotMatch(ofertaPublica, /SMTP|Z-API|Google Analytics/);
  assert.match(landing, /data-select-mentoria/);
  assert.match(landing, /mentoria\.checked = true/);
});

test("landing apresenta as lives somente como encontros de tira-dúvidas", () => {
  assert.match(
    landing,
    /Na live, mostra o que fez, tira dúvidas\s+e recebe orientação/,
  );
  assert.doesNotMatch(
    landing,
    /construir junto, ao vivo|Encontros ao vivo, construindo|Ao vivo, com as próprias mãos|live para dúvidas e implementação/i,
  );
});

test("hero vende IA aplicada à automação e diferencia o papel das ferramentas", () => {
  const hero = landing.slice(
    landing.indexOf('<header class="hero"'),
    landing.indexOf("<!-- RITMO"),
  );

  for (const ferramenta of [
    "Claude Code",
    "Codex",
    "ChatGPT",
    "OpenClaw",
    "n8n",
  ]) {
    assert.match(hero, new RegExp(ferramenta));
  }

  assert.match(hero, /Pare de só conversar com a IA/);
  assert.match(hero, /Aprenda a colocá-la para trabalhar na sua operação/);
  assert.match(hero, /Diferenças:<\/b> ChatGPT, Claude Code e Codex/);
  assert.match(hero, /OpenClaw:<\/b> projeto prático/);
  assert.match(hero, /n8n:<\/b> automações/);
  assert.doesNotMatch(hero, /Aprenda, de uma vez por todas, a usar/);
  assert.match(hero, /pouquíssimas vagas/i);
  assert.doesNotMatch(
    landing,
    /5 vagas|5 pessoas|cinco pessoas|apenas 5 vagas/i,
  );
});

test("seção de perfil destaca criatividade e disposição para experimentar", () => {
  assert.match(landing, /<li><strong>Ser criativo<\/strong><\/li>/);
  assert.match(landing, /<li><strong>Não ter medo de tentar<\/strong><\/li>/);
});

test("abertura das cenas explica o benefício sem frases artificiais", () => {
  assert.match(landing, /O repetitivo sai da sua frente\. Você continua no comando\./);
  assert.match(
    landing,
    /O agente prepara rascunhos, organiza a agenda e executa os fluxos que você aprovou/,
  );
  assert.doesNotMatch(
    landing,
    /Role devagar|o scroll te leva de mão em mão|do sufoco de hoje ao tempo que volta/,
  );
});

test("cronograma explica as etapas sem exigir vocabulário técnico", () => {
  const cronograma = landing.slice(
    landing.indexOf('<section class="section" id="semanas"'),
    landing.indexOf("<!-- SEGURANCA -->"),
  );

  assert.match(cronograma, /Você começa pelo básico e termina com uma automação funcionando/);
  assert.match(cronograma, /Seu primeiro agente funcionando/);
  assert.match(cronograma, /Tarefas feitas na hora certa/);
  assert.match(cronograma, /Ferramentas trabalhando juntas/);
  assert.doesNotMatch(
    cronograma,
    /Codex|VPS|OpenRouter|GitHub|harness|MCP|LLMs|crons|skills|agêntico/i,
  );
});

test("seção de segurança orienta sem acusação ou promessa legal", () => {
  const seguranca = landing.slice(
    landing.indexOf('<section class="section" id="seguranca"'),
    landing.indexOf("<!-- MENTORIA DE IMPLEMENTAÇÃO -->"),
  );

  assert.match(seguranca, /Vamos trabalhar para deixar sua operação o mais segura possível/);
  assert.match(seguranca, /Ações importantes continuam passando pela sua revisão/);
  assert.doesNotMatch(seguranca, /enganando|segurança total|100%|LGPD/i);
});
