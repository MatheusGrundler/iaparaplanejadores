import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserEmail, memberStatus, isAdmin } from "@/lib/auth";

export default async function AlunoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const email = await getUserEmail();
  if (!email) redirect("/login");

  const [status, admin] = await Promise.all([
    memberStatus(email),
    isAdmin(email),
  ]);

  // admin sempre enxerga a área do aluno; aluno barrado vê a tela de acesso
  if (!admin && status !== "ok") {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="brand" style={{ marginBottom: 24 }}>
            <span className="spark">✦</span> IA para Planejadores
          </div>
          {status === "expirado" ? (
            <>
              <h1 style={{ fontSize: "1.25rem" }}>Seu acesso encerrou</h1>
              <p className="sub">
                O período de acesso deste e-mail chegou ao fim. Se quiser
                renovar ou achar que é um engano, fala comigo:{" "}
                <a href="mailto:contato@iaparaplanejadores.com.br">
                  contato@iaparaplanejadores.com.br
                </a>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "1.25rem" }}>E-mail sem acesso</h1>
              <p className="sub">
                Este e-mail não está na lista de alunos. Se você se inscreveu
                com outro e-mail, entre com ele. Qualquer dúvida:{" "}
                <a href="mailto:contato@iaparaplanejadores.com.br">
                  contato@iaparaplanejadores.com.br
                </a>
              </p>
            </>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn btn-fantasma" style={{ width: "100%" }}>
              Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="spark">✦</span> IA para Planejadores
        </div>
        <nav className="nav">
          <Link href="/">Conteúdos</Link>
          <Link href="/comunidade">Comunidade</Link>
          {admin && <Link href="/admin">Admin</Link>}
          <form action="/auth/signout" method="post" style={{ display: "inline" }}>
            <button className="btn btn-fantasma btn-mini">Sair</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
