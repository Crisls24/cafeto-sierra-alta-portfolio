import Image from "next/image";

import { SITUACIONES } from "../data/soluciones";

export default function SeccionSoluciones() {
  return (
    <div className="mt-0 space-y-4">
      <div className="max-w-3xl pt-1">
        <h3 className="reveal-texto font-titulos text-[2rem] leading-[1.08] text-coffee sm:text-h2">
          Hay momentos en los que los detalles importan más.
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {SITUACIONES.map((situacion) => (
          <article
            key={situacion.id}
            className="group overflow-hidden rounded-sm border border-stone bg-superficie transition-colors duration-ui ease-ui hover:border-honey"
          >
            <div className="reveal-foto relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#f0e4d3_0%,#d7c4a4_100%)]">
              <Image
                src={situacion.foto ?? "/images/taza-cafe.webp"}
                alt={situacion.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-ui ease-ui group-hover:scale-[var(--scale-imagen-suave)]"
              />
            </div>

            <div className="reveal-texto desfase-100 flex flex-col p-5 pt-4 sm:p-6 sm:pt-5">
              <h4 className="mt-1 font-titulos text-h4 leading-snug text-coffee sm:text-h3">
                {situacion.bajada}
              </h4>

              {situacion.descripcion && (
                <p className="mt-3 text-small leading-6 text-coffee-medio">
                  {situacion.descripcion}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}