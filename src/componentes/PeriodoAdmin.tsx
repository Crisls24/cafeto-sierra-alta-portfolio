"use client";
import { createContext, useContext, useState } from "react";
const ContextoPeriodo = createContext<{ periodo: string; setPeriodo: (valor: string) => void } | null>(null);
export function ProveedorPeriodoAdmin({ children }: { children: React.ReactNode }) {
  const [periodo, setPeriodo] = useState("anterior");
  return <ContextoPeriodo.Provider value={{ periodo, setPeriodo }}>{children}</ContextoPeriodo.Provider>;
}
export function usePeriodoAdmin() {
  const contexto = useContext(ContextoPeriodo);
  if (!contexto) throw new Error("Falta ProveedorPeriodoAdmin");
  return contexto;
}
