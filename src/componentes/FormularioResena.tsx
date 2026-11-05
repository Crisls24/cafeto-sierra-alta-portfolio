"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PORTAFOLIO } from "../data/portafolio";
import GoogleResena from "./GoogleResena";
import EstrellaResena from "./EstrellaResena";
import { CONSENTIMIENTO_RESENA_VERSION, TEXTOS_IDENTIDAD_RESENA as TI } from "../data/resenas";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import {
  MAX_CALIFICACION,
  MOTIVOS_INVITACION_INVALIDA,
  TEXTOS_FORMULARIO_RESENA as T,
} from "../data/resenas";
import {
  enviarResena,
  validarTokenInvitacion,
  type EntradaResena,
  type MotivoInvitacionInvalida,
} from "../lib/resenasCliente";

type Fase =
  | { fase: "cargando" }
  | { fase: "bienvenida" }
  | { fase: "invalido"; mensaje: string }
  | { fase: "formulario" }
  | { fase: "enviado" }
  | { fase: "error" };

/**
 * Formulario público de reseña.
 *
 * Vive en `/resena/<token>`. El Worker reescribe esa ruta al asset estático
 * `/resena.html` (el sitio es un export, ver `next.config.ts`), así que la
 * página se sirve ya compilada y este componente lee el token del path en el
 * navegador. El path se mantiene en `window.location.pathname`: la
 * reescritura ocurre en el Worker, no en el historial del navegador.
 *
 * Antes de mostrar el formulario se valida el token contra el Worker. Ningún
 * dato del pedido se muestra: solo se confirma que la invitación sirve. Los
 * textos viven en `src/data/resenas.ts`.
 */
