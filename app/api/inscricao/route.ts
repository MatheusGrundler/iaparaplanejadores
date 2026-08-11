import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";

/**
 * Recebe o interesse vindo da landing e envia por SMTP.
 * Funciona com o Email Sandbox do Mailtrap (testes) e com qualquer provedor SMTP.
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM devem ser configuradas;
 * DESTINO_EMAIL define quem recebe os novos interesses.
 */

function limpa(v: unknown, max: number) {
  return String(v ?? "")
    .replace(/[\r\n<>]/g, " ")
    .trim()
    .slice(0, max);
}

function noStore<T extends NextResponse>(r: T): T {
  r.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return r;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return noStore(NextResponse.json({ ok: false, error: "corpo" }, { status: 400 }));
  }

  const nome = limpa(body.nome, 120);
  const email = limpa(body.email, 160);
  const whatsapp = limpa(body.whatsapp, 20);
  const querMentoria = body.querMentoria === true;
  const honeypot = String(body.empresa ?? "").trim();
  const segundos = Number(body.segundos) || 0;

  // Honeypot preenchido ou envio rápido demais = robô. Responde ok sem agir.
  if (honeypot || (segundos > 0 && segundos < 3)) {
    return noStore(NextResponse.json({ ok: true }));
  }

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const zapOk = whatsapp.replace(/\D/g, "").length >= 10;
  if (nome.length < 2 || !emailOk || !zapOk) {
    return noStore(NextResponse.json({ ok: false, error: "validacao" }, { status: 400 }));
  }

  console.log(
    "INSCRICAO",
    JSON.stringify({ nome, email, whatsapp, querMentoria, quando: new Date().toISOString() }),
  );

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!user || !pass || !from) {
    console.error("SMTP nao configurado: defina SMTP_USER, SMTP_PASS e SMTP_FROM.");
    return noStore(
      NextResponse.json({ ok: false, error: "smtp-nao-configurado" }, { status: 503 }),
    );
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const destino = process.env.DESTINO_EMAIL || from;
  const dataBR = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  try {
    await transporter.sendMail({
      from: `"IA para Planejadores" <${from}>`,
      to: destino,
      replyTo: email,
      subject: `${querMentoria ? "Mentoria + imersão" : "Imersão"}: novo interesse de ${nome}`,
      text: [
        "Novo interesse na IA para Planejadores",
        "",
        `Nome: ${nome}`,
        `E-mail: ${email}`,
        `WhatsApp: ${whatsapp}`,
        `Interesse: ${querMentoria ? "Imersão + Mentoria de Implementação (R$ 4.497)" : "Imersão (R$ 1.497)"}`,
        `Quando: ${dataBR} (horário de Brasília)`,
        "",
        "Combinado da landing: retorno em até 1 dia útil.",
      ].join("\n"),
    });
    return noStore(NextResponse.json({ ok: true }));
  } catch (e) {
    console.error("SMTP_ERRO", e instanceof Error ? e.message : e);
    return noStore(NextResponse.json({ ok: false, error: "smtp-envio" }, { status: 502 }));
  }
}
