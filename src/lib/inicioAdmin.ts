import { TEXTOS_INICIO } from "../data/inicioAdmin";
export function periodoInicio(periodo: string, ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  const hoy = `${valor("year")}-${valor("month")}-${valor("day")}`;
  const dia = new Date(`${hoy}T12:00:00Z`);
  if (periodo === "semana") {
    dia.setUTCDate(dia.getUTCDate() - 6);
    return { desde: dia.toISOString().slice(0, 10), hasta: hoy };
  }
  if (periodo === "anterior") {
    dia.setUTCDate(0);
    const hasta = dia.toISOString().slice(0, 10);
    return { desde: `${hasta.slice(0, 7)}-01`, hasta };
  }
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}
export function saludoInicio() {
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return TEXTOS_INICIO.saludos[hora < 12 ? 0 : hora < 19 ? 1 : 2];
}
