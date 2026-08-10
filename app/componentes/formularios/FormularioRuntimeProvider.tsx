"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  ContextoRuntimeFormulario,
  FormularioRuntimeAdapter,
  ResolverRuntimeFormulario,
} from "@/lib/formularios/runtime";

type ContextoFormularioRuntime = {
  adapter?: FormularioRuntimeAdapter;
  resolver?: ResolverRuntimeFormulario;
  contexto?: ContextoRuntimeFormulario;
};

const FormularioRuntimeContext = createContext<ContextoFormularioRuntime>({});

type Props = ContextoFormularioRuntime & {
  children: ReactNode;
};

/**
 * Configura uma vez o runtime usado por todos os `<Formulario codigo="…" />`
 * abaixo dele. `resolver` permite escolher um adapter diferente por código.
 */
export function FormularioRuntimeProvider({ adapter, resolver, contexto, children }: Props) {
  const valor = useMemo(() => ({ adapter, resolver, contexto }), [adapter, contexto, resolver]);
  return (
    <FormularioRuntimeContext.Provider value={valor}>{children}</FormularioRuntimeContext.Provider>
  );
}

export function useFormularioRuntime() {
  return useContext(FormularioRuntimeContext);
}
