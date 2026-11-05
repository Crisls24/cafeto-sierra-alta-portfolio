
import {
  FileCheck2,
  Truck,
  Sprout,
  Coffee,
  Building2,
  type LucideIcon,
} from "lucide-react";

import { EMPRESA } from "../data/empresa";

const ICONOS: { palabras: string[]; icono: LucideIcon }[] = [
  {
    palabras: ["facturación", "factura"],
    icono: FileCheck2,
  },
  {
    palabras: ["entrega", "entregas"],
    icono: Truck,
  },
  {
    palabras: ["origen", "productora"],
    icono: Sprout,
  },
  {
    palabras: ["café", "quesos", "miel"],
    icono: Coffee,
  },
  {
    palabras: ["mayoreo", "empresas", "escuelas"],
    icono: Building2,
  },
];

function obtenerIcono(afirmacion: string): LucideIcon {
  const texto = afirmacion.toLowerCase();

  return (
    ICONOS.find(({ palabras }) =>
      palabras.some((palabra) => texto.includes(palabra))
    )?.icono ?? Sprout
  );
}

export default function BarraConfianza() {
  if (!EMPRESA.barraConfianza?.length) {
    return null;
  }

  return (
    <aside
      aria-label="Información sobre nuestros servicios"
      className="w-full border-y border-stone/70 bg-superficie"
    >
      <div className="mx-auto max-w-sitio px-6 sm:px-8 xl:px-12">
        <ul className="grid grid-cols-1 divide-y divide-stone/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {EMPRESA.barraConfianza.map((afirmacion, index) => {
            const Icono = obtenerIcono(afirmacion);

            return (
              <li
                key={`${afirmacion}-${index}`}
                className="flex items-center gap-3 py-4 sm:px-4 lg:py-5 xl:px-5"
              >
                <Icono
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="shrink-0 text-honey-profundo"
                />

                <span className="text-small font-medium leading-snug text-coffee">
                  {afirmacion}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}