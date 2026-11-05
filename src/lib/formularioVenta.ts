import { CANALES_VENTA, TEXTOS_VENTAS as T, type CanalVenta } from "../data/ventas";
import type { ProductoAdmin, VentaAdmin } from "./ventasAdmin";

export interface LineaVentaForm {
  clave: number;
  productoId: string;
  presentacionId: string;
  cantidad: string;
  precio: string;
  molienda: "grano-entero" | "molido" | "";
}
export interface DatosVentaForm {
  ventaVendedora: boolean;
  porPaqueteria: boolean;
  envio: string;
  fecha: string;
  canal: CanalVenta;
  nota: string;
  entrega: "por_preparar" | "listo" | "entregado";
  pago: "pendiente" | "pagado";
  fechaEntrega: string;
  lineas: LineaVentaForm[];
}

export function hoyVenta(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
export function precioACentavos(valor: string): number | null {
  const texto = valor.trim().replace(/^\$\s*/, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null;
  const [entero, decimal = ""] = texto.split(".");
  const centavos = Number(entero) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) && centavos <= 100_000_000 ? centavos : null;
}
export function precioParaCampo(centavos: number | null): string {
  return centavos === null ? "" : (centavos / 100).toFixed(2);
}
export function lineaVacia(clave: number): LineaVentaForm {
  return { clave, productoId: "", presentacionId: "", cantidad: "1", precio: "", molienda: "" };
}
export function datosInicialesVenta(venta?: VentaAdmin | null): DatosVentaForm {
  return venta ? {
    ventaVendedora: venta.ventaVendedora,
    porPaqueteria: venta.porPaqueteria,
    envio: venta.porPaqueteria ? precioParaCampo(venta.envioCentavos) : "",
    fecha: venta.vendidoEn.slice(0, 10), canal: venta.canal, nota: venta.referencia ?? "",
    entrega: venta.estadoEntrega === "cancelado" ? "por_preparar" : venta.estadoEntrega,
    pago: venta.estadoPago, fechaEntrega: venta.entregadoEn?.slice(0, 10) ?? "",
    lineas: venta.items.map((it, i) => ({ clave: i + 1, productoId: it.productoId ?? "", presentacionId: it.presentacionId ?? "", cantidad: String(it.cantidad), precio: precioParaCampo(it.precioUnitarioCentavos), molienda: it.molienda ?? "" })),
  } : { ventaVendedora: false, porPaqueteria: false, envio: "", fecha: hoyVenta(), canal: "otro", nota: "", entrega: "por_preparar", pago: "pendiente", fechaEntrega: "", lineas: [lineaVacia(1)] };
}
export function seleccionarProducto(linea: LineaVentaForm, producto?: ProductoAdmin): LineaVentaForm {
  return { ...linea, productoId: producto?.id ?? "", presentacionId: "", precio: "", molienda: producto?.categoria === "cafe" ? "grano-entero" : "" };
}
export function alternarVentaVendedora(datos: DatosVentaForm, ventaVendedora: boolean, productos: ProductoAdmin[], original?: VentaAdmin | null): DatosVentaForm {
  return { ...datos, ventaVendedora, lineas: datos.lineas.map((linea) => {
    if (ventaVendedora) return linea;
    const anterior = original && !original.ventaVendedora ? original.items[linea.clave - 1] : undefined;
    const conservaHistorico = anterior?.productoId === linea.productoId && anterior?.presentacionId === linea.presentacionId;
    const formato = productos.find(p => p.id === linea.productoId)?.presentaciones.find(p => p.id === linea.presentacionId);
    return { ...linea, precio: precioParaCampo(conservaHistorico ? anterior!.precioUnitarioCentavos : formato?.precioCentavos ?? null) };
  }) };
}
export function subtotalLinea(linea: LineaVentaForm): number | null {
  const cantidad = Number(linea.cantidad);
  const precio = precioACentavos(linea.precio);
  return precio !== null && /^\d+$/.test(linea.cantidad) && cantidad >= 1 && cantidad <= 10000 ? precio * cantidad : null;
}
function fechaValida(fecha: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(`${fecha}T12:00:00Z`)) && new Date(`${fecha}T12:00:00Z`).toISOString().slice(0, 10) === fecha;
}
export function erroresVenta(datos: DatosVentaForm, productos: ProductoAdmin[], editando: boolean, original?: VentaAdmin | null): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!fechaValida(datos.fecha)) errores.fecha = T.formulario.errorFecha;
  if (!CANALES_VENTA.includes(datos.canal)) errores.canal = T.formulario.errorCanal;
  if (!["por_preparar", "listo", "entregado"].includes(datos.entrega)) errores.entrega = T.formulario.errorEntrega;
  if (!["pendiente", "pagado"].includes(datos.pago)) errores.pago = T.formulario.errorPago;
  if (!editando && datos.entrega === "entregado" && !fechaValida(datos.fechaEntrega)) errores.fechaEntrega = T.formulario.errorFechaEntrega;
  if (datos.nota.length > 120) errores.nota = T.formulario.errorNota;
  if (datos.porPaqueteria && precioACentavos(datos.envio) === null) errores.envio = T.formulario.errorEnvio;
  if (!datos.lineas.length) errores.lineas = T.formulario.errorLineas;
  else if (datos.lineas.length > 50) errores.lineas = T.formulario.errorMaximoLineas;
  for (const linea of datos.lineas) {
    const producto = productos.find((p) => p.id === linea.productoId && p.activo);
    if (!producto) errores[`producto-${linea.clave}`] = linea.productoId ? T.formulario.errorProductoNoDisponible : T.formulario.errorElegirProducto;
    if (!producto?.presentaciones.some((p) => p.id === linea.presentacionId && p.activo)) errores[`formato-${linea.clave}`] = linea.presentacionId ? T.formulario.errorProducto : T.formulario.errorElegirPresentacion;
    if (!/^\d+$/.test(linea.cantidad) || Number(linea.cantidad) < 1 || Number(linea.cantidad) > 10000) errores[`cantidad-${linea.clave}`] = T.formulario.errorCantidad;
    if (precioACentavos(linea.precio) === null) errores[`precio-${linea.clave}`] = T.formulario.errorPrecio;
    if (!datos.ventaVendedora && producto) {
      const formato = producto.presentaciones.find(p => p.id === linea.presentacionId && p.activo);
      const precio = precioACentavos(linea.precio);
      const historico = original && !original.ventaVendedora && original.items.some(i => i.productoId === linea.productoId && i.presentacionId === linea.presentacionId && i.precioUnitarioCentavos === precio && precio !== null);
      if (formato && !historico) {
        if (formato.precioCentavos === null) errores[`precio-${linea.clave}`] = T.formulario.errorPrecioPendiente;
        else if (precio !== formato.precioCentavos) errores[`precio-${linea.clave}`] = T.formulario.errorPrecioCatalogo;
      }
    }
    if (producto?.categoria === "cafe" && linea.molienda !== "grano-entero" && linea.molienda !== "molido") errores[`molienda-${linea.clave}`] = T.formulario.errorMolienda;
  }
  return errores;
}
/** Solo se llama después de validar; nunca reemplaza entradas inválidas con cero. */
export function cuerpoVenta(datos: DatosVentaForm, productos: ProductoAdmin[], editando: boolean, original?: VentaAdmin | null) {
  if (Object.keys(erroresVenta(datos, productos, editando, original)).length) throw new Error(T.formulario.errorResumen);
  return {
    ventaVendedora: datos.ventaVendedora,
    porPaqueteria: datos.porPaqueteria,
    envioCentavos: datos.porPaqueteria ? precioACentavos(datos.envio)! : 0,
    vendidoEn: datos.fecha, canal: datos.canal, referencia: datos.nota.trim() || null,
    estadoPago: datos.pago,
    ...(!editando ? { estadoEntrega: datos.entrega, ...(datos.entrega === "entregado" ? { entregadoEn: datos.fechaEntrega } : {}) } : {}),
    items: datos.lineas.map((l) => ({ productoId: l.productoId, presentacionId: l.presentacionId, cantidad: Number(l.cantidad), precioUnitarioCentavos: precioACentavos(l.precio)!, ...(productos.find((p) => p.id === l.productoId)?.categoria === "cafe" ? { molienda: l.molienda } : {}) })),
  };
}
