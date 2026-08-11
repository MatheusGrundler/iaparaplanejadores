import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";
import { chamadasSupabase, limparChamadasSupabase } from "./fixtures/middleware-supabase.mock";

const supabaseMock = new URL("./fixtures/middleware-supabase.mock.ts", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@supabase/ssr" && context.parentURL?.endsWith("/middleware.ts")) {
      return { url: supabaseMock, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const middlewarePromise = import("../middleware").then((modulo) => modulo.middleware);

const nomesAmbiente = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function comAmbiente(
  valores: Partial<Record<(typeof nomesAmbiente)[number], string>>,
  executar: () => Promise<void>,
) {
  const anteriores = Object.fromEntries(
    nomesAmbiente.map((nome) => [nome, process.env[nome]]),
  ) as Record<(typeof nomesAmbiente)[number], string | undefined>;

  nomesAmbiente.forEach((nome) => delete process.env[nome]);
  Object.entries(valores).forEach(([nome, valor]) => {
    process.env[nome] = valor;
  });

  return executar().finally(() => {
    nomesAmbiente.forEach((nome) => {
      const anterior = anteriores[nome];
      if (anterior === undefined) delete process.env[nome];
      else process.env[nome] = anterior;
    });
  });
}

test("middleware da Vercel depende somente da configuração pública do Supabase", () => {
  const fonte = readFileSync(resolve(process.cwd(), "middleware.ts"), "utf8");

  assert.doesNotMatch(fonte, /@\/lib\/supabase\/env/);
  assert.match(fonte, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(fonte, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(fonte, /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(fonte, /SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
});

test("middleware usa chave publicável, aceita fallback público e falha sem configuração", async () => {
  const middleware = await middlewarePromise;
  limparChamadasSupabase();

  await comAmbiente(
    {
      NEXT_PUBLIC_SUPABASE_URL: " https://projeto.supabase.co/ ",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " chave-publicavel ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " chave-anon-ignorada ",
    },
    async () => {
      const resposta = await middleware(new NextRequest("https://produto.test/login"));
      assert.equal(resposta.status, 200);
      assert.deepEqual(chamadasSupabase.at(-1), {
        url: "https://projeto.supabase.co/",
        chave: "chave-publicavel",
      });
    },
  );

  await comAmbiente(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " chave-anon ",
    },
    async () => {
      await middleware(new NextRequest("https://produto.test/login"));
      assert.deepEqual(chamadasSupabase.at(-1), {
        url: "https://projeto.supabase.co",
        chave: "chave-anon",
      });
    },
  );

  await comAmbiente({}, async () => {
    await assert.rejects(
      middleware(new NextRequest("https://produto.test/login")),
      /Configuração pública do Supabase ausente no middleware/,
    );
  });
});
