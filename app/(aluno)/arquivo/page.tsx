import { privilegedDatabase } from "@/lib/supabase/admin";
import { canAccessMemberArea } from "@/lib/auth";
import { BibliotecaMateriais, type MaterialBiblioteca } from "./BibliotecaMateriais";

export const dynamic = "force-dynamic";

export default async function ArquivoPage() {
  if (!(await canAccessMemberArea())) return null;

  const db = privilegedDatabase();
  const [materiaisResult, ativosResult] = await Promise.all([
    db
      .from("downloads")
      .select("id, tag, titulo, desc, ordem, modo")
      .order("ordem", { ascending: true }),
    db.from("arquivos").select("download_id").eq("ativo", true),
  ]);
  const falha = materiaisResult.error ?? ativosResult.error;
  if (falha) {
    console.error("Falha ao carregar a biblioteca de materiais:", falha.code);
    return (
      <main className="pagina-arquivo">
        <h1>Biblioteca de materiais</h1>
        <div className="vazio card" role="alert">
          Não foi possível carregar os materiais agora. Tente novamente em alguns instantes.
        </div>
      </main>
    );
  }

  const materiais = materiaisResult.data;
  const ativos = ativosResult.data;
  return (
    <BibliotecaMateriais
      materiais={(materiais ?? []) as MaterialBiblioteca[]}
      idsComArquivo={(ativos ?? []).map((item) => item.download_id)}
    />
  );
}
