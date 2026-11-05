import { z } from "zod";

/**
 * Validación de entradas con Zod.
 *
 * Toda entrada del cliente pasa por aquí antes de tocar D1. Los límites de
 * longitud son parte del contrato público: el comentario no puede ser un
 * muro de texto ni una cadena vacía disfrazada de espacios.
 */

/** Normaliza espacios: recorta extremos y colapsa saltos repetidos. */
function limpiarTexto(valor: string): string {
  return valor
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const textoSeguro = (min: number, max: number) =>
  z
    .string()
    .transform(limpiarTexto)
    .pipe(z.string().min(min).max(max));

export const esquemaToken = z.object({
  token: z.string().min(20).max(200),
});

export const esquemaCrearResena = z.object({
  token: z.string().min(20).max(200),
  calificacion: z.coerce.number().int().min(1).max(5),
  comentario: textoSeguro(10, 2000),
  nombrePublico: textoSeguro(2, 60),
  aceptaPublicacion: z.literal(true),
  consentimientoVersion: z.literal("2026-10-30"),
  googleCredential: z.string().min(10).max(8192).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export type EntradaCrearResena = z.infer<typeof esquemaCrearResena>;

const CANALES = [
  "whatsapp",
  "instagram",
  "facebook",
  "presencial",
  "correo",
  "otro",
] as const;

export const esquemaCanal = z.enum(CANALES);
export const esquemaEstadoEntrega = z.enum([
  "por_preparar",
  "listo",
  "entregado",
  "cancelado",
]);
export const esquemaEstadoPago = z.enum(["pendiente", "pagado"]);
export const esquemaEstadoResenaVenta = z.enum([
  "sin_solicitar",
  "activa",
  "pendiente",
  "publicada",
  "rechazada",
  "revocada",
  "expirada",
]);
export const esquemaMoliendaVenta = z.enum(["grano-entero", "molido"]);

function esFechaValida(valor: string): boolean {
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (!anio || !mes || !dia) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

export const esquemaFecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa una fecha AAAA-MM-DD.")
  .refine(esFechaValida, "La fecha no existe.");

// Los campos vacíos, null y booleanos no representan un importe o cantidad.
const enteroDesdeEntrada = (valor: unknown) => typeof valor === "string" && /^\d+$/.test(valor) ? Number(valor) : valor;
const centavos = z.preprocess(enteroDesdeEntrada, z.number()
  .int("El precio debe estar en centavos enteros.")
  .min(0)
  .max(100_000_000));

const cantidad = z.preprocess(enteroDesdeEntrada, z.number().int().min(1).max(10_000));

export const esquemaItemVenta = z
  .object({
    productoId: z.string().min(1).max(64).optional(),
    presentacionId: z.string().min(1).max(64).optional(),
    nombreProducto: textoSeguro(1, 120).optional(),
    nombrePresentacion: textoSeguro(1, 80).optional(),
    molienda: esquemaMoliendaVenta.nullish(),
    cantidad,
    precioUnitarioCentavos: centavos,
    costoUnitarioCentavos: centavos.nullish(),
  })
  .superRefine((item, ctx) => {
    const conCatalogo =
      item.productoId !== undefined || item.presentacionId !== undefined;
    if (conCatalogo && (!item.productoId || !item.presentacionId)) {
      ctx.addIssue({
        code: "custom",
        message: "Producto y presentación deben ir juntos.",
      });
    }
    if (!conCatalogo && (!item.nombreProducto || !item.nombrePresentacion)) {
      ctx.addIssue({
        code: "custom",
        message: "Escribe el producto y su presentación.",
      });
    }
  });

export type EntradaItemVenta = z.infer<typeof esquemaItemVenta>;

/**
 * Pedido nuevo. No incluye datos personales: el esquema no los guarda.
 * `referencia` es una nota interna corta (folio, lote); `canal` debe ser uno
 * de los permitidos por el CHECK de la migración.
 */
export const esquemaCrearPedido = z.object({
  canal: esquemaCanal.default("otro"),
  referencia: textoSeguro(1, 120).optional(),
});

export type EntradaCrearPedido = z.infer<typeof esquemaCrearPedido>;

function validarEnvio(datos: { porPaqueteria?: boolean; envioCentavos?: number }, ctx: z.RefinementCtx) {
  if ((datos.porPaqueteria === true && datos.envioCentavos === undefined) ||
      (datos.envioCentavos !== undefined && datos.porPaqueteria === undefined) ||
      ((datos.envioCentavos ?? 0) > 0 && datos.porPaqueteria !== true)) {
    ctx.addIssue({ code: "custom", path: ["envioCentavos"], message: "Indica si la venta va por paquetería y el importe del envío." });
  }
}

export const esquemaCrearVenta = z
  .object({
    ventaVendedora: z.boolean().optional(),
    porPaqueteria: z.boolean().optional(),
    envioCentavos: centavos.optional(),
    vendidoEn: esquemaFecha,
    canal: esquemaCanal.default("otro"),
    referencia: textoSeguro(1, 120).nullish(),
    estadoEntrega: z
      .enum(["por_preparar", "listo", "entregado"])
      .default("por_preparar"),
    entregadoEn: esquemaFecha.optional(),
    estadoPago: esquemaEstadoPago.default("pendiente"),
    pagadoEn: esquemaFecha.optional(),
    items: z.array(esquemaItemVenta).min(1).max(50),
  })
  .superRefine((venta, ctx) => {
    validarEnvio(venta, ctx);
    if (venta.estadoEntrega !== "entregado" && venta.entregadoEn) {
      ctx.addIssue({
        code: "custom",
        path: ["entregadoEn"],
        message: "Solo una venta entregada puede tener fecha de entrega.",
      });
    }
    if (venta.estadoPago !== "pagado" && venta.pagadoEn) {
      ctx.addIssue({
        code: "custom",
        path: ["pagadoEn"],
        message: "Solo una venta pagada puede tener fecha de pago.",
      });
    }
  });

export type EntradaCrearVenta = z.infer<typeof esquemaCrearVenta>;

export const esquemaActualizarVenta = z
  .object({
    ventaVendedora: z.boolean().optional(),
    porPaqueteria: z.boolean().optional(),
    envioCentavos: centavos.optional(),
    vendidoEn: esquemaFecha.optional(),
    canal: esquemaCanal.optional(),
    referencia: textoSeguro(1, 120).nullable().optional(),
    estadoPago: esquemaEstadoPago.optional(),
    pagadoEn: esquemaFecha.nullable().optional(),
    items: z.array(esquemaItemVenta).min(1).max(50).optional(),
  })
  .superRefine((datos, ctx) => {
    validarEnvio(datos, ctx);
    if (Object.keys(datos).length === 0) {
      ctx.addIssue({ code: "custom", message: "Nada que actualizar." });
    }
    if (datos.pagadoEn !== undefined && datos.estadoPago === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["pagadoEn"],
        message: "Indica también el estado de pago.",
      });
    }
  });

export type EntradaActualizarVenta = z.infer<typeof esquemaActualizarVenta>;

export const esquemaCambiarEntrega = z.object({
  estado: z.enum(["por_preparar", "listo"]),
});

export const esquemaEntregarVenta = z.object({
  entregadoEn: esquemaFecha.nullish(),
});

export const esquemaRegistrarPago = z.object({
  estado: esquemaEstadoPago,
  pagadoEn: esquemaFecha.nullish(),
});

export const esquemaLimiteVentas = z.coerce.number().int().min(1).max(200);

/** Resultado uniforme de un `safeParse`. */
export type ResultadoValidacion<T> =
  | { ok: true; datos: T }
  | { ok: false; mensaje: string };

/** Convierte un `safeParse` de Zod en el resultado uniforme del Worker. */
export function validar<T>(
  esquema: z.ZodType<T>,
  valor: unknown
): ResultadoValidacion<T> {
  const resultado = esquema.safeParse(valor);
  if (!resultado.success) {
    const primer = resultado.error.issues[0];
    return {
      ok: false,
      mensaje: primer?.message ?? "Datos inválidos.",
    };
  }
  return { ok: true, datos: resultado.data };
}
