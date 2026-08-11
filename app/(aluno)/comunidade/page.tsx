import { redirect } from "next/navigation";

/** O Feed está temporariamente indisponível; a trilha segue como página inicial do aluno. */
export default function ComunidadePage() {
  redirect("/");
}
