"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CATEGORIAS, PRODUCTOS } from "../data/productos";
import { CategoriaProducto } from "../data/tipos";
import { mensajeFlotante } from "../lib/whatsapp";
import TarjetaProducto from "./TarjetaProducto";

type Filtro = "todos" | CategoriaProducto;

/**
 * Los filtros se arman con las categorías del archivo de datos, para que
 * agregar una categoría nueva no obligue a tocar este archivo.
 */
const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  ...CATEGORIAS,
];

/**
 * Retícula del catálogo: qué hay, con qué se filtra y las tarjetas.
 *
 * El encabezado editorial de la sección (etiqueta de expediente, título y bajada)
 * no vive aquí: lo pone `Seccion`, igual que en las otras ocho secciones, y
 * duplicarlo dentro del catálogo haría que dos encabezados dejaran de coincidir
 * sin que nadie lo notara.
 *
 * La rejilla es de tres columnas en escritorio a propósito. Los tres cafés caen
 * en la misma fila y se comparan de un vistazo, que es el objetivo de la
 * sección; la miel y los quesos ocupan la segunda. Los `li` llevan `h-full` y
 * la tarjeta también, para que dentro de una fila todas midan lo mismo y los
 * botones de cotizar queden alineados.
 */
export default function Catalogo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const categoriasValidas = CATEGORIAS.map((categoria) => categoria.valor);
  const categoriaURL = searchParams.get("categoria");
  const filtro: Filtro = categoriasValidas.includes(categoriaURL as CategoriaProducto)
    ? (categoriaURL as CategoriaProducto)
    : "todos";

  const setFiltro = (nuevoFiltro: Filtro) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nuevoFiltro === "todos") {
      params.delete("categoria");
    } else {
      params.set("categoria", nuevoFiltro);
    }
    // scroll: false para que el filtro no mueva el resto de la página (RF-05).
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const productosVisibles = PRODUCTOS.filter((producto) => {
    if (!producto.activo) return false;
    if (filtro !== "todos" && producto.categoria !== filtro) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Barra de filtros: una línea divisoria con el contador y las categorías. */}
      <div className="flex flex-col gap-3 border-y border-stone py-2 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-label uppercase text-tinta-suave">
          {productosVisibles.length}{" "}
          {productosVisibles.length === 1 ? "producto" : "productos"}
        </p>

        <div
          role="group"
          aria-label="Filtrar productos por categoría"
          className="flex flex-wrap items-center gap-2"
        >
          {FILTROS.map(({ valor, etiqueta }) => {
            const activo = filtro === valor;
            return (
              <button
                key={valor}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltro(valor)}
                className={`min-h-10 rounded-sm border px-3 text-label font-semibold uppercase transition-colors ${
                  activo
                    ? "border-coffee bg-coffee text-superficie"
                    : "border-stone bg-transparent text-coffee hover:border-honey-profundo hover:bg-pagina"
                }`}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      {productosVisibles.length > 0 ? (
        <ul
          key={filtro}
          className="animate-filtro reveal-texto grid grid-cols-1 gap-5 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3"
        >
          {productosVisibles.map((producto) => (
            <li key={producto.id} className="flex h-full">
              <TarjetaProducto producto={producto} />
            </li>
          ))}
        </ul>
      ) : (
        /* Estado de catálogo vacío: un h3 y una salida. Nunca un hueco. */
        <div
          key={filtro}
          className="animate-filtro reveal-texto rounded-sm border border-stone bg-superficie px-6 py-16 text-center"
        >
          <h3 className="text-h3 text-coffee">
            Todavía no hay productos en esta categoría.
          </h3>
          <p className="prose mx-auto mt-4 text-small text-tinta-suave">
            Estamos preparando esta selección. Si necesitas algo específico para tu organización,
            escríbenos y lo cotizamos.
          </p>
          <p className="mt-4">
            <a href={mensajeFlotante()} target="_blank" rel="noreferrer">
              Solicitar cotización
            </a>
          </p>
        </div>
      )}
    </div>
  );
}