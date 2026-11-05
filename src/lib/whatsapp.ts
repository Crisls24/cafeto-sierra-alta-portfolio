import { EMPRESA } from "../data/empresa";
import { ETIQUETAS_MOLIENDA_CAFE, ETIQUETAS_TUESTE_CAFE } from "../data/productos";
import {
  MoliendaCafe,
  PENDIENTE,
  Presentacion,
  Producto,
  TuesteCafe,
} from "../data/tipos";

/**
 * Los mensajes de WhatsApp viven en dos capas y con dos prefijos.
 *
 * `texto*()` devuelve **lo que se escribe**, sin más. `mensaje*()` devuelve
 * **la URL** de `wa.me` con ese texto codificado. La separación es para que
 * el texto se pueda leer, revisar, probar y mandar por otro medio ---el
 * formulario, el correo--- sin volver a escribirlo, y para que un
 * componente pueda decidir si lo muestra como enlace o como texto cuando el
 * número todavía no está confirmado.
 *
 * Nota: mientras `EMPRESA.whatsapp` esté en PENDIENTE, `mensaje*()` devuelve
 * `"#"`. Por eso ningún componente usa `mensaje*()` para pintar un control:
 * todos pasan por `EnlaceCotizacion`, que en ese caso no se presenta como
 * pulsable.
 */
function generarEnlaceWhatsApp(texto: string): string {
  if (EMPRESA.whatsapp === PENDIENTE) {
    return "#";
  }
  return `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(texto)}`;
}

/**
 * Generador genérico de enlace, útil para el formulario (F-1)
 */
export function enlaceWhatsApp(texto: string): string {
  return generarEnlaceWhatsApp(texto);
}

/* --- Portada ------------------------------------------------------- */

/** H-1: Botón de la portada: catálogo. */
export function textoCatalogo(): string {
  return `Hola, vi el sitio de ${EMPRESA.marca}. Me interesa el catálogo y los precios de mayoreo.`;
}

/** H-1 como enlace. */
export function mensajeCatalogo(): string {
  return generarEnlaceWhatsApp(textoCatalogo());
}

/* --- Botón flotante -------------------------------------------------- */

/** FL-1: Botón flotante permanente. */
export function textoFlotante(): string {
  return `Hola, vi el sitio de ${EMPRESA.marca}. Quiero información sobre pedidos al mayoreo.`;
}

/** FL-1 como enlace. */
export function mensajeFlotante(): string {
  return generarEnlaceWhatsApp(textoFlotante());
}

/* --- Productos ------------------------------------------------------- */

/** P-*: mensaje para cotizar un producto y su presentación. */
export function textoProducto(producto: Producto, presentacion: Presentacion): string {
  return `Hola. Quiero cotizar ${producto.nombre.toLowerCase()} en presentación de ${presentacion.nombre}.`;
}

/** P-* como enlace. */
export function mensajeProducto(producto: Producto, presentacion: Presentacion): string {
  return generarEnlaceWhatsApp(textoProducto(producto, presentacion));
}

/**
 * Lo que el visitante eligió dentro de la tarjeta, ya confirmado.
 *
 * Los dos campos son opcionales porque la tarjeta solo ofrece lo que la
 * marca confirmó para ese producto: el queso no tiene molienda, y la miel
 * tampoco.
 */
export type SeleccionProducto = {
  presentacion: Presentacion | null;
  molienda: MoliendaCafe | null;
  tueste: TuesteCafe | null;
};

/**
 * P-sel: texto del mensaje de cotización con la selección real del visitante.
 *
 * Es el mensaje que pide la clienta: no un texto genérico con el nombre del
 * producto, sino la combinación exacta que el visitante eligió para cotizar.
 * Cada línea aparece con su etiqueta en el vocabulario del catálogo, nunca con
 * el identificador interno.
 *
 * Una opción que el visitante no eligió **no aparece**: mandar "Molienda: por
 * definir" a una conversación real se lee como un error de quien lo escribió.
 */
export function textoCotizacionProducto(
  producto: Producto,
  seleccion: SeleccionProducto
): string {
  const lineas = [`Hola, me interesa cotizar ${producto.nombre.toLowerCase()}.`];

  if (seleccion.molienda) {
    lineas.push(`Molienda: ${ETIQUETAS_MOLIENDA_CAFE[seleccion.molienda].toLowerCase()}.`);
  }
  if (seleccion.tueste) {
    lineas.push(`Tueste: ${ETIQUETAS_TUESTE_CAFE[seleccion.tueste]}.`);
  }
  if (seleccion.presentacion) {
    lineas.push(`Presentación: ${seleccion.presentacion.nombre}.`);
    if (!seleccion.presentacion.precioPendiente) {
      lineas.push(
        `Precio: $${seleccion.presentacion.precio.toLocaleString("es-MX")} MXN.`
      );
    }
  }

  lineas.push("¿Podrían compartirme disponibilidad y precio?");

  return lineas.join("\n");
}

/** P-sel como enlace. */
export function mensajeCotizacionProducto(
  producto: Producto,
  seleccion: SeleccionProducto
): string {
  return generarEnlaceWhatsApp(textoCotizacionProducto(producto, seleccion));
}