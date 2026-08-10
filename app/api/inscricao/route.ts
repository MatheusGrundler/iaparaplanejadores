import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";

/**
 * Recebe a inscrição da landing (pública) e envia por SMTP (Titan/HostGator).
 * Variáveis de ambiente (Vercel): SMTP_USER e SMTP_PASS obrigatórias;
 * SMTP_HOST (padrão smtp.titan.email), SMTP_PORT (padrão 465) e
 * DESTINO_EMAIL opcionais. Backup: toda inscrição válida vai pro log
 * ("INSCRICAO"), mesmo se o e-mail falhar.
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
    JSON.stringify({ nome, email, whatsapp, quando: new Date().toISOString() }),
  );

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.error("SMTP nao configurado: defina SMTP_USER e SMTP_PASS.");
    return noStore(
      NextResponse.json({ ok: false, error: "smtp-nao-configurado" }, { status: 503 }),
    );
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.titan.email",
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const destino = process.env.DESTINO_EMAIL || user;
  const dataBR = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  try {
    await transporter.sendMail({
      from: `"Inscrições · IA para Planejadores" <${user}>`,
      to: destino,
      replyTo: email,
      subject: `Nova inscrição na turma fundadora: ${nome}`,
      text: [
        "Nova inscrição na turma fundadora",
        "",
        `Nome: ${nome}`,
        `E-mail: ${email}`,
        `WhatsApp: ${whatsapp}`,
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
