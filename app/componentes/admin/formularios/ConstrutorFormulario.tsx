"use client";

import { useEffect, useMemo } from "react";
import Formulario from "@/app/componentes/formularios/Formulario";
import {
  novoAnexoFormulario,
  novoCampoFormulario,
  chaveFormulario,
} from "@/lib/formularios/fabricas";
import { workflowDuvida, workflowQuest, type DefinicaoFormulario } from "@/lib/formularios/schema";
import {
  validarDefinicaoFormulario,
  type ProblemaDefinicaoFormulario,
} from "@/lib/formularios/validacao";
import EditorAnexoFormulario from "./EditorAnexoFormulario";
import EditorCampoFormulario from "./EditorCampoFormulario";
import styles from "./ConstrutorFormulario.module.css";

export type ConstrutorFormularioProps = {
  valor: DefinicaoFormulario;
  onChange: (valor: DefinicaoFormulario) => void;
  somenteLeitura?: boolean;
  mostrarPrevia?: boolean;
  onValidacaoChange?: (problemas: readonly ProblemaDefinicaoFormulario[]) => void;
};

function mover<T>(itens: readonly T[], indice: number, direcao: -1 | 1): T[] {
  const destino = indice + direcao;
  if (destino < 0 || destino >= itens.length) return [...itens];
  const proximos = [...itens];
  [proximos[indice], proximos[destino]] = [proximos[destino], proximos[indice]];
  return proximos;
}

function resumoProblema(problema: ProblemaDefinicaoFormulario) {
  const parte = problema.caminho
    .replace(/^campos\[(\d+)\]/, (_, numero) => `Campo ${Number(numero) + 1}`)
    .replace(/^anexos\[(\d+)\]/, (_, numero) => `Anexo ${Number(numero) + 1}`)
    .replace(/\.([a-zA-Z]+)/g, " · $1");
  return `${parte}: ${problema.mensagem}`;
}

