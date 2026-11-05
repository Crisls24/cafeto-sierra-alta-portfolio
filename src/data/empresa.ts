import { ConfigEmpresa, PENDIENTE } from "./tipos";

export const EMPRESA: ConfigEmpresa = {
  marca: "Cafeto Sierra Alta",
  telefono: PENDIENTE,
  whatsapp: PENDIENTE,
  correoNegocios: "demo@example.com",
  razonSocial: "Negocio de demostración",
  rfc: "NO APLICA EN LA DEMOSTRACIÓN",
  domicilioLegal: "Domicilio ficticio; versión de portafolio",
  ubicacion: "Pachuca de Soto, Hidalgo, C.P. 42083",
  direccion: {
    ciudad: "Pachuca de Soto",
    estado: "Hidalgo",
    cp: "42083",
    pais: "MX",
  },
  horarios: [
    { dia: "lunes", abre: "09:00", cierra: "19:00" },
    { dia: "martes", abre: "09:00", cierra: "19:00" },
    { dia: "miércoles", abre: "09:00", cierra: "19:00" },
    { dia: "jueves", abre: "09:00", cierra: "19:00" },
    { dia: "viernes", abre: "09:00", cierra: "19:00" },
    { dia: "sábado", abre: "09:00", cierra: "14:00" },
    { dia: "domingo", abre: "", cierra: "", cerrado: true },
  ],
  pedidoMinimo: PENDIENTE,
  zonas: [
    {
      nombre: "Zona Metropolitana",
      tipo: "ruta propia",
      texto: "Entregas los martes y viernes.",
      confirmada: false,
    },
  ],
  barraConfianza: [
    "Facturación electrónica disponible",
    "Entrega programada en Zona Metropolitana",
    "Origen directo",
    "Mayoreo para empresas y escuelas",
  ],
};

// Validación en tiempo de compilación y ejecución
if (EMPRESA.whatsapp !== PENDIENTE && !/^\d{10,15}$/.test(EMPRESA.whatsapp)) {
  throw new Error("El número de WhatsApp debe tener formato internacional (solo dígitos), por ejemplo: 525512345678");
}
if (EMPRESA.telefono !== PENDIENTE && !/^\d{10,15}$/.test(EMPRESA.telefono)) {
  throw new Error("El número de teléfono debe tener formato internacional (solo dígitos).");
}

// Horario: si existe, cada día abierto necesita `abre` y `cierra` en
// formato `HH:MM` (24 h). Un día marcado como cerrado no lleva horas.
if (EMPRESA.horarios !== PENDIENTE) {
  if (EMPRESA.horarios.length !== 7) {
    throw new Error("El horario debe tener los 7 días de la semana, uno por día.");
  }
  for (const dia of EMPRESA.horarios) {
    const formato = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (dia.cerrado) {
      if (dia.abre || dia.cierra) {
        throw new Error(`El día "${dia.dia}" está cerrado pero tiene horas definidas.`);
      }
    } else if (!formato.test(dia.abre) || !formato.test(dia.cierra)) {
      throw new Error(
        `El día "${dia.dia}" necesita \`abre\` y \`cierra\` en formato HH:MM, por ejemplo "09:00".`
      );
    }
  }
}
