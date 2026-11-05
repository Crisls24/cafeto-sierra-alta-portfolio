import type { EstadoInvitacion, FilaInvitacionAdmin } from "../tipos";

export function estadoInvitacion(
  fila: Pick<FilaInvitacionAdmin, "usada_en" | "revocada_en" | "expira_en">
): EstadoInvitacion {
  if (fila.revocada_en) return "revocada";
  if (fila.usada_en) return "usada";
  if (fila.expira_en <= new Date().toISOString()) return "expirada";
  return "activa";
}
