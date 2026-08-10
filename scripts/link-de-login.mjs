#!/usr/bin/env node
/**
 * Gera um link de login SEM enviar e-mail (útil em dev, quando o e-mail
 * embutido do Supabase estoura o limite por hora).
 *
 * Uso:  node scripts/link-de-login.mjs email@exemplo.com
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e NEXT_PUBLIC_SITE_URL
 * do .env.local. A secret key NUNCA sai da sua máquina; o link impresso é
 * de uso único e expira rápido. O e-mail precisa estar em admins ou whitelist
 * pra sessão servir de algo (os gates do app continuam valendo).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function lerEnvLocal() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const linha of raw.split("\n")) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* sem .env.local: usa só o ambiente */
  }
  return env;
}

const env = lerEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const site = (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = (process.argv[2] || "").trim().toLowerCase();

if (!url || !secret) {
  console.error("Faltou NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/link-de-login.mjs email@exemplo.com");
  process.exit(1);
}

const resposta = await fetch(`${url}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ type: "magiclink", email }),
});

const dados = await resposta.json().catch(() => ({}));
if (!resposta.ok) {
  console.error("Falha ao gerar o link:", dados.msg || dados.message || resposta.status);
  process.exit(1);
}

const hashed = dados.properties?.hashed_token ?? dados.hashed_token;
const tipo = dados.properties?.verification_type ?? "magiclink";
if (!hashed) {
  console.error("Resposta sem token. Resposta bruta:", JSON.stringify(dados).slice(0, 400));
  process.exit(1);
}

console.log("\nAbra este link no navegador (uso único, expira rápido):\n");
console.log(`${site}/auth/confirm?token_hash=${hashed}&type=${tipo}\n`);
