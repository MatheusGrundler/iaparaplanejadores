"use client";

import { chaveFormulario } from "@/lib/formularios/fabricas";
import styles from "./ConstrutorFormulario.module.css";

type CabecalhoItemProps = {
  nome: "Campo" | "Anexo";
  indice: number;
  descricao: string;
  somenteLeitura: boolean;
  primeiro: boolean;
  ultimo: boolean;
  onRemover: () => void;
  onMover: (direcao: -1 | 1) => void;
};

export function CabecalhoItemFormulario({
  nome,
  indice,
  descricao,
  somenteLeitura,
  primeiro,
  ultimo,
  onRemover,
  onMover,
}: CabecalhoItemProps) {
  const posicao = indice + 1;
  const nomeAcessivel = nome.toLowerCase();

  return (
    <div className={styles.itemHeader}>
      <div>
        <strong>
          {nome} {posicao}
        </strong>
        <span>{descricao}</span>
      </div>
      {!somenteLeitura && (
        <div className={styles.itemActions}>
          <button
            className={styles.iconButton}
            type="button"
            disabled={primeiro}
            aria-label={`Mover ${nomeAcessivel} ${posicao} para cima`}
            onClick={() => onMover(-1)}
          >
            ↑
          </button>
          <button
            className={styles.iconButton}
            type="button"
            disabled={ultimo}
            aria-label={`Mover ${nomeAcessivel} ${posicao} para baixo`}
            onClick={() => onMover(1)}
          >
            ↓
          </button>
          <button className={styles.dangerButton} type="button" onClick={onRemover}>
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

export function CampoRotuloFormulario({
  id,
  label,
  valor,
  onChange,
}: {
  id: string;
  label: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={valor}
        maxLength={240}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function CampoIdentificadorFormulario({
  id,
  valor,
  prefixo,
  orientacao,
  onChange,
}: {
  id: string;
  valor: string;
  prefixo: string;
  orientacao: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>Identificador</label>
      <input
        id={id}
        value={valor}
        onChange={(event) => onChange(chaveFormulario(event.target.value, prefixo))}
      />
      <span>{orientacao}</span>
    </div>
  );
}

export function SeletorObrigatorio({
  id,
  obrigatorio,
  onChange,
}: {
  id: string;
  obrigatorio?: boolean;
  onChange: (obrigatorio: boolean) => void;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>Obrigatório</label>
      <select
        id={id}
        value={obrigatorio ? "sim" : "nao"}
        onChange={(event) => onChange(event.target.value === "sim")}
      >
        <option value="nao">Não</option>
        <option value="sim">Sim</option>
      </select>
    </div>
  );
}
