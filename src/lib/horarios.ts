import type { HorarioDia } from "../data/tipos";

/**
 * Traducción del horario de `data/empresa.ts` a los dos formatos que
 * necesita el sitio: el texto que se ve en el pie y el JSON-LD que lee
 * Google. El dato crudo vive en un solo lugar y aquí solo cambia de forma.
 */

/** Días en el orden de schema.org. */
const DIA_SCHEMA: Record<HorarioDia["dia"], string> = {
  lunes: "Monday",
  martes: "Tuesday",
  miércoles: "Wednesday",
  jueves: "Thursday",
  viernes: "Friday",
  sábado: "Saturday",
  domingo: "Sunday",
};

/** Abreviaturas del pie ("Lun", "Mar", …) en el mismo orden de la semana. */
const ABREVIATURA: Record<HorarioDia["dia"], string> = {
  lunes: "Lun",
  martes: "Mar",
  miércoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sábado: "Sáb",
  domingo: "Dom",
};

/**
 * Quita el cero inicial de una hora `HH:MM` para que el pie diga "9:00"
 * y no "09:00". El JSON-LD conserva el formato completo.
 */
function horaLegible(hora: string): string {
  return hora.replace(/^0/, "");
}

/**
 * Texto del horario para el pie de página.
 *
 * Los días consecutivos con el mismo horario se comprimen en un rango
 * ("Lun a vie 9:00–19:00"). Si todos los días abiertos tienen el mismo
 * horario, se omite el rango ("Lun a dom 9:00–19:00"). Un día cerrado se
 * escribe como tal.
 *
 * Devuelve cadena vacía si no hay días con horario, para que quien pinte
 * decida si oculta el bloque (estado vacío, patrón `patrones-cafeto`).
 */
export function textoHorario(horarios: HorarioDia[]): string {
  const abiertos = horarios.filter((dia) => !dia.cerrado);
  if (abiertos.length === 0) {
    return "";
  }

  // Grupos de días consecutivos con el mismo estado y horas.
  const grupos: { primero: HorarioDia; ultimo: HorarioDia }[] = [];
  for (const dia of horarios) {
    const anterior = grupos[grupos.length - 1];
    if (
      anterior &&
      anterior.primero.abre === dia.abre &&
      anterior.primero.cierra === dia.cierra &&
      anterior.primero.cerrado === dia.cerrado
    ) {
      anterior.ultimo = dia;
    } else {
      grupos.push({ primero: dia, ultimo: dia });
    }
  }

  const partes = grupos.map((grupo) => {
    const desde = ABREVIATURA[grupo.primero.dia];
    const hasta = ABREVIATURA[grupo.ultimo.dia];
    const etiqueta =
      grupo.primero === grupo.ultimo
        ? desde
        : desde === hasta
          ? desde
          : `${desde} a ${hasta}`;
    if (grupo.primero.cerrado) {
      return `${etiqueta} cerrado`;
    }
    return `${etiqueta} ${horaLegible(grupo.primero.abre)}–${horaLegible(
      grupo.primero.cierra
    )}`;
  });

  return partes
    .map((parte, indice) =>
      indice === 0 ? parte.charAt(0).toUpperCase() + parte.slice(1) : parte
    )
    .join(" · ");
}

/**
 * Horario en formato schema.org (`OpeningHoursSpecification`), tal como lo
 * espera el campo `openingHoursSpecification` de LocalBusiness. Los días
 * cerrados se omiten: Google interpreta la ausencia como "cerrado ese día".
 */
export function openingHoursSpec(horarios: HorarioDia[]): Record<string, unknown>[] {
  return horarios
    .filter((dia) => !dia.cerrado)
    .map((dia) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DIA_SCHEMA[dia.dia]}`,
      opens: dia.abre,
      closes: dia.cierra,
    }));
}
