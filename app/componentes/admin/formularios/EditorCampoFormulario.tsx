"use client";

import {
  TIPOS_CAMPO_FORMULARIO,
  type CampoFormulario,
  type OpcaoFormulario,
  type TipoCampoFormulario,
} from "@/lib/formularios/schema";
import { chaveFormulario, trocarTipoCampo } from "@/lib/formularios/fabricas";
import a11yStyles from "@/app/componentes/formularios/Acessibilidade.module.css";
import {
  CabecalhoItemFormulario,
  CampoIdentificadorFormulario,
  CampoRotuloFormulario,
  SeletorObrigatorio,
} from "./ControlesItemFormulario";
import styles from "./ConstrutorFormulario.module.css";

const ROTULOS_TIPO: Record<TipoCampoFormulario, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  email: "E-mail",
  url: "Link",
  select: "Lista de opções",
};

type Props = {
  campo: CampoFormulario;
  indice: number;
  prefixo: string;
  somenteLeitura?: boolean;
  primeiro: boolean;
  ultimo: boolean;
  onChange: (campo: CampoFormulario) => void;
  onRemover: () => void;
  onMover: (direcao: -1 | 1) => void;
};

function atualizarOpcao(
  opcoes: readonly OpcaoFormulario[],
  indice: number,
  patch: Partial<OpcaoFormulario>,
) {
  return opcoes.map((opcao, atual) => (atual === indice ? { ...opcao, ...patch } : opcao));
}

export function EditorCampoFormulario({
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
  const id = `${prefixo}-campo-${indice + 1}`;
  return (
    <fieldset className={styles.itemEditor} disabled={somenteLeitura}>
      <legend className={a11yStyles.srOnly}>
        Campo {indice + 1}: {campo.rotulo}
      </legend>
      <CabecalhoItemFormulario
        nome="Campo"
        indice={indice}
        descricao={ROTULOS_TIPO[campo.tipo]}
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
          prefixo="campo"
          orientacao="Não altere depois de receber respostas."
          onChange={(chave) => onChange({ ...campo, chave })}
        />
        <div className={styles.field}>
          <label htmlFor={`${id}-tipo`}>Tipo</label>
          <select
            id={`${id}-tipo`}
            value={campo.tipo}
            onChange={(event) =>
              onChange(trocarTipoCampo(campo, event.target.value as TipoCampoFormulario))
            }
          >
            {TIPOS_CAMPO_FORMULARIO.map((tipo) => (
              <option value={tipo} key={tipo}>
                {ROTULOS_TIPO[tipo]}
              </option>
            ))}
          </select>
        </div>
        <CampoRotuloFormulario
          id={`${id}-rotulo`}
          label="Pergunta ou rótulo"
          valor={campo.rotulo}
          onChange={(rotulo) => onChange({ ...campo, rotulo })}
        />
      </div>

      <div className={styles.gridDois}>
        <div className={styles.field}>
          <label htmlFor={`${id}-ajuda`}>Texto de ajuda</label>
          <input
            id={`${id}-ajuda`}
            value={campo.ajuda ?? ""}
            maxLength={1_000}
            placeholder="Orientação curta mostrada abaixo do campo"
            onChange={(event) => onChange({ ...campo, ajuda: event.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-placeholder`}>Exemplo dentro do campo</label>
          <input
            id={`${id}-placeholder`}
            value={campo.placeholder ?? ""}
            maxLength={500}
            placeholder="Ex.: descreva o resultado esperado"
            onChange={(event) => onChange({ ...campo, placeholder: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.gridTresIgual}>
        <SeletorObrigatorio
          id={`${id}-obrigatorio`}
          obrigatorio={campo.obrigatorio}
          onChange={(obrigatorio) => onChange({ ...campo, obrigatorio })}
        />
        <div className={styles.field}>
          <label htmlFor={`${id}-minimo`}>Mínimo de caracteres</label>
          <input
            id={`${id}-minimo`}
            type="number"
            min={0}
            max={20_000}
            value={campo.minimoCaracteres ?? 0}
            onChange={(event) =>
              onChange({
                ...campo,
                minimoCaracteres: Math.max(0, Number(event.target.value) || 0),
              })
            }
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-maximo`}>Máximo de caracteres</label>
          <input
            id={`${id}-maximo`}
            type="number"
            min={1}
            max={20_000}
            value={campo.maximoCaracteres}
            onChange={(event) =>
              onChange({
                ...campo,
                maximoCaracteres: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </div>
      </div>

      {campo.tipo === "select" && (
        <div className={styles.optionsEditor}>
          <div className={styles.subsectionHeader}>
            <div>
              <strong>Opções da lista</strong>
              <span>O identificador fica salvo na resposta; o rótulo aparece para o aluno.</span>
            </div>
            {!somenteLeitura && (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() =>
                  onChange({
                    ...campo,
                    opcoes: [
                      ...campo.opcoes,
                      {
                        valor: `opcao-${campo.opcoes.length + 1}`,
                        rotulo: `Opção ${campo.opcoes.length + 1}`,
                      },
                    ],
                  })
                }
              >
                Adicionar opção
              </button>
            )}
          </div>
          <div className={styles.optionList}>
            {campo.opcoes.map((opcao, opcaoIndice) => (
              <div className={styles.optionRow} key={`opcao-${opcaoIndice}`}>
                <div className={styles.field}>
                  <label htmlFor={`${id}-opcao-${opcaoIndice}-valor`}>Identificador</label>
                  <input
                    id={`${id}-opcao-${opcaoIndice}-valor`}
                    value={opcao.valor}
                    onChange={(event) =>
                      onChange({
                        ...campo,
                        opcoes: atualizarOpcao(campo.opcoes, opcaoIndice, {
                          valor: chaveFormulario(event.target.value, "opcao"),
                        }),
                      })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`${id}-opcao-${opcaoIndice}-rotulo`}>Rótulo</label>
                  <input
                    id={`${id}-opcao-${opcaoIndice}-rotulo`}
                    value={opcao.rotulo}
                    maxLength={120}
                    onChange={(event) =>
                      onChange({
                        ...campo,
                        opcoes: atualizarOpcao(campo.opcoes, opcaoIndice, {
                          rotulo: event.target.value,
                        }),
                      })
                    }
                  />
                </div>
                {!somenteLeitura && (
                  <button
                    className={styles.dangerButton}
                    type="button"
                    disabled={campo.opcoes.length === 1}
                    aria-label={`Remover opção ${opcaoIndice + 1}`}
                    onClick={() =>
                      onChange({
                        ...campo,
                        opcoes: campo.opcoes.filter((_, atual) => atual !== opcaoIndice),
                      })
                    }
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}

export default EditorCampoFormulario;
