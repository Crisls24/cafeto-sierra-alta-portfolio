"use client";

import { useState } from "react";
import { CATEGORIAS, ETIQUETAS_MOLIENDA_CAFE, ETIQUETAS_TUESTE_CAFE } from "../data/productos";
import {
  MoliendaCafe,
  PENDIENTE,
  Presentacion,
  Producto,
  TuesteCafe,
} from "../data/tipos";
import { textoCotizacionProducto } from "../lib/whatsapp";
import BandaImagen from "./BandaImagen";
import EnlaceCotizacion from "./EnlaceCotizacion";

type Props = {
  producto: Producto;
};

/**
 * La tarjeta de producto del catálogo: ver, elegir y cotizar.
 *
 * Hay **una sola** tarjeta para las cinco fichas. Antes había tres en paralelo
 * (café, queso, miel) y el catálogo repartía entre ellas con un `if`; el
 * resultado era que el café gastaba media tarjeta en una escala sensorial y un
 * panel de personalización, el queso se quedaba sin nada que configurar y la miel
 * sí parecía una etiqueta comercial. Ahora el molde es el mismo para todos y lo
 * que cambia es qué datos trae cada producto.
 *
 * ## Densidad
 *
 * La altura se baja por la **imagen** y por el **espaciado**, nunca por la
 * tipografía. El título va en Fraunces a 20 px y el texto en 14 px, que es el
 * mínimo que el sistema de diseño considera legible; bajar más rápido de lo que
 * se puede leer convierte un catálogo premium en una versión comprimida de una
 * tienda. Lo que sí se recorta es el aire: la banda de la foto es de 152 px en
 * la retícula de tres columnas; el empaque del café sube a 176-192 px para que
 * la bolsa respire sin dominar la tarjeta. La categoría va sobre la fotografí­a
 * y no como una línea más de texto, y los selectores ocupan una sola fila con
 * la etiqueta a la izquierda.
 *
 * ## Una sola fila por selector
 *
 * La etiqueta va **en la misma línea que los botones**, no encima. Es la
 * diferencia entre dos grupos de 60 px y dos grupos de 30 px, y con la
 * etiqueta a la izquierda la fila todavía dice qué es qué, que es lo que
 * importa para comparar una presentación con una molienda.
 *
 * ## Objetivos táctiles
 *
 * 44 px en móvil, que es el mínimo para el dedo, y 36-40 px en escritorio,
 * donde el puntero no necesita tanto y el alto se nota. Por eso los botones
 * bajan en `sm:` en lugar de fijar un valor único.
 *
 * La altura uniforme la dan el alto fijo de la imagen y el `flex-1` del cuerpo:
 * el pie queda siempre contra el borde inferior aunque un producto tenga menos
 * controles que el de al lado, y en la fila de los tres cafés las tres tienen
 * exactamente los mismos.
 */
