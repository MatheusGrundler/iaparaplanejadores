import type { Metadata } from "next";
import TemplateClareza from "./TemplateClareza";

export const metadata: Metadata = {
  title: "Planejamento financeiro com clareza | Template Clareza",
  description: "Um caminho possível para organizar prioridades e acompanhar decisões importantes.",
};

export default function TemplateClarezaPage() {
  return <TemplateClareza />;
}
