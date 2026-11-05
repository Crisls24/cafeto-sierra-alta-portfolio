import Link from "next/link";
import { Clock, Leaf, Mail, MapPin, Phone } from "lucide-react";

import { EMPRESA } from "../data/empresa";
import { PENDIENTE } from "../data/tipos";
import { textoHorario } from "../lib/horarios";
import { telefonoLegible } from "../lib/telefono";
import RamaCafeto from "./RamaCafeto";
import { PAGINAS_CAFE, TEXTOS_CAFE } from "../data/cafe";

/** Textos propios del pie, separados de la marca para cambiarlos sin tocar la retícula. */
const MENSAJE_LOCAL = "Café, quesos y miel de origen.";
const SELLO_ORIGEN = "100 % natural";

/**
 * Pie de página: una franja café oscuro, compacta, con cuatro zonas en
 * escritorio (identidad, mensaje, contacto y sello de origen) separadas por
 * divisores finos, y la rama de cafeto recortada por el borde derecho.
 *
 * El contacto sale de `data/empresa.ts`, no se escribe aquí. Las decisiones
 * de color y radio del sello salen del `@theme` de `app/globals.css`.
 */
export default function PiePagina() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-superficie/10 bg-coffee text-superficie">
      <RamaCafeto className="pointer-events-none absolute -right-8 -bottom-12 hidden h-60 w-60 text-honey opacity-30 lg:block" />
      <RamaCafeto className="pointer-events-none absolute -left-8 -bottom-12 hidden h-60 w-60 -scale-x-100 text-honey opacity-30 lg:block" />

      <div className="relative mx-auto w-full max-w-sitio px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 py-8 sm:gap-7 lg:flex-row lg:items-center lg:divide-x lg:divide-superficie/10 lg:py-10">
          {/* 1. Identidad. Solo tipografía, sin isotipo. */}
          <div className="lg:pr-8">
            <Link
              href="/"
              aria-label="Cafeto Sierra Alta, inicio"
              className="group inline-flex flex-col no-underline"
            >
              <span className="font-titulos text-[2.375rem] leading-none text-superficie transition-colors duration-ui group-hover:text-honey">
                Cafeto
              </span>
              <span className="mt-1.5 text-label font-semibold uppercase tracking-[0.3em] text-superficie/60">
                Sierra Alta
              </span>
            </Link>
          </div>

          {/* 2. Mensaje institucional. */}
          <div className="lg:px-8">
            <p className="max-w-[17.5rem] font-titulos text-body italic leading-relaxed text-honey">
              {MENSAJE_LOCAL}
            </p>
          </div>

          {/* 3. Contacto comercial: teléfono, correo, horario y ubicación
              general. Todo sale de `data/empresa.ts`. */}
          <div className="lg:px-8">
            <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.16em] text-superficie/60">
              <Mail aria-hidden="true" size={14} className="text-honey" />
              Contacto comercial
            </p>
            {EMPRESA.telefono !== PENDIENTE && (
              <a
                href={`tel:+${EMPRESA.telefono}`}
                className="mt-2 flex items-center gap-2 text-body text-superficie transition-colors duration-ui hover:text-honey"
              >
                <Phone aria-hidden="true" size={14} className="text-honey" />
                {telefonoLegible(EMPRESA.telefono)}
              </a>
            )}
            <a
              href={`mailto:${EMPRESA.correoNegocios}`}
              className="mt-2 inline-block text-body text-superficie transition-colors duration-ui hover:text-honey"
            >
              {EMPRESA.correoNegocios}
            </a>
            {EMPRESA.horarios !== PENDIENTE && textoHorario(EMPRESA.horarios) && (
              <p className="mt-2 flex items-center gap-2 text-small text-superficie/60">
                <Clock aria-hidden="true" size={14} className="text-honey" />
                {textoHorario(EMPRESA.horarios)}
              </p>
            )}
            {EMPRESA.ubicacion && (
              <p className="mt-2 flex items-center gap-2 text-small text-superficie/60">
                <MapPin aria-hidden="true" size={14} className="text-honey" />
                {EMPRESA.ubicacion}
              </p>
            )}
          </div>

          {/* 4. Sello. Relleno verde y una hoja junto al texto. */}
          <div className="lg:pl-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-origen px-4 py-2 text-label font-semibold uppercase tracking-[0.16em] text-origen-claro">
              <Leaf aria-hidden="true" size={13} />
              {SELLO_ORIGEN}
            </span>
          </div>
        </div>

        <nav aria-label={TEXTOS_CAFE.explorar} className="flex flex-col gap-2 border-t border-superficie/10 py-4 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {Object.values(PAGINAS_CAFE).map((pagina) => (
            <Link key={pagina.ruta} href={pagina.ruta} className="inline-flex min-h-11 items-center text-small text-superficie underline underline-offset-4 transition-colors duration-ui hover:text-honey">
              {pagina.etiqueta}
            </Link>
          ))}
        </nav>

        {/* Línea inferior: copyright, nota de consentimiento y enlaces
            legales. La nota vive aquí, fuera de la columna de contacto,
            para que el pie se lea compacto. */}
        <div className="flex flex-col gap-3 border-t border-superficie/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-small text-superficie/60">
              © {new Date().getFullYear()} Cafeto Sierra Alta
            </p>
            <p className="max-w-[28rem] text-small leading-relaxed text-superficie/60">
              Al contactarnos por WhatsApp o correo electrónico, aceptas nuestro{" "}
              <Link
                href="/privacidad"
                className="text-honey underline underline-offset-2 transition-colors duration-ui hover:text-superficie"
              >
                Aviso de Privacidad
              </Link>
              .
            </p>
          </div>
          <nav
            aria-label="Enlaces legales"
            className="flex flex-wrap items-center gap-x-5 gap-y-1"
          >
            <Link
              href="/privacidad"
              className="enlace-linea text-small text-superficie/60 transition-colors duration-ui hover:text-honey"
            >
              Aviso de privacidad
            </Link>
            <Link
              href="/terminos"
              className="enlace-linea text-small text-superficie/60 transition-colors duration-ui hover:text-honey"
            >
              Términos y condiciones
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
