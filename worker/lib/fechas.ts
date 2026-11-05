const ZONA = "America/Mexico_City";
const MEDIODIA = "T12:00:00-06:00";

export function hoyLocal(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function fechaATimestamp(fecha: string): string {
  return new Date(`${fecha}${MEDIODIA}`).toISOString();
}
