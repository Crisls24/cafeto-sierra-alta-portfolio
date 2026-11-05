import Image from "next/image";
import { Building2, Sprout, Users, type LucideIcon } from "lucide-react";

import { COMPROMISO } from "../data/compromiso";
import { PENDIENTE } from "../data/tipos";
import Revelar from "./Revelar";

/**
 * Compromiso social y origen: el cierre editorial de la página.
 *
 * No pasa por el molde `Seccion` porque su primera pieza es una banda
 * fotográfica a sangre (ancho completo), y el molde impone contenedor y
 * padding que la recortarían. Se monta explícitamente en `page.tsx`, como
 * la portada.
 *
 * Un solo bloque continuo con tres piezas: la banda panorámica sin texto
 * superpuesto, la composición editorial de dos columnas separadas por un
 * filete vertical, y los tres pilares en fila, separados por filetes finos.
 * Nada de rejilla de tarjetas, fondos por bloque, sombras ni cifras: los
 * pilares se leen como texto, no como cajas.
 *
 * Sin foto propia, la banda cae a `color-origen-claro` y la sección se
 * sostiene igual, que es el principio del sistema de diseño.
 */
const ICONOS: Record<string, LucideIcon> = {
  "economia-local": Sprout,
  inclusion: Users,
  empresas: Building2,
};

export default function SeccionCompromiso() {
  const foto = COMPROMISO.foto !== PENDIENTE ? COMPROMISO.foto : null;

  return (
    <section
      id="compromiso"
      aria-labelledby="compromiso-titulo"
      className="border-t border-stone"
    >
      <Revelar>
        {/* 1. Banda panorámica a sangre, sin texto superpuesto ni marco. */}
        <figure className="relative m-0">
          {foto ? (
            <div className="relative h-[190px] w-full overflow-hidden bg-origen-claro sm:h-[260px] lg:h-[360px]">
              <Image
                src={foto}
                alt={COMPROMISO.alt}
                fill
                sizes="100vw"
                className="reveal-foto object-cover object-center"
              />
            </div>
          ) : (
            <div className="h-[190px] w-full bg-origen-claro sm:h-[260px] lg:h-[360px]" />
          )}
        </figure>

        <div className="bg-pagina">
          <div className="mx-auto w-full max-w-sitio px-4 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10 lg:px-12 lg:pt-12 lg:pb-12">
            {/* 2. Dos columnas de anchos distintos: titular a la izquierda,
                texto a la derecha, con un filete vertical de 1 px en medio. */}
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-0">
              <h2
                id="compromiso-titulo"
                className="reveal-texto whitespace-pre-line text-h2 text-coffee lg:col-span-6"
              >
                {COMPROMISO.titulo}
              </h2>

              <div className="lg:col-span-5 lg:col-start-8 lg:border-l lg:border-stone lg:pl-8">
                <p className="reveal-texto desfase-100 prose text-body text-coffee-medio">
                  {COMPROMISO.cuerpo}
                </p>
              </div>
            </div>

            {/* 3. Tres pilares editoriales: icono lineal discreto, título y
                descripción. En móvil se apilan con filetes horizontales. */}
            <div className="mt-8 grid grid-cols-1 border-t border-stone pt-6 sm:mt-10 sm:grid-cols-3 sm:pt-7">
              {COMPROMISO.pilares.map((pilar, indice) => {
                const Icono = ICONOS[pilar.id] ?? Sprout;

                return (
                  <div
                    key={pilar.id}
                    className={`reveal-texto ${indice > 0 ? "mt-6 border-t border-stone pt-6 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0" : ""} sm:px-6 sm:first:pl-0 sm:last:pr-0`}
                  >
                    <Icono
                      aria-hidden="true"
                      strokeWidth={1.6}
                      className="h-5 w-5 text-honey"
                    />
                    <h3 className="mt-2 font-titulos text-h4 text-coffee">
                      {pilar.titulo}
                    </h3>
                    <p className="prose mt-2 text-small leading-6 text-coffee-medio">
                      {pilar.descripcion}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Revelar>
    </section>
  );
}
