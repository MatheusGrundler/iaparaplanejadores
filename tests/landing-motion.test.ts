import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nextConfig from "../next.config";

const landing = readFileSync(new URL("../public/landing.html", import.meta.url), "utf8");

test("a CSP permite os scripts de movimento usados pela landing", async () => {
  const headers = nextConfig.headers;
  assert.equal(typeof headers, "function");
  if (!headers) assert.fail("next.config precisa declarar headers");

  const rules = await headers();
  const globalRule = rules.find((rule) => rule.source === "/(.*)");
  const csp = globalRule?.headers.find((header) => header.key === "Content-Security-Policy")?.value;

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

test("landing apresenta as lives somente como encontros de tira-dúvidas", () => {
  assert.match(landing, /Não há conteúdo novo na live/);
  assert.match(landing, /tirar dúvidas, mostrar as tentativas e\s+receber orientação/);
  assert.doesNotMatch(
    landing,
    /construir junto, ao vivo|Encontros ao vivo, construindo|Ao vivo, com as próprias mãos|live para dúvidas e implementação/i,
  );
});
