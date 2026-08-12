import type { Metadata } from "next";
import TemplateRota from "./TemplateRota";

export const metadata: Metadata = {
  title: "Planejamento em movimento | Template Rota",
  description: "Organize o agora, escolha o próximo passo e acompanhe um plano revisável.",
};

export default function TemplateRotaPage() {
  return <TemplateRota />;
}
