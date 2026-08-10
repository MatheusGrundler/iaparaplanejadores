type SlotEstado = { tipo: "estado"; valor: unknown };
type SlotRef = { tipo: "ref"; valor: { current: unknown } };

const slots: Array<SlotEstado | SlotRef> = [];
let cursor = 0;
const limpezas: Array<() => void> = [];

/**
 * Dispatcher mínimo para exercitar os handlers dos componentes cliente sem um
 * navegador. O JSX continua sendo React real; apenas os hooks desses dois
 * componentes são direcionados para slots determinísticos durante o teste.
 */
export function iniciarRenderDeComponente() {
  cursor = 0;
}

export function reiniciarHooksDeComponente() {
  for (const limpeza of limpezas.splice(0)) limpeza();
  slots.length = 0;
  cursor = 0;
}

export function useState<T>(inicial: T | (() => T)) {
  const indice = cursor++;
  if (!slots[indice]) {
    slots[indice] = {
      tipo: "estado",
      valor: typeof inicial === "function" ? (inicial as () => T)() : inicial,
    };
  }
  const slot = slots[indice];
  if (slot.tipo !== "estado") throw new Error("Ordem de hooks mudou durante o teste.");

  const atualizar = (valor: T | ((atual: T) => T)) => {
    slot.valor = typeof valor === "function" ? (valor as (atual: T) => T)(slot.valor as T) : valor;
  };
  return [slot.valor as T, atualizar] as const;
}

export function useRef<T>(inicial: T) {
  const indice = cursor++;
  if (!slots[indice]) slots[indice] = { tipo: "ref", valor: { current: inicial } };
  const slot = slots[indice];
  if (slot.tipo !== "ref") throw new Error("Ordem de hooks mudou durante o teste.");
  return slot.valor as { current: T };
}

export function useEffect(efeito: () => void | (() => void)) {
  const limpeza = efeito();
  if (limpeza) limpezas.push(limpeza);
}