export default function FormularioResena() {
  // El token no es estado de render: vive en un ref y solo lo lee el envío.
  const tokenRef = useRef<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [fase, setFase] = useState<Fase>({ fase: "cargando" });
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const faseAnterior = useRef(fase.fase);
  useEffect(() => {
    const anterior = faseAnterior.current;
    faseAnterior.current = fase.fase;
    if (fase.fase === "formulario" || (fase.fase === "bienvenida" && anterior === "formulario")) {
      tituloRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [fase.fase]);

  // Campos del formulario.
  const enviandoRef = useRef(false);
  const credentialRef = useRef<string | null>(null);
  const [conGoogle, setConGoogle] = useState(false);
  const [acepta, setAcepta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [calificacion, setCalificacion] = useState(0);
  const [estrellaAnimada, setEstrellaAnimada] = useState({ valor: 0, revision: 0 });
  function animarEstrella(valor: number) {
    setEstrellaAnimada((anterior) => ({ valor, revision: anterior.revision + 1 }));
  }
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // El token solo existe en el navegador: se lee del path en un efecto para
  // no romper la hidratación del export (servidor sin path real). Todo el
  // estado se aplica en callbacks, nunca en el cuerpo del efecto
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    const extraido = tokenDePath(window.location.pathname);
    if (extraido === null) {
      void Promise.resolve().then(() => {
        setFase({ fase: "invalido", mensaje: MOTIVOS_INVITACION_INVALIDA.no_existe });
      });
      return;
    }
    tokenRef.current = extraido;
    let activo = true;
    void validarTokenInvitacion(extraido).then((resultado) => {
      if (!activo) return;
      if (!resultado.ok) {
        setFase({ fase: "error" });
        return;
      }
      if (!resultado.valida) {
        setFase({ fase: "invalido", mensaje: motivoTexto(resultado.motivo) });
        return;
      }
      setFase({ fase: "bienvenida" });
    });
    return () => {
      activo = false;
    };
  }, [revision]);

  const errores = useMemo(
    () => ({
      nombre: (nombre.trim().length < 2 || nombre.trim().length > 60) ? T.errorNombre : null,
      consentimiento: !acepta ? TI.errorConsentimiento : null,
      calificacion: calificacion < 1 ? T.errorCalificacion : null,
      comentario:
        (comentario.trim().length < 10 || comentario.trim().length > 2000) ? T.errorComentario : null,
    }),
    [nombre, calificacion, comentario, acepta]
  );

  const alEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const token = tokenRef.current;
    if (token === null || enviandoRef.current) return;

    const primerError = errores.calificacion ?? errores.comentario ?? errores.nombre ?? errores.consentimiento;
    setError(null);
    if (primerError !== null) {
      setMostrarErrores(true);
      const campo = errores.calificacion ? 'input[name="calificacion"]' : errores.comentario ? '#resena-comentario' : errores.nombre ? '#resena-nombre' : '#resena-consentimiento';
      document.querySelector<HTMLElement>(campo)?.focus();
      return;
    }

    setError(null);
    enviandoRef.current = true;
    setEnviando(true);
    const entrada: EntradaResena = {
      token,
      calificacion,
      comentario: comentario.trim(),
      nombrePublico: nombre.trim(),
      aceptaPublicacion: true, consentimientoVersion: CONSENTIMIENTO_RESENA_VERSION,
      ...(credentialRef.current ? { googleCredential: credentialRef.current } : {}),
    };
    const resultado = await enviarResena(entrada);
    setEnviando(false);
    enviandoRef.current = false;

    if (resultado.ok) {
      setFase({ fase: "enviado" });
      return;
    }
    if (resultado.motivo === "google") { setError(TI.errorGoogle); return; }
    if (resultado.motivo === "limite") { setError(TI.limite); return; }
    if (resultado.motivo === "ya_resenado") {
      setFase({ fase: "invalido", mensaje: MOTIVOS_INVITACION_INVALIDA.usada });
      return;
    }
    if (resultado.motivo === "invalida") {
      setFase({ fase: "invalido", mensaje: motivoTexto(resultado.detalle ?? "generico") });
      return;
    }
    setError(T.errorEnvio);
  };

  if (fase.fase === "cargando") {
    return <div role="status" aria-busy="true" className="flex min-h-64 items-center justify-center text-small text-tinta-suave">{T.cargando}</div>;
  }
  if (fase.fase === "error") {
    return <div role="alert" className="py-10">
      <h1 className="font-titulos text-h2 text-coffee">{T.invalidoTitulo}</h1>
      <p className="mt-3 text-small text-tinta-suave">{T.errorEnvio}</p>
      <button type="button" className="mt-5 min-h-12 rounded-sm border border-stone px-5 text-small" onClick={() => { setFase({ fase: "cargando" }); setRevision((n) => n + 1); }}>{TI.reintentar}</button>
    </div>;
  }
  if (fase.fase === "invalido") return <BloqueInvalido mensaje={fase.mensaje} />;
  if (fase.fase === "enviado") return <BloqueGracias />;

  if (fase.fase === "bienvenida") {
    return <section aria-labelledby="resena-bienvenida">
      <div className="relative h-28 overflow-hidden rounded-sm bg-coffee sm:h-40">
        <Image src={T.foto} alt="" fill preload sizes="(max-width: 640px) 100vw, 420px" className="object-cover object-center" />
      </div>
      <h1 ref={tituloRef} tabIndex={-1} id="resena-bienvenida" className="mt-6 font-titulos text-h2 text-coffee">{T.bienvenida}</h1>
      <p className="mt-2 text-small text-tinta-suave">{T.bienvenidaDetalle}</p>
      {!PORTAFOLIO.activo && <><div className="mt-6 rounded-sm border border-honey/35 bg-superficie p-4">
        <p className="mb-2 text-label font-semibold uppercase tracking-widest text-honey-texto">{T.recomendado}</p>
        <GoogleResena onIdentidad={(credential, nombreGoogle) => {
          credentialRef.current = credential;
          setConGoogle(true);
          setNombre((prev) => prev || nombreGoogle);
          setError(null);
          setFase({ fase: "formulario" });
        }} />
      </div>
      <div className="my-3 flex items-center gap-3 text-small text-tinta-suave" aria-hidden="true"><span className="h-px flex-1 bg-stone" />{T.separador}<span className="h-px flex-1 bg-stone" /></div></>}
      <button type="button" onClick={() => {
        credentialRef.current = null;
        setConGoogle(false);
        setError(null);
        setFase({ fase: "formulario" });
      }} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-sm border border-coffee/25 px-4 text-small font-medium text-coffee transition-colors duration-ui hover:border-coffee hover:bg-superficie">{T.sinCuenta}<ArrowRight aria-hidden="true" className="size-4" /></button>
      <p className="mt-4 text-center text-label tracking-normal text-tinta-suave">{T.destino}</p>
    </section>;
  }

  return <form noValidate onSubmit={alEnviar} aria-labelledby="resena-form-titulo">
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2 text-small text-tinta-suave">{conGoogle && <Check aria-hidden="true" className="size-4 text-honey-texto" />}{conGoogle ? T.conGoogle : T.invitado}</span>
      <button type="button" disabled={enviando} onClick={() => { setError(null); setMostrarErrores(false); setFase({ fase: "bienvenida" }); }} className="inline-flex min-h-11 items-center gap-2 text-small text-honey-texto underline"><ArrowLeft aria-hidden="true" className="size-4" />{T.cambiar}</button>
    </div>
    <h1 ref={tituloRef} tabIndex={-1} id="resena-form-titulo" className="mt-2 font-titulos text-h2 text-coffee">{T.formularioTitulo}</h1>

    <fieldset className="mt-5">
      <legend className="w-full text-small font-semibold text-coffee"><span className="flex items-center justify-between gap-3"><span>{T.calificacionLabel}</span><span aria-live="polite" aria-atomic="true" className="font-normal text-honey-texto">{calificacion ? T.seleccion[calificacion - 1] : ""}</span></span></legend>
      <div className="mt-3 flex">
        <div className="flex w-full justify-between gap-1" role="radiogroup" aria-label={T.calificacionLabel} aria-describedby="resena-estrellas-estado" aria-invalid={mostrarErrores && errores.calificacion !== null}>
          {Array.from({ length: MAX_CALIFICACION }, (_, indice) => {
            const valor = indice + 1;
            return <label key={valor} title={T.estrellas[indice]} className="group inline-flex aspect-square min-h-12 min-w-0 max-w-16 flex-1 cursor-pointer items-center justify-center rounded-sm transition-colors duration-ui hover:bg-honey/10 focus-within:outline-2 focus-within:outline-honey-profundo focus-within:outline-offset-2">
              <input disabled={enviando} type="radio" name="calificacion" value={valor} checked={calificacion === valor} onClick={() => { if (calificacion === valor) animarEstrella(valor); }} onChange={() => { setCalificacion(valor); animarEstrella(valor); }} className="sr-only" />
              <span key={estrellaAnimada.valor === valor ? estrellaAnimada.revision : 0} aria-hidden="true" className={estrellaAnimada.valor === valor ? valor <= 2 ? "resena-animo-entrada inline-flex size-full p-1" : "resena-estrella-pulso inline-flex size-full p-1" : "inline-flex size-full p-1"}>
                <EstrellaResena valor={valor} activa={valor <= calificacion} elegida={valor === calificacion} />
              </span>
              <span className="sr-only">{T.estrellas[indice]} · {T.seleccion[indice]}</span>
            </label>;
          })}
        </div>
      </div>
      <p id="resena-estrellas-estado" className="text-small text-alerta">{mostrarErrores && errores.calificacion ? errores.calificacion : ""}</p>
    </fieldset>

    <div className="mt-5">
      <label htmlFor="resena-comentario" className="text-small font-semibold text-coffee">{T.comentarioLabel}</label>
      <textarea disabled={enviando} id="resena-comentario" value={comentario} maxLength={2000} rows={4} onChange={(evento) => setComentario(evento.target.value)} placeholder={T.comentarioPlaceholder} aria-describedby="resena-comentario-estado" aria-invalid={mostrarErrores && errores.comentario !== null} className="mt-2 min-h-28 w-full resize-y rounded-sm border border-coffee/20 bg-superficie px-4 py-3 text-body text-coffee transition-colors duration-ui placeholder:text-tinta-suave/75 hover:border-honey-profundo/60 focus:border-honey-profundo" />
      <div id="resena-comentario-estado" className="mt-1 flex justify-between gap-3 text-label tracking-normal">
        <span className="text-alerta">{mostrarErrores && errores.comentario ? errores.comentario : ""}</span>
        {comentario.length > 1800 && <span className="shrink-0 text-tinta-suave">{comentario.length} / 2000 {T.comentarioLimite}</span>}
      </div>
    </div>

    <div className="mt-4">
      <label htmlFor="resena-nombre" className="text-small font-semibold text-coffee">{T.nombreLabel}</label>
      <input disabled={enviando} id="resena-nombre" type="text" value={nombre} maxLength={60} autoComplete="name" onChange={(evento) => setNombre(evento.target.value)} placeholder={T.nombrePlaceholder} aria-describedby="resena-nombre-estado" aria-invalid={mostrarErrores && errores.nombre !== null} className="mt-2 min-h-12 w-full rounded-sm border border-coffee/20 bg-superficie px-4 text-body text-coffee transition-colors duration-ui placeholder:text-tinta-suave/75 hover:border-honey-profundo/60 focus:border-honey-profundo" />
      <p id="resena-nombre-estado" className="mt-1 text-small text-alerta">{mostrarErrores && errores.nombre ? errores.nombre : ""}</p>
    </div>

    <label className="mt-5 flex min-h-11 items-start gap-3 text-small leading-6 text-tinta-suave">
      <input id="resena-consentimiento" type="checkbox" checked={acepta} disabled={enviando} onChange={(e) => setAcepta(e.target.checked)} aria-describedby="resena-consentimiento-estado" aria-invalid={mostrarErrores && !acepta} className="mt-1 size-5 shrink-0 accent-honey-profundo" />
      <span>{TI.consentimiento} <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-honey-texto">{TI.privacidad}</Link>.</span>
    </label>
    <p id="resena-consentimiento-estado" className="mt-1 text-small text-alerta">{mostrarErrores && !acepta ? TI.errorConsentimiento : ""}</p>
    {error !== null && <p role="alert" className="mt-3 text-small font-medium text-alerta">{error}</p>}
    <button type="submit" disabled={enviando} className="mt-4 inline-flex min-h-14 w-full items-center justify-between gap-3 rounded-sm bg-coffee px-5 py-4 text-small font-medium text-superficie transition-colors duration-ui hover:bg-coffee-medio disabled:cursor-not-allowed disabled:opacity-60">{enviando ? T.enviando : T.enviar}<ArrowRight aria-hidden="true" className="size-5" /></button>
  </form>;
}

