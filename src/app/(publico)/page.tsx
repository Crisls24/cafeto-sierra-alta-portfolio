import Portada from "@/componentes/Portada";
import BarraConfianza from "@/componentes/BarraConfianza";
import BotonFlotante from "@/componentes/BotonFlotante";
import Seccion from "@/componentes/Seccion";
import Catalogo from "@/componentes/Catalogo";
import SeccionOrigenProceso from "@/componentes/SeccionOrigenProceso";
import SeccionProceso from "@/componentes/SeccionProceso";
import SeccionSoluciones from "@/componentes/SeccionSoluciones";
import SeccionResenas from "@/componentes/SeccionResenas";
import SeccionCompromiso from "@/componentes/SeccionCompromiso";
import PiePagina from "@/componentes/PiePagina";
import { Suspense } from "react";
import DatosEstructurados from "@/componentes/DatosEstructurados";
import ExplorarCafe from "@/componentes/ExplorarCafe";

type SeccionData = {
  id: string;
  numero: string;
  etiqueta: string;
  titulo: string;
  mostrarEtiqueta?: boolean;
  compacto?: boolean;
  anchoAmplio?: boolean;
  encabezadoCompacto?: boolean;
  espaciadoReducido?: boolean;
  /** Segunda línea del encabezado, solo donde hace falta. */
  bajada?: string;
};

/**
 * El orden de la página vive aquí y en ningún otro archivo.
 *
 * La 01 y la 02 tienen componente propio porque no son bloques de
 * expediente: son la portada y la franja de confianza. De la 03 en
 * adelante todas pasan por el mismo molde, y el contenido de cada una
 * se decide en `CONTENIDO`.
 *
 * Las secciones con contenido real son las que aparecen en esta página;
 * los huecos sin material se eliminan para no dejar una narrativa truncada.
 */
const SECCIONES: SeccionData[] = [
  {
    id: "soluciones",
    numero: "03",
    etiqueta: "",
    titulo: "",
    mostrarEtiqueta: false,
  },
  {
    id: "origen",
    numero: "04",
    etiqueta: "Altitud y proceso",
    titulo: "",
    mostrarEtiqueta: false,
    encabezadoCompacto: true,
    espaciadoReducido: true,
    anchoAmplio: true,
  },
  {
    id: "catalogo",
    numero: "05",
    etiqueta: "Nuestra Selección",
    titulo: "Nuestra Selección",
    mostrarEtiqueta: false,
    compacto: true,
    anchoAmplio: true,
    bajada:
      "Café, quesos y miel de la sierra para tu organización.",
  },
  { id: "proceso", numero: "06", etiqueta: "", titulo: "", mostrarEtiqueta: false },
  {
    id: "resenas",
    numero: "07",
    etiqueta: "",
    titulo: "",
    mostrarEtiqueta: false,
    anchoAmplio: true,
  },
];

const CONTENIDO: Record<string, React.ReactNode> = {
  // El Suspense es obligatorio: `Catalogo` lee la cadena de consulta para
  // el filtro de categoría y sin él la página no se prerenderiza (RF-05).
  // El panel de preparación del café va dentro de `Catalogo`, no aquí.
  catalogo: (
    <Suspense fallback={<div className="h-64 rounded-sm border border-stone bg-superficie" />}>
      <Catalogo />
    </Suspense>
  ),
  origen: <SeccionOrigenProceso />,
  proceso: <SeccionProceso />,
  soluciones: <SeccionSoluciones />,
  resenas: <SeccionResenas />,
};

export default function Pagina() {
  return (
    <main>

      {/* 01. Portada */}
      <Portada />

      {/* 02. Barra de confianza */}
      <BarraConfianza />

      {/* 03 a 06 */}
      {SECCIONES.map((seccion) => (
        <Seccion key={seccion.id} {...seccion}>
          {CONTENIDO[seccion.id] ? (
            <div className={seccion.espaciadoReducido ? "mt-1" : seccion.compacto ? "mt-1" : "mt-2"}>
              {CONTENIDO[seccion.id]}
            </div>
          ) : null}
        </Seccion>
      ))}

      {/* 08. Compromiso social y origen: cierre editorial antes del pie. */}
      <SeccionCompromiso />

      <ExplorarCafe />
      <DatosEstructurados />

      <PiePagina />

      <BotonFlotante />
    </main>
  );
}
