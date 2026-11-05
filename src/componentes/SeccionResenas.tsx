"use client";

import { useEffect, useState } from "react";
import ResenasGoogle from "./ResenasGoogle";
import { TEXTOS_IDENTIDAD_RESENA as TI } from "../data/resenas";
import { BadgeCheck, Star } from "lucide-react";

import { MAX_CALIFICACION, TEXTOS_RESENAS } from "../data/resenas";
import {
  formatearFecha,
  inicialesDe,
  leerResenas,
  textoTotalVerificadas,
  type RespuestaResenas,
  type ResenaPublica,
  type ResumenResenas,
} from "../lib/resenas";

type Estado =
  | { fase: "cargando" }
  | { fase: "lista"; datos: RespuestaResenas };

/**
 * Respuesta vacía: la usa tanto el caso "todavía no hay reseñas" como el de
 * una lectura que no llegó. La sección no muestra un estado de error: una
 * página de marca con "No pudimos cargar las reseñas" se siente como una
 * aplicación, no como Cafeto. Si el Worker no responde, se presenta igual
 * que la sección sin reseñas publicadas.
 */
const SIN_RESENAS: RespuestaResenas = {
  resenas: [],
  resumen: { promedio: 0, total: 0 },
};

/**
 * Bloque de reseñas verificadas.
 *
 * El sitio es un export estático y el respaldo es un Worker con D1, así que
 * las reseñas no se prerenderizan: este componente lee `GET /api/resenas`
 * desde el navegador y pinta la carga, el vacío y la lista. El texto de cada
 * estado vive en `src/data/resenas.ts`.
 *
 * Mientras no hay reseñas aprobadas, el estado vacío es una composición
 * editorial de dos columnas: el título a la izquierda, el mensaje temporal a
 * la derecha, separados por el borde `color-stone`. En cuanto llega la
 * primera reseña aprobada, ese bloque desaparece solo y entra `Lista` con el
 * resumen y las tarjetas reales.
 *
 * Las estrellas llenas son `color-honey` y las vacías `color-stone`: ningún
 * color nuevo, ningún decimal en un componente. La insignia "Compra
 * verificada" es el sello que cada reseña trae del Worker.
 */