/** Editor administrativo reutilizável e independente da página de conteúdo. */
export function ConstrutorFormulario({
  valor,
  onChange,
  somenteLeitura = false,
  mostrarPrevia = true,
  onValidacaoChange,
}: ConstrutorFormularioProps) {
  const resultado = useMemo(() => validarDefinicaoFormulario(valor), [valor]);
  const problemas = resultado.problemas;
  const erros = problemas.filter((item) => item.severidade === "erro");
  const prefixo = `construtor-${valor.codigo || "formulario"}`;

  useEffect(() => {
    onValidacaoChange?.(problemas);
  }, [onValidacaoChange, problemas]);

  function mudarWorkflow(tipo: "quest" | "duvida") {
    onChange({
      ...valor,
      workflow: tipo === "quest" ? workflowQuest() : workflowDuvida(),
      rotuloEnvio:
        valor.rotuloEnvio === "Enviar Quest" || valor.rotuloEnvio === "Enviar dúvida"
          ? tipo === "quest"
            ? "Enviar Quest"
            : "Enviar dúvida"
          : valor.rotuloEnvio,
    });
  }

  return (
    <div className={styles.construtor}>
      <div className={styles.editor}>
        <header className={styles.editorHeader}>
          <div>
            <h2>Construtor de formulário</h2>
            <p>
              Defina o comportamento, os campos e os anexos. O conteúdo continua livre no código.
            </p>
          </div>
          <span className={erros.length ? styles.validationInvalid : styles.validationValid}>
            {erros.length ? `${erros.length} ajuste(s) pendente(s)` : "Pronto para publicar"}
          </span>
        </header>

        {erros.length > 0 && (
          <div className={styles.validationSummary} aria-live="polite">
            <strong>Revise antes de publicar</strong>
            <ul>
              {erros.slice(0, 6).map((item, indice) => (
                <li key={`${item.caminho}-${item.codigo}-${indice}`}>{resumoProblema(item)}</li>
              ))}
            </ul>
            {erros.length > 6 && <p>Há mais {erros.length - 6} ajuste(s) nos campos abaixo.</p>}
          </div>
        )}

        <section className={styles.editorSection} aria-labelledby={`${prefixo}-identificacao`}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 id={`${prefixo}-identificacao`}>Identificação</h3>
              <p>O código entra na página de conteúdo e não muda depois da primeira resposta.</p>
            </div>
          </div>
          <div className={styles.gridTres}>
            <div className={styles.field}>
              <label htmlFor={`${prefixo}-codigo`}>Código do formulário</label>
              <input
                id={`${prefixo}-codigo`}
                value={valor.codigo}
                disabled={somenteLeitura}
                onChange={(event) =>
                  onChange({
                    ...valor,
                    codigo: chaveFormulario(event.target.value),
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${prefixo}-versao`}>Versão</label>
              <input
                id={`${prefixo}-versao`}
                type="number"
                min={1}
                value={valor.versao}
                disabled={somenteLeitura}
                onChange={(event) =>
                  onChange({
                    ...valor,
                    versao: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
              <span>Crie outra versão para mudar um formulário publicado.</span>
            </div>
            <div className={styles.field}>
              <label htmlFor={`${prefixo}-publicacao`}>Estado</label>
              <select
                id={`${prefixo}-publicacao`}
                value={valor.publicacao}
                disabled={somenteLeitura}
                onChange={(event) =>
                  onChange({
                    ...valor,
                    publicacao: event.target.value as DefinicaoFormulario["publicacao"],
                  })
                }
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${prefixo}-titulo`}>Título</label>
            <input
              id={`${prefixo}-titulo`}
              value={valor.titulo}
              maxLength={180}
              disabled={somenteLeitura}
              onChange={(event) => onChange({ ...valor, titulo: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${prefixo}-descricao`}>Orientação para o aluno</label>
            <textarea
              id={`${prefixo}-descricao`}
              value={valor.descricao}
              maxLength={2_000}
              disabled={somenteLeitura}
              onChange={(event) => onChange({ ...valor, descricao: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${prefixo}-botao`}>Texto do botão de envio</label>
            <input
              id={`${prefixo}-botao`}
              value={valor.rotuloEnvio}
              maxLength={100}
              disabled={somenteLeitura}
              onChange={(event) => onChange({ ...valor, rotuloEnvio: event.target.value })}
            />
          </div>
        </section>

        <section className={styles.editorSection} aria-labelledby={`${prefixo}-comportamento`}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 id={`${prefixo}-comportamento`}>Comportamento</h3>
              <p>Quest e Dúvida usam o mesmo renderer, mas têm ciclos de vida diferentes.</p>
            </div>
          </div>
          <div className={styles.workflowChoices}>
            <label
              className={valor.workflow.tipo === "quest" ? styles.workflowSelected : undefined}
            >
              <input
                type="radio"
                name={`${prefixo}-workflow`}
                value="quest"
                checked={valor.workflow.tipo === "quest"}
                disabled={somenteLeitura}
                onChange={() => mudarWorkflow("quest")}
              />
              <span>
                <strong>Quest</strong>
                <small>Um rascunho por aluno, autosave, envio e bloqueio após revisão.</small>
              </span>
            </label>
            <label
              className={valor.workflow.tipo === "duvida" ? styles.workflowSelected : undefined}
            >
              <input
                type="radio"
                name={`${prefixo}-workflow`}
                value="duvida"
                checked={valor.workflow.tipo === "duvida"}
                disabled={somenteLeitura}
                onChange={() => mudarWorkflow("duvida")}
              />
              <span>
                <strong>Dúvida</strong>
                <small>Vários envios por aluno, histórico e resposta da equipe.</small>
              </span>
            </label>
          </div>
          {valor.workflow.tipo === "quest" && (
            <div className={styles.fieldCompact}>
              <label htmlFor={`${prefixo}-autosave`}>Intervalo do autosave</label>
              <select
                id={`${prefixo}-autosave`}
                value={valor.workflow.rascunho.esperaMs}
                disabled={somenteLeitura}
                onChange={(event) =>
                  onChange({
                    ...valor,
                    workflow: workflowQuest(Number(event.target.value)),
                  })
                }
              >
                <option value={600}>0,6 segundo</option>
                <option value={900}>0,9 segundo</option>
                <option value={1500}>1,5 segundo</option>
                <option value={2500}>2,5 segundos</option>
              </select>
            </div>
          )}
        </section>

        <section className={styles.editorSection} aria-labelledby={`${prefixo}-campos`}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 id={`${prefixo}-campos`}>Campos de resposta</h3>
              <p>A ordem abaixo é a mesma que o aluno verá.</p>
            </div>
            {!somenteLeitura && (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() =>
                  onChange({
                    ...valor,
                    campos: [...valor.campos, novoCampoFormulario(valor.campos.length)],
                  })
                }
              >
                Adicionar campo
              </button>
            )}
          </div>
          <div className={styles.itemList}>
            {valor.campos.map((campo, indice) => (
              <EditorCampoFormulario
                key={`campo-${indice}`}
                campo={campo}
                indice={indice}
                prefixo={prefixo}
                somenteLeitura={somenteLeitura}
                primeiro={indice === 0}
                ultimo={indice === valor.campos.length - 1}
                onChange={(proximo) =>
                  onChange({
                    ...valor,
                    campos: valor.campos.map((item, atual) => (atual === indice ? proximo : item)),
                  })
                }
                onRemover={() =>
                  onChange({
                    ...valor,
                    campos: valor.campos.filter((_, atual) => atual !== indice),
                  })
                }
                onMover={(direcao) =>
                  onChange({
                    ...valor,
                    campos: mover(valor.campos, indice, direcao),
                  })
                }
              />
            ))}
          </div>
          {!valor.campos.length && (
            <p className={styles.emptyState}>Adicione ao menos um campo para publicar.</p>
          )}
        </section>

        <section className={styles.editorSection} aria-labelledby={`${prefixo}-anexos`}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 id={`${prefixo}-anexos`}>Anexos</h3>
              <p>Opcional. Cada campo define formatos, quantidade e tamanho máximo.</p>
            </div>
            {!somenteLeitura && (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() =>
                  onChange({
                    ...valor,
                    anexos: [...valor.anexos, novoAnexoFormulario(valor.anexos.length)],
                  })
                }
              >
                Adicionar anexo
              </button>
            )}
          </div>
          <div className={styles.itemList}>
            {valor.anexos.map((campo, indice) => (
              <EditorAnexoFormulario
                key={`anexo-${indice}`}
                campo={campo}
                indice={indice}
                prefixo={prefixo}
                somenteLeitura={somenteLeitura}
                primeiro={indice === 0}
                ultimo={indice === valor.anexos.length - 1}
                onChange={(proximo) =>
                  onChange({
                    ...valor,
                    anexos: valor.anexos.map((item, atual) => (atual === indice ? proximo : item)),
                  })
                }
                onRemover={() =>
                  onChange({
                    ...valor,
                    anexos: valor.anexos.filter((_, atual) => atual !== indice),
                  })
                }
                onMover={(direcao) =>
                  onChange({
                    ...valor,
                    anexos: mover(valor.anexos, indice, direcao),
                  })
                }
              />
            ))}
          </div>
          {!valor.anexos.length && (
            <p className={styles.emptyState}>
              Sem anexos. Você pode publicar assim ou adicionar um campo de upload.
            </p>
          )}
        </section>
      </div>

      {mostrarPrevia && (
        <aside className={styles.preview} aria-labelledby={`${prefixo}-previa`}>
          <div className={styles.previewHeader}>
            <div>
              <h2 id={`${prefixo}-previa`}>Prévia do aluno</h2>
              <p>Usa exatamente o mesmo renderer da página publicada.</p>
            </div>
            <span>Somente leitura</span>
          </div>
          <Formulario
            codigo={valor.codigo}
            definicao={valor}
            somenteLeitura
            mostrarHistorico={false}
          />
          <div className={styles.embedCode}>
            <span>Na página de conteúdo</span>
            <code>{`<Formulario codigo="${valor.codigo}" />`}</code>
          </div>
        </aside>
      )}
    </div>
  );
}

export default ConstrutorFormulario;
