"use client";

import type { CampoAnexoFormulario } from "@/lib/formularios/schema";
import a11yStyles from "@/app/componentes/formularios/Acessibilidade.module.css";
import {
  CabecalhoItemFormulario,
  CampoIdentificadorFormulario,
  CampoRotuloFormulario,
  SeletorObrigatorio,
} from "./ControlesItemFormulario";
import styles from "./ConstrutorFormulario.module.css";

const GRUPOS_MIME = [
  {
    chave: "imagens",
    rotulo: "Imagens (JPEG, PNG e WebP)",
    tipos: ["image/jpeg", "image/png", "image/webp"],
  },
  { chave: "json", rotulo: "Arquivo JSON", tipos: ["application/json"] },
] as const;

type Props = {
  campo: CampoAnexoFormulario;
  indice: number;
  prefixo: string;
  somenteLeitura?: boolean;
  primeiro: boolean;
  ultimo: boolean;
  onChange: (campo: CampoAnexoFormulario) => void;
  onRemover: () => void;
  onMover: (direcao: -1 | 1) => void;
};

export function EditorAnexoFormulario({
  campo,
  indice,
  prefixo,
  somenteLeitura = false,
  primeiro,
  ultimo,
  onChange,
  onRemover,
  onMover,
}: Props) {
  const id = `${prefixo}-anexo-${indice + 1}`;

  function alternarTipos(tipos: readonly string[], ativo: boolean) {
    const atuais = new Set(campo.tiposAceitos);
    tipos.forEach((tipo) => (ativo ? atuais.add(tipo) : atuais.delete(tipo)));
    onChange({ ...campo, tiposAceitos: [...atuais] });
  }

  return (
    <fieldset className={styles.itemEditor} disabled={somenteLeitura}>
      <legend className={a11yStyles.srOnly}>
        Anexo {indice + 1}: {campo.rotulo}
      </legend>
      <CabecalhoItemFormulario
        nome="Anexo"
        indice={indice}
        descricao="Upload privado"
        somenteLeitura={somenteLeitura}
        primeiro={primeiro}
        ultimo={ultimo}
        onRemover={onRemover}
        onMover={onMover}
      />

      <div className={styles.gridTres}>
        <CampoIdentificadorFormulario
          id={`${id}-chave`}
          valor={campo.chave}
          prefixo="anexo"
          orientacao="Não altere depois de receber arquivos."
          onChange={(chave) => onChange({ ...campo, chave })}
        />
        <div className={styles.field}>
          <label htmlFor={`${id}-quantidade`}>Quantidade máxima</label>
          <input
            id={`${id}-quantidade`}
            type="number"
            min={1}
            max={10}
            value={campo.maximoArquivos}
            onChange={(event) =>
              onChange({
                ...campo,
                maximoArquivos: Math.min(10, Math.max(1, Number(event.target.value) || 1)),
              })
            }
          />
        </div>
        <CampoRotuloFormulario
          id={`${id}-rotulo`}
          label="Rótulo"
          valor={campo.rotulo}
          onChange={(rotulo) => onChange({ ...campo, rotulo })}
        />
      </div>

      <div className={styles.gridDois}>
        <div className={styles.field}>
          <label htmlFor={`${id}-ajuda`}>Orientação para o aluno</label>
          <textarea
            id={`${id}-ajuda`}
            value={campo.ajuda}
            maxLength={1_000}
            onChange={(event) => onChange({ ...campo, ajuda: event.target.value })}
          />
        </div>
        <div className={styles.gridDoisInterno}>
          <SeletorObrigatorio
            id={`${id}-obrigatorio`}
            obrigatorio={campo.obrigatorio}
            onChange={(obrigatorio) => onChange({ ...campo, obrigatorio })}
          />
          <div className={styles.field}>
            <label htmlFor={`${id}-tamanho`}>Tamanho por arquivo (MB)</label>
            <input
              id={`${id}-tamanho`}
              type="number"
              min={1}
              max={10}
              value={Math.max(1, Math.round(campo.tamanhoMaximoBytes / 1024 / 1024))}
              onChange={(event) =>
                onChange({
                  ...campo,
                  tamanhoMaximoBytes:
                    Math.min(10, Math.max(1, Number(event.target.value) || 1)) * 1024 * 1024,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className={styles.mimeEditor}>
        <span className={styles.groupLabel}>Formatos aceitos</span>
        <div className={styles.checkboxList}>
          {GRUPOS_MIME.map((grupo) => {
            const ativo = grupo.tipos.every((tipo) => campo.tiposAceitos.includes(tipo));
            return (
              <label key={grupo.chave}>
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(event) => alternarTipos(grupo.tipos, event.target.checked)}
                />
                <span>{grupo.rotulo}</span>
              </label>
            );
          })}
        </div>
        {campo.tiposAceitos.length === 0 && (
          <p className={styles.inlineError}>Escolha ao menos um formato.</p>
        )}
      </div>
    </fieldset>
  );
}

export default EditorAnexoFormulario;
