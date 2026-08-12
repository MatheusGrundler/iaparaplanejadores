import type { Metadata } from "next";
import TemplatePatrimonio from "./TemplatePatrimonio";

export const metadata: Metadata = {
  title: "Planejamento patrimonial | Template Patrimônio",
  description: "Planejamento financeiro e patrimonial com contexto, critérios e acompanhamento.",
};

export default function TemplatePatrimonioPage() {
  return <TemplatePatrimonio />;
}
