"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import DialogoCentrado from "./DialogoCentrado";

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  centrado?: boolean;
  descripcion?: string;
  ocupado?: boolean;
}

/**
 * Capa lateral para el panel. En móvil ocupa la pantalla; en escritorio es un
 * drawer. Mantiene el foco dentro, cierra con Escape y devuelve el foco al
 * botón que lo abrió.
 */
export default function CapaModal(props: Props) {
  return props.centrado ? <DialogoCentrado {...props} /> : <CapaLateral {...props} />;
}

function CapaLateral({ titulo, onCerrar, children }: Props) {
  const tituloId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const anteriorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    anteriorRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      anteriorRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
        return;
      }
      if (evento.key !== "Tab" || !panelRef.current) return;

      const enfocables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement as HTMLElement;
      if (evento.shiftKey && activo === primero) {
        evento.preventDefault();
        ultimo?.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero?.focus();
      }
    }

    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-coffee/40"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="flex h-full w-full max-w-xl flex-col border-stone bg-pagina sm:border-l"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone px-5 py-4">
          <h2 id={tituloId} className="font-titulos text-h4">
            {titulo}
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-stone bg-superficie text-tinta-suave transition-colors hover:text-coffee"
            aria-label="Cerrar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
