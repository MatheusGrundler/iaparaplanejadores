import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUserEmail, isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const email = await getUserEmail();
  if (!email) redirect("/login");
  if (!(await isAdmin(email))) notFound();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="spark">✦</span> Admin · IA para Planejadores
        </div>
        <nav className="nav">
          <Link href="/admin">Visão geral</Link>
          <Link href="/admin/alunos">Alunos</Link>
          <Link href="/admin/turmas">Turmas</Link>
          <Link href="/admin/semanas">Etapas</Link>
          <Link href="/admin/formularios">Formulários</Link>
          <Link href="/admin/materiais">Materiais</Link>
          <Link href="/admin/leituras">Leituras</Link>
          <Link href="/admin/entregas">Entregas</Link>
          <Link href="/">← área do aluno</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
