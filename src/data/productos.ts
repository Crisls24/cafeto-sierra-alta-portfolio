import {
  CategoriaProducto,
  MoliendaCafe,
  Presentacion,
  Producto,
  PENDIENTE,
  TuesteCafe,
} from "./tipos";

/**
 * Catálogo de la sección 03.
 *
 * Este archivo es **dato puro**: TypeScript y JavaScript sin nada del sistema
 * de archivos ni de Node. La razón es concreta, no de estilo: lo importan
 * `Catalogo` y `TarjetaProducto`, que son componentes cliente, así que todo lo
 * que esté aquí se compila también para el navegador. Un `require("fs")` aunque
 * esté detrás de una comprobación de `window` es exactamente el caso que
 * Next.js 16 documenta como ruptura (`Module not found: Can't resolve 'fs'`),
 * y dependería de que el optimizador elimine esa rama.
 *
 * Lo que sí necesita tocar el disco vive en `src/lib/validarDatos.server.ts`,
 * que es el único lugar del proyecto autorizado para leer `public/`.
 *
 * El café entra por sus tres procesos: lavado, honey y natural. Cada uno es
 * un producto aparte porque se cotizan por separado y porque su perfil de
 * sabor es distinto. Esos tres ocupan la primera fila de la retícula de tres
 * columnas, que es justo lo que permite compararlos de un vistazo.
 *
 * Cada producto tiene lo mínimo para que un comprador decida y cotize:
 * nombre, categoría, perfil de sabor, descripción corta, foto, formatos y
 * precio. Nada más. La ficha sensorial de acidez/dulzor/cuerpo y los textos de
 * fermentación se fueron con el rediseño de la tarjeta: eran carga educativa
 * en una sección que tiene que funcionar como un catálogo.
 *
 * `presentaciones` puede venir vacío a propósito: un producto que todavía no
 * tiene formato declarado no inventa una fila "Por confirmar", sino que la
 * tarjeta lo muestra sin selector de presentación.
 */

export const CATEGORIAS: { valor: CategoriaProducto; etiqueta: string }[] = [
  { valor: "cafe", etiqueta: "Café" },
  { valor: "queso", etiqueta: "Quesos" },
  { valor: "miel", etiqueta: "Miel" },
];

/**
 * Cómo se escribe una molienda en la tarjeta.
 *
 * Solo dos, porque el catálogo ofrece un formato y no una técnica: entero o
 * molido. Los cuatro niveles de la guía de preparación (`NivelMolienda` en
 * `tipos.ts`) son recomendaciones por método de extracción y no se pledizan.
 */
export const ETIQUETAS_MOLIENDA_CAFE: Record<MoliendaCafe, string> = {
  "grano-entero": "Grano entero",
  molido: "Molido",
};

/**
 * Cómo se escribe un tueste en el mensaje de cotización y en el texto
 * alternativo de la fotografía del grano.
 *
 * Los tres cafés ofrecen los mismos tres niveles y el precio no cambia entre
 * ellos: el tueste es una decisión de sabor, no de formato, y por eso no vive
 * en `Presentacion`.
 */
export const ETIQUETAS_TUESTE_CAFE: Record<TuesteCafe, string> = {
  claro: "claro",
  medio: "medio",
  oscuro: "oscuro",
};

const PRESENTACIONES_CAFE: Presentacion[] = [
  {
    nombre: "250 g",
    precio: 100,
    precioPendiente: false,
    orden: 1,
    foto: "/images/bolsa-cafe-250g.webp",
    rendimiento: "22 a 25 tazas",
  },
  {
    nombre: "500 g",
    precio: 190,
    precioPendiente: false,
    orden: 2,
    foto: "/images/bolsa-cafe-500g.webp",
    rendimiento: "44 a 50 tazas",
  },
  {
    nombre: "1 kg",
    precio: 360,
    precioPendiente: false,
    orden: 3,
    foto: "/images/bolsa-cafe-1kg.webp",
    rendimiento: "90 a 100 tazas",
  },
];

