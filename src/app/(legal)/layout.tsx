import Link from "next/link";

import PiePagina from "@/componentes/PiePagina";

/**
 * Grupo de rutas legales (`/privacidad` y `/terminos`).
 *
 * Se mantiene fuera de `(publico)` a propósito: el encabezado de venta navega
 * con anclas de hash (`#catalogo`), que en una subpágina no llevarían a
 * ninguna parte. Aquí basta una barra mínima que devuelve al inicio, y el
 * mismo pie del sitio.
 */
export default function LayoutLegal({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="border-b border-stone bg-pagina">
        <div className="mx-auto flex w-full max-w-sitio items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Cafeto Sierra Alta, inicio"
            className="group flex flex-col no-underline"
          >
            <span className="font-titulos text-[1.28rem] leading-none text-coffee transition-colors duration-ui group-hover:text-coffee-medio">
              Cafeto
            </span>
            <span className="mt-0.5 text-[0.58rem] uppercase tracking-[0.22em] text-tinta-suave">
              Sierra Alta
            </span>
          </Link>

          <Link
            href="/"
            className="enlace-linea text-small font-medium text-honey-texto"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      {children}

      <PiePagina />
    </>
  );
}
