import Image from "next/image";
import { EMPRESA } from "../data/empresa";
import { Producto, PENDIENTE } from "../data/tipos";

type Props = {
  producto: Producto;
  /**
   * La foto concreta que debe verse: la bolsa de la presentación elegida o el
   * grano del tueste elegido. El componente ya no decide cuál es; el que sabe
   * la selección es `TarjetaProducto`.
   */
  foto?: string;
  /**
   * Cómo se presenta la fotografía.
   *
   * `empaque`: la bolsa completa, con `object-contain`, aire alrededor y la
   * banda más alta para que el formato respire.
   *
   * `producto`: una fotografía de grano que llena el marco con `object-cover`
   * y banda compacta, como la foto principal de la tarjeta.
   */
  variante?: "empaque" | "producto";
  /**
   * Detalle para el texto alternativo: "bolsa de 250 g", "grano tostado medio".
   */
  altDetalle?: string;
  /**
   * Ancla del recorte cuando la fotografía no cabe en el marco.
   *
   * Es un valor CSS de `object-position`, no una clase, para que ajustar una
   * foto sea cambiar una cadena en `data/productos.ts` sin abrir este
   * archivo. Por defecto, el centro.
   */
  encuadre?: string;
  /**
   * Categoría del producto, sobre la imagen.
   *
   * Va aquí y no en el cuerpo del texto por densidad: una línea de 16 px más su
   * separación son 26 px por tarjeta, y en una retícula de escritorio esa franja
   * se nota porque empuja hacia abajo el bloque que el comprador lee. Como
   * etiqueta de empaque sobre la fotografía hace el mismo trabajo y además
   * refuerza que la tarjeta es una etiqueta comercial.
   */
  etiqueta?: string;
};

/**
 * La banda de imagen de una tarjeta: empaque real, grano o sello de origen.
 *
 * La banda va compacta por defecto. El empaque del café crece un poco y se
 * centra con `object-contain` para que la bolsa se vea completa; el grano
 * llena el marco con `object-cover`. Elegir la presentación o el tueste
 * cambia la fotografía sin tocar la altura de la tarjeta.
 *
 * La bolsa real es siempre la protagonista: el catálogo no vuelve a mostrar
 * grano suelto, que ya aparece en el carrusel de origen — salvo cuando el
 * comprador elige "grano entero", que muestra la fotografía del grano.
 *
 * Cuando el producto no tiene foto se muestra el sello de origen: bloque crema
 * con filete fino y la marca en Fraunces itálica, en el mismo alto que la
 * fotografía para que las tarjetas de una fila tengan la misma silueta. El
 * diseño se sostiene sin fotografía, que es lo que pide el principio de que la
 * foto mejora la página pero no la habilita.
 */
export default function BandaImagen({
  producto,
  encuadre = "50% 50%",
  etiqueta,
  foto: fotoProp,
  variante = "producto",
  altDetalle,
}: Props) {
  const esEmpaque = variante === "empaque";
  const alto = esEmpaque
    ? "h-44 sm:h-48"
    : "h-44 sm:h-[168px] lg:h-[152px]";
  const foto = fotoProp ?? (producto.foto !== PENDIENTE ? producto.foto : null);

  const chip = etiqueta ? (
    <span className="absolute top-3 left-3 rounded-sm border border-stone bg-superficie px-2 py-1 text-label uppercase text-coffee">
      {etiqueta}
    </span>
  ) : null;

  if (foto) {
    return (
      <div className={`relative w-full shrink-0 overflow-hidden bg-[#f4f0e8] ${alto}`}>
        <Image
          src={foto}
          alt={`${producto.nombre}${altDetalle ? `, ${altDetalle}` : ""}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          style={{ objectPosition: encuadre }}
          className={
            esEmpaque
              ? "object-contain p-2"
              : "object-cover transition-transform duration-ui ease-ui group-hover:scale-[var(--scale-imagen-suave)]"
          }
        />
        {chip}
      </div>
    );
  }

  return (
    <div className={`relative flex w-full shrink-0 items-center justify-center bg-pagina p-3 ${alto}`}>
      <div className="flex flex-col items-center gap-0.5 border border-stone px-5 py-3 text-center">
        <span className="font-titulos text-h4 italic text-coffee">
          {EMPRESA.marca}
        </span>
        <span className="text-label uppercase text-honey-texto">Edición de Origen</span>
      </div>
      {chip}
    </div>
  );
}