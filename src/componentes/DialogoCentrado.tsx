"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { TEXTOS_VENTAS } from "../data/ventas";

export default function DialogoCentrado({ titulo, descripcion, ocupado, onCerrar, children }: {
  titulo: string; descripcion?: string; ocupado?: boolean; onCerrar: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const dialogo = ref.current;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogo?.showModal();
    cerrarRef.current?.focus();
    return () => {
      dialogo?.close();
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);
  return <dialog ref={ref} aria-labelledby={`${id}-titulo`} aria-describedby={descripcion ? `${id}-descripcion` : undefined}
    className="venta-dialogo" onCancel={(evento) => { evento.preventDefault(); if (!ocupado) onCerrar(); }}>
    <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
      <div><h2 id={`${id}-titulo`} className="font-titulos text-h2">{titulo}</h2>
        {descripcion && <p id={`${id}-descripcion`} className="mt-1 text-body text-tinta-suave">{descripcion}</p>}
      </div>
      <button ref={cerrarRef} type="button" onClick={onCerrar} disabled={ocupado} aria-label={TEXTOS_VENTAS.acciones.cerrar}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-sm text-tinta-suave hover:bg-pagina disabled:opacity-50"><X aria-hidden="true" className="size-6" /></button>
    </header>
    {children}
  </dialog>;
}