export default function TarjetaProducto({ producto }: Props) {
  const [presentacionActiva, setPresentacionActiva] = useState(0);
  const [moliendaActiva, setMoliendaActiva] = useState<MoliendaCafe | null>(null);
  const [tuesteActivo, setTuesteActivo] = useState<TuesteCafe | null>(
    producto.tuestes?.find((tueste) => tueste.id === "medio")?.id ??
      producto.tuestes?.[0]?.id ??
      null
  );

  const presentaciones = producto.presentaciones;
  const moliendas = producto.moliendas ?? [];
  const tuestes = producto.tuestes ?? [];
  const tuesteSeleccionado = tuestes.find((tueste) => tueste.id === tuesteActivo) ?? null;

  const presentacion: Presentacion | null =
    presentaciones[presentacionActiva] ?? presentaciones[0] ?? null;

  const categoria = CATEGORIAS.find((item) => item.valor === producto.categoria)?.etiqueta;

  // El precio visible es el de la presentación seleccionada: la tarjeta cotiza
  // un formato concreto, no "desde" el más barato. Si se elige otra, el precio
  // se actualiza al instante, igual que la foto del empaque.
  const precio =
    presentacion && !presentacion.precioPendiente
      ? `$${presentacion.precio.toLocaleString("es-MX")}`
      : null;

  // Grano entero muestra la fotografía del grano del tueste elegido; molido
  // (o sin selección) muestra la bolsa de la presentación. En el honey la foto
  // de grano todavía es la de su bolsa: vive en los datos, no aquí.
  const esGranoEntero = moliendaActiva === "grano-entero" && Boolean(tuesteSeleccionado?.fotoGrano);
  const fotoActiva = esGranoEntero
    ? tuesteSeleccionado!.fotoGrano
    : (presentacion?.foto ?? (producto.foto !== PENDIENTE ? producto.foto : undefined));
  const varianteImagen: "empaque" | "producto" =
    esGranoEntero || !presentacion?.foto ? "producto" : "empaque";
  const altDetalle = esGranoEntero
    ? `grano tostado ${ETIQUETAS_TUESTE_CAFE[tuesteSeleccionado!.id]}`
    : presentacion
      ? `bolsa de ${presentacion.nombre}`
      : undefined;

  // El botón cotiza un precio concreto o, si el formato todavía no tiene
  // precio decidido, pasa a "Consultar disponibilidad": ofrecer "cotizar" un
  // producto sin precio sería prometer una cifra que no existe.
  const tienePrecio = presentacion !== null && !presentacion.precioPendiente;
  const mensaje = textoCotizacionProducto(producto, {
    presentacion,
    molienda: moliendaActiva,
    tueste: tuesteActivo,
  });

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-sm border border-stone bg-superficie transition-colors hover:border-honey-profundo">
      <BandaImagen
        producto={producto}
        etiqueta={categoria}
        foto={fotoActiva}
        variante={varianteImagen}
        altDetalle={altDetalle}
      />

      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-honey-texto">
              {categoria}
            </p>
            <h3 className="font-titulos text-h4 font-medium leading-tight text-coffee">
              {producto.nombre}
            </h3>
          </div>

          {precio && (
            <div className="shrink-0 rounded-sm border border-honey/30 bg-honey/10 px-2.5 py-1.5 text-right">
              <p className="text-[0.55rem] uppercase tracking-[0.14em] text-tinta-suave">Precio</p>
              <p className="cifras text-[1.05rem] font-semibold leading-none text-coffee">{precio}</p>
            </div>
          )}
        </div>

        {producto.perfil !== PENDIENTE && (
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-coffee-medio">
            {producto.perfil}
          </p>
        )}

        <p className="line-clamp-2 text-small leading-5 text-tinta-suave">
          {producto.descripcionCorta}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1.5 border-t border-stone px-3 py-2.5">
        {presentaciones.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <GrupoOpciones
              titulo="Presentación"
              opciones={presentaciones.map((p, indice) => ({ id: indice, etiqueta: p.nombre }))}
              seleccion={presentacionActiva}
              onSeleccionar={setPresentacionActiva}
            />
            {presentacion?.rendimiento && (
              <p className="text-right text-[0.6rem] leading-4 text-tinta-suave">
                Rinde {presentacion.rendimiento}
              </p>
            )}
          </div>
        )}

        {moliendas.length > 0 && (
          <GrupoOpciones
            titulo="Molienda"
            opciones={moliendas.map((id) => ({ id, etiqueta: ETIQUETAS_MOLIENDA_CAFE[id] }))}
            seleccion={moliendaActiva}
            onSeleccionar={setMoliendaActiva}
          />
        )}

        {tuestes.length > 0 && (
          <GrupoOpciones
            titulo="Tueste"
            opciones={tuestes.map(({ id, nombre }) => ({ id, etiqueta: nombre }))}
            seleccion={tuesteActivo}
            onSeleccionar={setTuesteActivo}
          />
        )}

        <EnlaceCotizacion
          mensaje={mensaje}
          ariaLabel={`Cotizar ${producto.nombre}${tuesteSeleccionado ? `, ${tuesteSeleccionado.nombre.toLowerCase()}` : ""}${presentacion ? ` en presentación de ${presentacion.nombre}` : ""}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-coffee bg-transparent px-4 text-small font-medium text-coffee no-underline transition-colors hover:bg-coffee hover:text-superficie sm:min-h-9"
        >
          {tienePrecio ? "Cotizar esta opción" : "Consultar disponibilidad"}
        </EnlaceCotizacion>
      </div>
    </article>
  );
}

/**
 * Un control de selección: rótulo a la izquierda, botones a la derecha, todo en
 * una fila.
 *
 * El estado vive en la tarjeta y no aquí, porque el resumen que se manda a
 * WhatsApp necesita leerlo desde un solo lugar. Este componente no sabe nada
 * del producto: solo dibuja las opciones que le pasan.
 *
 * Se usa `role="group"` con `aria-label` en lugar de `fieldset`/`legend` porque
 * aquí no hay un formulario: son botones con `aria-pressed` que el lector de
 * pantalla lee como opciones con estado, y meterlos en un `fieldset` los
 * anunciaba como un grupo de formulario que no existe.
 *
 * El botón activo se distingue por relleno, no solo por el borde: en una fila
 * de tres, la única diferencia entre "elegido" y "disponible" tiene que verse
 * de un vistazo.
 */
function GrupoOpciones<T>({
  titulo,
  opciones,
  seleccion,
  onSeleccionar,
}: {
  titulo: string;
  opciones: { id: T; etiqueta: string }[];
  seleccion: T | null;
  onSeleccionar: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={titulo} className="flex items-center justify-between gap-2.5">
      <span
        aria-hidden="true"
        className="shrink-0 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-tinta-suave"
      >
        {titulo}
      </span>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {opciones.map(({ id, etiqueta }) => {
          const activa = seleccion === id;
          return (
            <button
              key={String(id)}
              type="button"
              aria-pressed={activa}
              onClick={() => onSeleccionar(id)}
              className={`min-h-11 rounded-sm border px-2.5 text-[0.7rem] transition-colors sm:min-h-9 ${
                activa
                  ? "border-coffee bg-coffee font-medium text-superficie"
                  : "border-stone bg-transparent text-coffee hover:border-coffee hover:bg-pagina"
              }`}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>
    </div>
  );
}