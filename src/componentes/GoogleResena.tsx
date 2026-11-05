"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { TEXTOS_IDENTIDAD_RESENA as T, TEXTOS_FORMULARIO_RESENA } from "../data/resenas";
import { leerConfigGoogle, verificarIdentidadGoogle } from "../lib/googleResenas";

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (datos: { client_id: string; nonce: string; auto_select: boolean; callback: (respuesta: { credential: string }) => void }) => void;
      renderButton: (elemento: HTMLElement, opciones: { theme: string; size: string; text: string; locale: string; width: string; shape: string }) => void;
    } } };
  }
}

/** Botón oficial listo en la bienvenida, sin un botón intermedio ni One Tap. */
export default function GoogleResena({ onIdentidad }: { onIdentidad: (credential: string, nombre: string) => void }) {
  const [config, setConfig] = useState<{ googleClientId: string; nonce: string } | null>(null);
  const [cargado, setCargado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const activo = useRef(false);
  const ocupado = useRef(false);

  useEffect(() => {
    let vigente = true;
    activo.current = true;
    void leerConfigGoogle(true).then((datos) => {
      if (!datos.googleClientId || !datos.nonce) throw new Error("Google no disponible");
      if (vigente) setConfig({ googleClientId: datos.googleClientId, nonce: datos.nonce });
    }).catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; activo.current = false; };
  }, []);

  function preparar() {
    if (!activo.current || !config || !window.google || !contenedor.current) return;
    window.google.accounts.id.initialize({
      client_id: config.googleClientId, nonce: config.nonce, auto_select: false,
      callback: (respuesta) => {
        if (!activo.current || ocupado.current) return;
        ocupado.current = true;
        setVerificando(true);
        setError(false);
        void verificarIdentidadGoogle(respuesta.credential).then((datos) => {
          if (activo.current) onIdentidad(respuesta.credential, datos.nombre);
        }).catch(() => { if (activo.current) setError(true); }).finally(() => {
          ocupado.current = false;
          if (activo.current) setVerificando(false);
        });
      },
    });
    contenedor.current.replaceChildren();
    window.google.accounts.id.renderButton(contenedor.current, {
      theme: "filled_black", size: "large", text: "continue_with", locale: "es", shape: "rectangular",
      width: String(Math.min(400, Math.floor(contenedor.current.clientWidth))),
    });
    setCargado(true);
  }

  return <div className="w-full">
    {config && <Script src="https://accounts.google.com/gsi/client" onReady={preparar} onError={() => setError(true)} />}
    {!cargado && !error && <p role="status" className="flex min-h-12 items-center justify-center rounded-sm border border-stone bg-superficie text-small text-tinta-suave">{T.preparando}</p>}
    <div ref={contenedor} inert={verificando} className="min-w-0 py-1" />
    {verificando && <p role="status" className="mt-2 text-small text-tinta-suave">{T.verificandoGoogle}</p>}
    {cargado && !error && <p className="mt-2 text-small text-tinta-suave">{TEXTOS_FORMULARIO_RESENA.googleAyuda}</p>}
    {error && <p role="alert" className="mt-2 text-small text-alerta">{T.errorGoogle}</p>}
  </div>;
}
