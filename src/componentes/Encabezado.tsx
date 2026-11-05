"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const ENLACES = [
  { href: "/#catalogo", etiqueta: "Catálogo" },
  { href: "/#origen", etiqueta: "Origen" },
  { href: "/#soluciones", etiqueta: "Empresas" },
  { href: "/#proceso", etiqueta: "Cómo comprar" },
];

/**
 * El encabezado persistente de la página con estética limpia, isotipo circular
 * y bruma de montaña en el borde inferior.
 */
export default function Encabezado() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  return (
    <header className="header-entrada sticky top-0 z-40 border-b border-stone bg-pagina/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-sitio items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-12">
        {/* Izquierda: Isotipo circular + Nombre en estética minimalista */}
        <Link
          href="/#portada"
          aria-label="Cafeto Sierra Alta, inicio"
          className="flex items-center gap-3 text-coffee no-underline group"
        >
          <Image
            src="/icon.png"
            alt="Isotipo Cafeto Sierra Alta"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-full object-cover shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-titulos text-[1.28rem] leading-none text-coffee group-hover:text-coffee-medio transition-colors duration-ui">
              Cafeto
            </span>
            <span className="mt-0.5 text-[0.58rem] uppercase tracking-[0.22em] text-tinta-suave">
              Sierra Alta
            </span>
          </div>
        </Link>

        {/* Centro / Derecha: Menú de navegación limpio con hover suave */}
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-7 text-label uppercase tracking-[0.12em] md:flex"
        >
          {ENLACES.map(({ href, etiqueta }) => (
            <Link
              key={href}
              href={href}
              className="enlace-linea text-tinta-suave transition-colors duration-ui hover:text-coffee"
            >
              {etiqueta}
            </Link>
          ))}
        </nav>

        {/* Botón de menú hamburguesa móvil */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-stone text-coffee transition-colors hover:border-honey-profundo md:hidden"
          aria-expanded={abierto}
          aria-controls="menu-principal"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setAbierto((valor) => !valor)}
        >
          {abierto ? (
            <X aria-hidden="true" size={20} />
          ) : (
            <Menu aria-hidden="true" size={20} />
          )}
        </button>
      </div>


      {/* Menú desplegable móvil */}
      <div
        id="menu-principal"
        hidden={!abierto}
        className="border-t border-stone bg-pagina md:hidden"
      >
        <nav
          aria-label="Navegación principal móvil"
          className="mx-auto flex w-full max-w-sitio flex-col px-4 py-2 sm:px-8"
        >
          {ENLACES.map(({ href, etiqueta }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setAbierto(false)}
              className="border-b border-stone/60 py-3 text-small font-medium text-coffee no-underline last:border-b-0"
            >
              {etiqueta}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