export const PRODUCTOS: Producto[] = [
  {
    id: "cafe-lavado",
    nombre: "Café de altura lavado",
    categoria: "cafe",
    descripcionCorta:
      "Limpio, brillante y delicado. Notas cítricas y florales que dejan ver el carácter de la sierra.",
    perfil: "Cítrico, floral y limpio",
    foto: "/images/cafe-lavado.webp",
    orden: 1,
    activo: true,
    moliendas: ["grano-entero", "molido"],
    presentaciones: PRESENTACIONES_CAFE,
    // Cada nivel de tueste tiene ya su fotografía de grano.
    tuestes: [
      { id: "claro", nombre: "Tueste claro", fotoGrano: "/images/grano-lavado-claro.webp" },
      { id: "medio", nombre: "Tueste medio", fotoGrano: "/images/grano-cafe-lavado-medio.webp" },
      { id: "oscuro", nombre: "Tueste oscuro", fotoGrano: "/images/grano-lavado-oscuro.webp" },
    ],
  },
  {
    id: "cafe-honey",
    nombre: "Café de altura honey",
    categoria: "cafe",
    descripcionCorta:
      "Dulce y redondo. Notas de caramelo y fruta madura en un cuerpo más presente que el lavado.",
    perfil: "Caramelo y fruta madura",
    foto: "/images/cafe-honey.webp",
    orden: 2,
    activo: true,
    moliendas: ["grano-entero", "molido"],
    presentaciones: PRESENTACIONES_CAFE,
    // El honey todavía no tiene fotografía por nivel de tostado: las tres variantes
    // comparten la universal que entregó la marca, para que ninguna ruta quede
    // rota mientras llegan los negativos individuales.
    tuestes: [
      { id: "claro", nombre: "Tueste claro", fotoGrano: "/images/grano-honey-universal.webp" },
      { id: "medio", nombre: "Tueste medio", fotoGrano: "/images/grano-honey-universal.webp" },
      { id: "oscuro", nombre: "Tueste oscuro", fotoGrano: "/images/grano-honey-universal.webp" },
    ],
  },
  {
    id: "cafe-natural",
    nombre: "Café de altura natural",
    categoria: "cafe",
    descripcionCorta:
      "Intenso y afrutado. El de mayor cuerpo de los tres, con notas de frutos rojos y un final largo.",
    perfil: "Frutos rojos y final largo",
    foto: "/images/cafe-natural.webp",
    orden: 3,
    activo: true,
    moliendas: ["grano-entero", "molido"],
    presentaciones: PRESENTACIONES_CAFE,
    // Cada nivel de tueste tiene ya su fotografía de grano.
    tuestes: [
      {
        id: "claro",
        nombre: "Tueste claro",
        fotoGrano: "/images/grano-cafe-natural-claro.webp",
      },
      {
        id: "medio",
        nombre: "Tueste medio",
        fotoGrano: "/images/grano-cafe-natural-medio.webp",
      },
      {
        id: "oscuro",
        nombre: "Tueste oscuro",
        fotoGrano: "/images/grano-cafe-natural-oscuro.webp",
      },
    ],
  },
  {
    id: "miel-multiflora",
    nombre: "Miel pura multiflora",
    categoria: "miel",
    descripcionCorta: "Miel de abeja 100% natural, sin procesar ni calentar.",
    perfil: "Cosecha de primavera",
    foto: PENDIENTE,
    orden: 4,
    activo: true,
    presentaciones: [
      { nombre: "Litro", precio: 0, precioPendiente: true, orden: 1 },
      { nombre: "Cubeta 19L", precio: 0, precioPendiente: true, orden: 2 },
    ],
  },
  {
    id: "quesos-artesanales",
    nombre: "Quesos artesanales",
    categoria: "queso",
    descripcionCorta: "Selección de quesos artesanales de la sierra.",
    perfil: PENDIENTE,
    foto: PENDIENTE,
    orden: 5,
    activo: true,
    presentaciones: [],
  },
];

/**
 * Validaciones que corren al importar el archivo, en cliente y en servidor.
 *
 * Solo datos: nada de disco, de red ni de `window`. Un error de datos tiene
 * que ser un fallo de compilación o una excepción en el primer render, nunca
 * un hueco en pantalla (D-05).
 *
 * La comprobación de que la foto existe en `public/` no va aquí por lo que
 * se explica arriba; vive en `src/lib/validarDatos.server.ts`.
 */
export function validarProductosPuros(productos: Producto[]): true {
  const ids = new Set<string>();

  for (const p of productos) {
    // 1. Ningún producto puede tener el mismo id que otro.
    if (ids.has(p.id)) {
      throw new Error(`Error en productos: ID duplicado '${p.id}'.`);
    }
    ids.add(p.id);

    // 2. Toda molienda declarada tiene que existir en el vocabulario. Una
    //    mal escrita no se ve en pantalla: el control simplemente no la dibuja
    //    y el visitante cree que el café no se vende molido.
    for (const molienda of p.moliendas ?? []) {
      if (!ETIQUETAS_MOLIENDA_CAFE[molienda]) {
        throw new Error(`Error en productos: Molienda desconocida '${molienda}' en '${p.id}'.`);
      }
    }

    // 3. Un formato sin precio se declara pendiente. Un precio de 0 sin
    //    marcarlo pendiente se mostraría como "gratis" en la tarjeta.
    for (const presentacion of p.presentaciones) {
      if (presentacion.precioPendiente && presentacion.precio !== 0) {
        throw new Error(
          `Error en productos: La presentación '${presentacion.nombre}' de '${p.id}' está marcada como precioPendiente pero tiene precio.`
        );
      }
    }
  }

  // 4. Ninguna foto se repite entre cafés. Tres tarjetas con la misma imagen
  //    se leen como una sola, y comparar las tres variedades de un vistazo es
  //    justamente el objetivo de la sección. Valida solo el café: la miel y
  //    los quesos comparten fotografía a propósito.
  const fotosCafe = productos
    .filter((p) => p.categoria === "cafe" && p.foto !== PENDIENTE)
    .map((p) => p.foto);
  const repetidas = fotosCafe.filter((foto, i) => fotosCafe.indexOf(foto) !== i);
  if (repetidas.length > 0) {
    throw new Error(
      `Error en productos: La foto '${repetidas[0]}' está repetida en varios cafés. Cada variedad necesita la suya.`
    );
  }

  return true;
}

validarProductosPuros(PRODUCTOS);