import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { siteUrl, supabasePublicKey, supabaseSecretKey, supabaseUrl } from "../lib/supabase/env";

const NOMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

test("configuração do Supabase usa acessos estáticos compatíveis com o middleware Edge", () => {
  const fonte = readFileSync(resolve(process.cwd(), "lib/supabase/env.ts"), "utf8");
  assert.doesNotMatch(fonte, /process\.env\s*\[/);
  for (const nome of NOMES) {
    assert.match(fonte, new RegExp(`process\\.env\\.${nome}`));
  }
});

test("configuração preserva validação, normalização e fallback das chaves", () => {
  const anteriores = Object.fromEntries(NOMES.map((nome) => [nome, process.env[nome]]));

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://projeto.supabase.co/ ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " publishable ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = " anon ";
    process.env.SUPABASE_SECRET_KEY = " secret ";
    process.env.SUPABASE_SERVICE_ROLE_KEY = " service-role ";
    process.env.NEXT_PUBLIC_SITE_URL = " https://app.exemplo.com/ ";

    assert.equal(supabaseUrl(), "https://projeto.supabase.co");
    assert.equal(supabasePublicKey(), "publishable");
    assert.equal(supabaseSecretKey(), "secret");
    assert.equal(siteUrl(), "https://app.exemplo.com");

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " ";
    process.env.SUPABASE_SECRET_KEY = " ";
    assert.equal(supabasePublicKey(), "anon");
    assert.equal(supabaseSecretKey(), "service-role");

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.throws(() => supabaseUrl(), /NEXT_PUBLIC_SUPABASE_URL/);
    assert.throws(
      () => supabasePublicKey(),
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.*NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  } finally {
    for (const nome of NOMES) {
      const anterior = anteriores[nome];
      if (anterior === undefined) delete process.env[nome];
      else process.env[nome] = anterior;
    }
  }
});