function BloqueGracias() {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus({ preventScroll: true }); }, []);
  return <section className="py-12">
    <span className="flex size-14 items-center justify-center rounded-full border border-honey/30 bg-honey/10"><Check aria-hidden="true" className="size-6 text-honey-texto" /></span>
    <h1 ref={titulo} tabIndex={-1} className="mt-6 font-titulos text-h2 text-coffee">{T.graciasTitulo}</h1>
    <p className="mt-3 text-small leading-6 text-tinta-suave">{T.graciasMensaje}</p>
    <Link href="/" className="mt-8 inline-flex min-h-12 items-center gap-3 text-small text-honey-texto">{T.volverAlSitio}<ArrowRight aria-hidden="true" className="size-4" /></Link>
  </section>;
}

function BloqueInvalido({ mensaje }: { mensaje: string }) {
  return <section role="alert" className="py-10">
    <h1 className="font-titulos text-h2 text-coffee">{T.invalidoTitulo}</h1>
    <p className="mt-3 text-small leading-6 text-tinta-suave">{mensaje}</p>
    <Link href="/" className="mt-6 inline-flex min-h-12 items-center gap-3 text-small text-honey-texto">{T.volverAlSitio}<ArrowRight aria-hidden="true" className="size-4" /></Link>
  </section>;
}

function motivoTexto(motivo: MotivoInvitacionInvalida): string {
  return MOTIVOS_INVITACION_INVALIDA[motivo];
}

function tokenDePath(pathname: string): string | null {
  const partes = pathname.split("/").filter(Boolean);
  if (partes.length !== 2 || partes[0] !== "resena") return null;
  const token = partes[1];
  return token !== undefined && token.length >= 20 ? token : null;
}
