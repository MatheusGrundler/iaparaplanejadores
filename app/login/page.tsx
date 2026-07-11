"use client";

import { useActionState } from "react";
import { enviarLinkMagico, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    enviarLinkMagico,
    null
  );

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="spark">✦</span> IA para Planejadores
        </div>
        <h1 style={{ fontSize: "1.25rem" }}>Área de membros</h1>
        <p className="sub" style={{ marginBottom: 24 }}>
          Sem senha: você recebe um link de acesso no e-mail liberado na sua
          inscrição.
        </p>

        <form action={action}>
          <div className="campo">
            <label htmlFor="email">Seu e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="voce@exemplo.com"
              required
              autoComplete="email"
            />
          </div>
          <button className="btn" style={{ width: "100%" }} disabled={pending}>
            {pending ? "Enviando…" : "Receber link de acesso"}
          </button>
        </form>

        {state && (
          <p className={`aviso${state.ok ? "" : " erro"}`} style={{ marginTop: 16 }}>
            {state.msg}
          </p>
        )}
      </div>
    </div>
  );
}