export default function SeccionResenas() {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  // El setState vive en el callback del `.then`, nunca en el cuerpo del
  // efecto: es una suscripción a una respuesta y no un render en cascada
  // (react-hooks/set-state-in-effect). El guard `activo` evita actualizar
  // un componente desmontado si la respuesta llega después del cambio de
  // página.
  useEffect(() => {
    let activo = true;
    void leerResenas().then((resultado) => {
      if (!activo) return;
      setEstado({
        fase: "lista",
        datos: resultado.ok ? resultado.datos : SIN_RESENAS,
      });
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="mt-0">
      {estado.fase === "lista" && estado.datos.resenas.length > 0 ? (
        <Lista datos={estado.datos} />
      ) : (
        <BloqueEditorial estado={estado} />
      )}
      <ResenasGoogle />
    </div>
  );
}

/**
 * Estado vacío (y de carga) como pieza editorial.
 *
 * La columna izquierda es fija: el título. La derecha es la única que cambia
 * según el estado, y por eso lleva el `aria-live`. En móvil las dos columnas
 * se apilan y la separación pasa a ser un borde superior.
 */
function BloqueEditorial({ estado }: { estado: Estado }) {
  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-14">
      <div className="reveal-texto">
        <h2 className="font-titulos text-h2 text-coffee">{TEXTOS_RESENAS.titulo}</h2>
      </div>

      <div
        aria-live="polite"
        className="reveal-texto desfase-100 border-t border-stone pt-6 lg:border-t-0 lg:border-l lg:pl-14 lg:pt-0"
      >
        {estado.fase === "cargando" ? (
          <p aria-busy="true" className="max-w-sm text-small leading-6 text-tinta-suave">
            {TEXTOS_RESENAS.cargando}
          </p>
        ) : (
          <>
            <HojaCafe className="h-5 w-5 text-honey" />
            <p className="mt-3 max-w-sm text-small leading-6 text-tinta-suave">
              {TEXTOS_RESENAS.vacioMensaje}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Lista({ datos }: { datos: RespuestaResenas }) {
  return (
    <div className="space-y-6">
      <h2 className="reveal-texto font-titulos text-h2 text-coffee">{TEXTOS_RESENAS.titulo}</h2>
      <Resumen resumen={datos.resumen} />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {datos.resenas.map((resena) => (
          <li key={resena.id} className="flex h-full">
            <TarjetaResena resena={resena} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Detalle lineal de origen: una hoja de cafeto en el trazo del sello
 * botánico. Es decorativa y secundaria; hereda el color del contenedor
 * (`currentColor`), de modo que no introduce ningún valor fuera del `@theme`.
 */
function HojaCafe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.5 3.5C11 3 4.5 9.5 4 19.5c10-.5 16.5-7 16.5-16Z" />
      <path d="M20.5 3.5C14.5 8.5 9.5 13.5 4 19.5" />
    </svg>
  );
}

function Resumen({ resumen }: { resumen: ResumenResenas }) {
  const promedio = resumen.promedio.toFixed(1);
  const calificacion = Math.round(resumen.promedio);

  return (
    <div className="flex flex-col gap-4 border-y border-stone py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <p className="cifras font-titulos text-h2 leading-none text-coffee">{promedio}</p>
        <div className="flex flex-col gap-1.5">
          <Estrellas calificacion={calificacion} />
          <p className="text-label text-tinta-suave">{TEXTOS_RESENAS.deCinco}</p>
        </div>
      </div>
      <p className="text-small text-tinta-suave sm:text-right">
        {textoTotalVerificadas(resumen.total)}
      </p>
    </div>
  );
}

function TarjetaResena({ resena }: { resena: ResenaPublica }) {
  const fecha = formatearFecha(resena.creadaEn);

  return (
    <article className="flex h-full flex-col rounded-sm border border-stone bg-superficie p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Estrellas calificacion={resena.calificacion} />
        {resena.verificada && <span title={TI.verificadaAyuda} className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-honey/30 bg-honey/10 px-2 py-1">
          <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 text-honey-texto" strokeWidth={2} />
          <span className="text-label font-semibold uppercase tracking-[0.12em] text-honey-texto">
            {TEXTOS_RESENAS.verificada}
          </span>
        </span>}
      </div>
      {resena.verificada && <p className="mt-2 text-label tracking-normal text-tinta-suave">{TI.verificadaAyuda}</p>}

      <blockquote className="mt-4 flex-1 whitespace-pre-wrap break-words text-small leading-6 text-coffee-medio">
        {resena.comentario}
      </blockquote>

      <footer className="mt-5 flex items-center gap-3 border-t border-stone pt-4">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-stone bg-pagina text-label font-semibold uppercase text-coffee"
        >
          {inicialesDe(resena.nombrePublico)}
        </span>
        <div className="min-w-0">
          <p className="text-small font-semibold text-coffee">{resena.nombrePublico}</p>
          {fecha && <p className="text-label text-tinta-suave">{fecha}</p>}
        </div>
      </footer>
    </article>
  );
}

function Estrellas({ calificacion }: { calificacion: number }) {
  const llenas = Math.min(MAX_CALIFICACION, Math.max(0, calificacion));

  return (
    <span
      role="img"
      aria-label={`Calificación: ${calificacion} de ${MAX_CALIFICACION}`}
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: MAX_CALIFICACION }, (_, indice) => (
        <Star
          key={indice}
          aria-hidden="true"
          strokeWidth={1.5}
          className={indice < llenas ? "h-4 w-4 fill-honey text-honey" : "h-4 w-4 text-stone"}
        />
      ))}
    </span>
  );
}