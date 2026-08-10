"use client";

import { useState } from "react";
import { ConstrutorFormulario } from "@/app/componentes/admin/formularios";
import { SEMANA_KEYS, type SemanaKey } from "@/lib/curso-atividades";
import type { DefinicaoFormulario, ProblemaDefinicaoFormulario } from "@/lib/formularios";
import { salvarFormulario } from "./actions";

type Props = {
  inicial: DefinicaoFormulario;
  etapaInicial: SemanaKey;
};

export default function EditorFormularioAdmin({ inicial, etapaInicial }: Props) {
  const [valor, setValor] = useState(inicial);
  const [etapaKey, setEtapaKey] = useState<SemanaKey>(etapaInicial);
  const [problemas, setProblemas] = useState<readonly ProblemaDefinicaoFormulario[]>([]);
  const temErros = problemas.some((item) => item.severidade === "erro");

  return (
    <div className="editor-formulario-admin">
      <form action={salvarFormulario} className="editor-formulario-admin-barra">
        <input type="hidden" name="definicao" value={JSON.stringify(valor)} />
        <div>
          <label htmlFor="formulario-etapa">Página em que o formulário aparece</label>
          <select
            id="formulario-etapa"
            name="etapa_key"
            value={etapaKey}
            onChange={(event) => setEtapaKey(event.target.value as SemanaKey)}
          >
            {SEMANA_KEYS.map((key, indice) => (
              <option value={key} key={key}>
                {indice === 0 ? "Preparação" : `Etapa ${indice}`}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" disabled={temErros}>
          {valor.publicacao === "publicado" ? "Publicar versão" : "Salvar rascunho"}
        </button>
      </form>

      <ConstrutorFormulario valor={valor} onChange={setValor} onValidacaoChange={setProblemas} />
    </div>
  );
}
